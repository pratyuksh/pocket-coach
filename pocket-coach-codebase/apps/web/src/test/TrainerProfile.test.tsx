import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { TrainerProfile } from '../features/trainers/TrainerProfile';
import i18n from '../i18n';
import { addDays } from './helpers/dates';

// ---------------------------------------------------------------------------------------------
// A small chainable stand-in for the Supabase query builder: filters are recorded, awaiting it
// resolves to the configured rows of that table.
// ---------------------------------------------------------------------------------------------
const db = vi.hoisted(() => ({
  profile: null as unknown,
  roles: [] as { role: string }[],
  upcoming: [] as unknown[],
  log: [] as unknown[],
  tables: [] as string[],
  mutations: [] as { table: string; kind: string; data?: unknown; filter?: unknown }[],
  rpc: vi.fn(),
}));

vi.mock('../lib/supabase', () => {
  const builder = (table: string) => {
    db.tables.push(table);
    let kind: 'read' | 'update' | 'delete' = 'read';
    let data: unknown;
    const b: Record<string, unknown> = {};
    const result = () => {
      if (kind !== 'read') return { error: null };
      if (table === 'user_roles') return { data: db.roles, error: null };
      if (table === 'session_assignments') return { data: db.upcoming, error: null };
      if (table === 'session_log') return { data: db.log, error: null };
      if (table === 'locations') return { data: LOCATIONS, error: null };
      return { data: [], error: null };
    };
    Object.assign(b, {
      select: () => b,
      order: () => b,
      not: () => b,
      gte: () => b,
      eq: (col: string, val: unknown) => {
        if (kind !== 'read') db.mutations.push({ table, kind, data, filter: [col, val] });
        return b;
      },
      maybeSingle: () => Promise.resolve({ data: db.profile, error: null }),
      update: (d: unknown) => ((kind = 'update'), (data = d), b),
      delete: () => ((kind = 'delete'), b),
      then: (resolve: (v: unknown) => unknown) => Promise.resolve(result()).then(resolve),
    });
    return b;
  };
  return { supabase: { from: builder, rpc: (...args: unknown[]) => db.rpc(...args) } };
});

const LOCATIONS = [
  { id: 'hall-1', name: 'Sporthalle Borrweg', is_active: true },
  { id: 'hall-2', name: 'Schulhaus Apfelbaum', is_active: true },
];

const mockUseAuth = vi.hoisted(() => vi.fn());
const mockPermissions = vi.hoisted(() => ({
  isSuperAdmin: false,
  isHeadTrainer: false,
  canManageRoles: false,
  canRemoveTrainers: false,
}));

vi.mock('../hooks/useAuth', () => ({ useAuth: () => mockUseAuth() }));
vi.mock('../hooks/usePermissions', () => ({ usePermissions: () => mockPermissions }));
vi.mock('../features/seasons/hooks/useActiveSeason', () => ({
  useActiveSeason: () => ({
    season: { id: 'season-1', name: 'Season 2026/27' },
    slots: [],
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

const person = {
  id: 'person-1',
  display_name: 'Lena Brunner',
  email: 'lena@club.de',
  specialty: 'Season planning',
  is_junior_coach: true,
  is_active: true,
};

const STATS_ROW = {
  profile_id: 'person-1',
  as_trainer: 5,
  as_assistant: 2,
  as_junior: 3,
  completed: 10,
  upcoming: 4,
  as_substitute: 1,
};

const logRow = (n: number, extra: Record<string, unknown> = {}) => ({
  assignment_id: `a-${n}`,
  profile_id: 'person-1',
  session_date: addDays(-n),
  start_time: '17:30:00',
  location_id: n % 2 ? 'hall-1' : 'hall-2',
  track: 'regular',
  session_role: 'primary',
  is_substitute: false,
  ...extra,
});

const renderProfile = (id = 'person-1') => {
  const router = createMemoryRouter(
    [
      { path: '/trainers/:profileId', element: <TrainerProfile /> },
      { path: '/trainers', element: <p>team list</p> },
    ],
    { initialEntries: [`/trainers/${id}`] },
  );
  render(<RouterProvider router={router} />);
  return router;
};

const signInAs = (id: string, perms: Partial<typeof mockPermissions> = {}) => {
  Object.assign(mockPermissions, {
    isSuperAdmin: false,
    isHeadTrainer: false,
    canManageRoles: false,
    canRemoveTrainers: false,
    ...perms,
  });
  mockUseAuth.mockReturnValue({ user: { id }, roles: [], profile: { id } });
};

describe('TrainerProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.tables.length = 0;
    db.mutations.length = 0;
    db.profile = person;
    db.roles = [{ role: 'trainer' }, { role: 'head_trainer' }];
    db.upcoming = [
      {
        id: 'u-2',
        session: {
          session_date: addDays(5),
          start_time: '17:30:00',
          end_time: '19:00:00',
          location_id: 'hall-2',
        },
      },
      {
        id: 'u-1',
        session: {
          session_date: addDays(2),
          start_time: '18:15:00',
          end_time: '19:45:00',
          location_id: 'hall-1',
        },
      },
      // already ended today: must not be listed as upcoming
      {
        id: 'u-0',
        session: {
          session_date: addDays(0),
          start_time: '00:00:00',
          end_time: '00:01:00',
          location_id: 'hall-1',
        },
      },
    ];
    db.log = [
      logRow(1),
      logRow(2, { session_role: 'assistant_coach' }),
      logRow(3, { track: 'junior_coach' }),
      logRow(4, { is_substitute: true }),
    ];
    db.rpc.mockResolvedValue({ data: [STATS_ROW], error: null });
    signInAs('head-1', { isHeadTrainer: true });
  });

  describe('as a Head-trainer', () => {
    it('shows the person, tags, details and the counts of the season', async () => {
      renderProfile();

      expect(await screen.findByText('Lena Brunner')).toBeInTheDocument();
      expect(screen.getByText('LB')).toBeInTheDocument();
      expect(screen.getByText('Head trainer')).toBeInTheDocument();
      expect(screen.getByText('14/18 coach', { selector: 'span' })).toBeInTheDocument();
      expect(screen.getByText('Season planning')).toBeInTheDocument();
      expect(screen.getByText('lena@club.de')).toBeInTheDocument();

      expect(screen.getByText('Completed sessions · Season 2026/27')).toBeInTheDocument();
      await waitFor(() =>
        expect(db.rpc).toHaveBeenCalledWith('team_session_stats', {
          p_season_id: 'season-1',
          p_profile_id: 'person-1',
        }),
      );
      const tile = (label: string) =>
        screen.getByText(label, { selector: 'dt' }).parentElement!.querySelector('dd')!.textContent;
      await waitFor(() => expect(tile('Completed')).toBe('10'));
      expect(tile('Trainer')).toBe('5');
      expect(tile('Assistant coach')).toBe('2');
      expect(tile('14/18 coach')).toBe('3');
      expect(tile('Upcoming')).toBe('4');
    });

    it('lists the next sessions in date order, without those that already ended', async () => {
      renderProfile();
      await screen.findByText('Lena Brunner');

      const section = screen.getByRole('heading', { name: 'Upcoming' }).closest('section')!;
      const rows = await within(section).findAllByRole('listitem');
      expect(rows).toHaveLength(2);
      expect(within(rows[0]).getByText('Sporthalle Borrweg')).toBeInTheDocument();
      expect(within(rows[0]).getByText('18:15')).toBeInTheDocument();
      expect(within(rows[1]).getByText('Schulhaus Apfelbaum')).toBeInTheDocument();
    });

    it('shows the session log, newest first, with role and substitute tags', async () => {
      renderProfile();
      await screen.findByText('Lena Brunner');

      const section = screen.getByRole('heading', { name: 'Session log' }).closest('section')!;
      const rows = await within(section).findAllByRole('listitem');
      expect(within(section).getByText('4 completed')).toBeInTheDocument();
      expect(rows).toHaveLength(4);
      // numbered from the oldest: the newest entry carries the highest number
      expect(within(rows[0]).getByLabelText('No. 4')).toBeInTheDocument();
      expect(within(rows[0]).getByText('Trainer')).toBeInTheDocument();
      expect(within(rows[1]).getByText('Assistant coach')).toBeInTheDocument();
      expect(within(rows[2]).getByText('14/18 coach')).toBeInTheDocument();
      expect(within(rows[3]).getByText('Substitute')).toBeInTheDocument();
      expect(within(section).queryByRole('button', { name: /show all/i })).not.toBeInTheDocument();
    });

    it('shows eight log entries and expands on request', async () => {
      const user = userEvent.setup({ delay: null });
      db.log = Array.from({ length: 11 }, (_, i) => logRow(i + 1));
      renderProfile();
      await screen.findByText('Lena Brunner');

      const section = screen.getByRole('heading', { name: 'Session log' }).closest('section')!;
      await waitFor(() => expect(within(section).getAllByRole('listitem')).toHaveLength(8));
      await user.click(within(section).getByRole('button', { name: 'Show all 11' }));
      expect(within(section).getAllByRole('listitem')).toHaveLength(11);
      await user.click(within(section).getByRole('button', { name: 'Show fewer' }));
      expect(within(section).getAllByRole('listitem')).toHaveLength(8);
    });

    it('says so when there is nothing yet', async () => {
      db.upcoming = [];
      db.log = [];
      db.rpc.mockResolvedValue({ data: [], error: null });
      renderProfile();

      expect(await screen.findByText('Nothing assigned yet.')).toBeInTheDocument();
      expect(screen.getByText('No completed sessions yet.')).toBeInTheDocument();
      expect(
        screen.getByText('Completed', { selector: 'dt' }).nextElementSibling,
      ).toHaveTextContent('0');
    });

    it('goes back to the team', async () => {
      const user = userEvent.setup({ delay: null });
      const router = renderProfile();
      await screen.findByText('Lena Brunner');

      await user.click(screen.getByRole('link', { name: '← Back' }));
      expect(router.state.location.pathname).toBe('/trainers');
    });

    it('does not offer roles or removal to a Head-trainer who is not a Super-admin', async () => {
      renderProfile();
      await screen.findByText('Lena Brunner');

      expect(screen.queryByRole('button', { name: 'Edit roles' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Deactivate account' })).not.toBeInTheDocument();
    });

    it('hides the speciality for someone without an elevated role', async () => {
      db.roles = [{ role: 'trainer' }];
      renderProfile();
      await screen.findByText('Lena Brunner');

      expect(screen.queryByText('Responsibility / speciality')).not.toBeInTheDocument();
      expect(screen.queryByText('Season planning')).not.toBeInTheDocument();
    });
  });

  describe('as a Super-admin', () => {
    beforeEach(() =>
      signInAs('admin-1', {
        isHeadTrainer: true,
        isSuperAdmin: true,
        canManageRoles: true,
        canRemoveTrainers: true,
      }),
    );

    it('opens the roles dialog', async () => {
      const user = userEvent.setup({ delay: null });
      renderProfile();
      await screen.findByText('Lena Brunner');

      await user.click(screen.getByRole('button', { name: 'Edit roles' }));
      expect(
        await screen.findByRole('dialog', { name: 'Roles · Lena Brunner' }),
      ).toBeInTheDocument();
    });

    it('asks first, then deactivates the account and returns to the list', async () => {
      const user = userEvent.setup({ delay: null });
      const router = renderProfile();
      await screen.findByText('Lena Brunner');

      await user.click(screen.getByRole('button', { name: 'Deactivate account' }));
      const dialog = screen.getByRole('dialog', { name: 'Deactivate account' });
      expect(
        within(dialog).getByText(/Deactivate the account of Lena Brunner/),
      ).toBeInTheDocument();
      expect(db.mutations).toHaveLength(0);

      await user.click(within(dialog).getByRole('button', { name: 'Deactivate' }));

      await waitFor(() => expect(router.state.location.pathname).toBe('/trainers'));
      expect(db.mutations).toEqual([
        {
          table: 'user_roles',
          kind: 'delete',
          data: undefined,
          filter: ['profile_id', 'person-1'],
        },
        {
          table: 'profiles',
          kind: 'update',
          data: { is_active: false },
          filter: ['id', 'person-1'],
        },
      ]);
    });

    it('can be cancelled without changing anything', async () => {
      const user = userEvent.setup({ delay: null });
      renderProfile();
      await screen.findByText('Lena Brunner');

      await user.click(screen.getByRole('button', { name: 'Deactivate account' }));
      await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(db.mutations).toHaveLength(0);
    });

    it('cannot deactivate themselves', async () => {
      db.profile = { ...person, id: 'admin-1', display_name: 'Super Admin' };
      renderProfile('admin-1');
      await screen.findByText('Super Admin');

      expect(screen.getByRole('button', { name: 'Edit roles' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Deactivate account' })).not.toBeInTheDocument();
    });
  });

  describe('as a trainer', () => {
    it('sees their own counts and log', async () => {
      signInAs('person-1');
      renderProfile();
      await screen.findByText('Lena Brunner');

      await waitFor(() =>
        expect(db.rpc).toHaveBeenCalledWith('team_session_stats', {
          p_season_id: 'season-1',
          p_profile_id: 'person-1',
        }),
      );
      expect(await screen.findByRole('heading', { name: 'Session log' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Edit roles' })).not.toBeInTheDocument();
    });

    it("sees someone else's upcoming sessions, but neither their counts nor their log", async () => {
      signInAs('someone-else');
      renderProfile();

      expect(await screen.findByText('Lena Brunner')).toBeInTheDocument();
      expect(await screen.findByText('Sporthalle Borrweg')).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Session log' })).not.toBeInTheDocument();
      expect(screen.queryByText(/Completed sessions ·/)).not.toBeInTheDocument();
      // and does not even ask for them
      expect(db.rpc).not.toHaveBeenCalled();
      expect(db.tables).not.toContain('session_log');
    });
  });

  it('says so for a person who does not exist or was removed', async () => {
    db.profile = null;
    signInAs('head-1', { isHeadTrainer: true });
    renderProfile('nobody');

    expect(await screen.findByRole('alert')).toHaveTextContent('This person could not be found.');
    expect(screen.getByRole('link', { name: '← Back' })).toBeInTheDocument();
  });

  it('is available in German', async () => {
    await i18n.changeLanguage('de');
    signInAs('head-1', { isHeadTrainer: true });
    renderProfile();

    expect(await screen.findByText('Lena Brunner')).toBeInTheDocument();
    expect(screen.getByText('Geleistete Trainings · Season 2026/27')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '← Zurück' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Trainingsprotokoll' })).toBeInTheDocument();
    expect(screen.getByText('Cheftrainer')).toBeInTheDocument();
  });
});
