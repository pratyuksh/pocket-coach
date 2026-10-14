import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { TrainerRoster } from '../features/trainers/TrainerRoster';
import i18n from '../i18n';

// Mock dependencies
const mockSelectProfiles = vi.fn();
const mockSelectRoles = vi.fn();
const mockPermissions = {
  isSuperAdmin: true,
  isHeadTrainer: true,
  isTrainer: true,
  canInviteTrainers: true,
  canManageRoles: true,
  canRemoveTrainers: true,
  canManageSeasons: true,
  canCreateSurveys: true,
  canAssignTrainers: true,
  isJuniorCoach: false,
  isAuthenticated: true,
};

const mockRpc = vi.fn();

vi.mock('../hooks/usePermissions', () => ({
  usePermissions: () => mockPermissions,
}));

vi.mock('../features/seasons/hooks/useActiveSeason', () => ({
  useActiveSeason: () => ({
    season: { id: 'season-1', name: 'Season 2026/27' },
    slots: [],
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({ eq: () => ({ order: () => Promise.resolve(mockSelectProfiles()) }) }),
        };
      }
      if (table === 'user_roles') {
        return { select: () => Promise.resolve(mockSelectRoles()) };
      }
      return {};
    },
  },
}));

// admin, head, trainer1 (14/18 coach), plain: counts from team_session_stats; people without
// assignments have no row
const STATS = [
  {
    profile_id: 'head-uuid',
    as_trainer: 5,
    as_assistant: 2,
    as_junior: 0,
    completed: 7,
    upcoming: 3,
    as_substitute: 1,
  },
  {
    profile_id: 'trainer-uuid',
    as_trainer: 0,
    as_assistant: 0,
    as_junior: 4,
    completed: 4,
    upcoming: 0,
    as_substitute: 0,
  },
];

describe('TrainerRoster', () => {
  const sampleProfiles = [
    {
      id: 'admin-uuid',
      display_name: 'Super Admin User',
      email: 'admin@club.de',
      specialty: 'Management',
      is_junior_coach: false,
      is_active: true,
    },
    {
      id: 'head-uuid',
      display_name: 'Helen Head',
      email: 'head@club.de',
      specialty: 'Season planning',
      is_junior_coach: false,
      is_active: true,
    },
    {
      id: 'trainer-uuid',
      display_name: 'Regular Trainer One',
      email: 'trainer1@club.de',
      specialty: 'Athletics',
      is_junior_coach: true,
      is_active: true,
    },
    {
      id: 'plain-uuid',
      display_name: 'Plain Trainer',
      email: 'plain@club.de',
      specialty: 'Fitness',
      is_junior_coach: false,
      is_active: true,
    },
  ];

  const sampleRoles = [
    { profile_id: 'admin-uuid', role: 'super_admin' },
    { profile_id: 'head-uuid', role: 'head_trainer' },
    { profile_id: 'trainer-uuid', role: 'trainer' },
    { profile_id: 'plain-uuid', role: 'trainer' },
  ];

  const memberRow = (email: string) =>
    document.querySelector<HTMLElement>(`[data-testid="team-member"][data-email="${email}"]`)!;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPermissions.canInviteTrainers = true;
    mockPermissions.isHeadTrainer = true;
    mockRpc.mockResolvedValue({ data: STATS, error: null });
    mockSelectProfiles.mockResolvedValue({ data: sampleProfiles, error: null });
    mockSelectRoles.mockResolvedValue({ data: sampleRoles, error: null });
  });

  it('lists everyone with role tags, and the speciality only for elevated roles', async () => {
    render(<TrainerRoster />, { wrapper: MemoryRouter });

    expect(await screen.findByText('Regular Trainer One')).toBeInTheDocument();
    expect(screen.getAllByTestId('team-member')).toHaveLength(4);

    const admin = within(memberRow('admin@club.de'));
    expect(admin.getByText('Super-admin')).toBeInTheDocument();
    expect(admin.getByText('Management')).toBeInTheDocument();
    expect(within(memberRow('head@club.de')).getByText('Head trainer')).toBeInTheDocument();
    expect(within(memberRow('head@club.de')).getByText('Season planning')).toBeInTheDocument();
    expect(within(memberRow('trainer1@club.de')).getByText('14/18 coach')).toBeInTheDocument();

    // A plain trainer has no tag and no speciality shown
    const plain = within(memberRow('plain@club.de'));
    expect(plain.queryByText('Fitness')).not.toBeInTheDocument();
  });

  it('does not print email addresses on the page', async () => {
    render(<TrainerRoster />, { wrapper: MemoryRouter });
    await screen.findByText('Regular Trainer One');

    expect(screen.queryByText(/@club\.de/)).not.toBeInTheDocument();
  });

  it('links every row to the profile of that person', async () => {
    render(<TrainerRoster />, { wrapper: MemoryRouter });
    await screen.findByText('Regular Trainer One');

    const link = screen.getByRole('link', { name: 'Regular Trainer One' });
    expect(link).toHaveAttribute('href', '/trainers/trainer-uuid');
    // The same link is the only interactive thing in a row: no per-row buttons any more
    expect(within(memberRow('trainer1@club.de')).getAllByRole('link')).toHaveLength(1);
    expect(
      screen.queryByRole('button', { name: /^Edit roles|^Remove|^Copy email/ }),
    ).not.toBeInTheDocument();
  });

  it('filters by group and shows the count of each group', async () => {
    const user = userEvent.setup({ delay: null });
    render(<TrainerRoster />, { wrapper: MemoryRouter });
    await screen.findByText('Regular Trainer One');

    expect(screen.getByRole('radio', { name: 'All (4)' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Trainers (3)' })).toBeInTheDocument();
    // A Super-admin counts as a head trainer, as everywhere else
    expect(screen.getByRole('radio', { name: 'Head trainers (2)' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '14/18 coaches (1)' })).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: '14/18 coaches (1)' }));
    expect(screen.getAllByTestId('team-member')).toHaveLength(1);
    expect(screen.getByText('Regular Trainer One')).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Head trainers (2)' }));
    expect(screen.getAllByTestId('team-member').map((r) => r.dataset.email)).toEqual([
      'admin@club.de',
      'head@club.de',
    ]);

    await user.click(screen.getByRole('radio', { name: 'Trainers (3)' }));
    expect(screen.queryByText('Regular Trainer One')).not.toBeInTheDocument();
  });

  it('shows the invite button only to people who may invite', async () => {
    render(<TrainerRoster />, { wrapper: MemoryRouter });
    expect(await screen.findByRole('button', { name: '+ Invite trainer' })).toBeInTheDocument();
  });

  it('hides the invite button from everyone else', async () => {
    mockPermissions.canInviteTrainers = false;
    render(<TrainerRoster />, { wrapper: MemoryRouter });
    await screen.findByText('Regular Trainer One');

    expect(screen.queryByRole('button', { name: /invite trainer/i })).not.toBeInTheDocument();
  });

  it('shows an error instead of an empty team when loading fails', async () => {
    mockSelectProfiles.mockResolvedValue({ data: null, error: { message: 'boom' } });
    render(<TrainerRoster />, { wrapper: MemoryRouter });

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the team.');
  });

  describe('session counts for Head-trainers and above', () => {
    const cell = (email: string, label: string) =>
      within(memberRow(email)).getByRole('cell', { name: new RegExp(`^${label}:`) });

    it("shows the columns from the design and asks for the season's counts", async () => {
      render(<TrainerRoster />, { wrapper: MemoryRouter });
      await screen.findByText('Regular Trainer One');

      expect(mockRpc).toHaveBeenCalledWith('team_session_stats', { p_season_id: 'season-1' });
      const headers = screen.getAllByRole('columnheader').map((h) => h.textContent);
      expect(headers).toEqual(['Trainers', 'Trainer', 'Assist.', '14/18', 'Completed', 'Upcoming']);
    });

    it('splits completed sessions by role and shows upcoming ones', async () => {
      render(<TrainerRoster />, { wrapper: MemoryRouter });
      await screen.findByText('Regular Trainer One');

      expect(cell('head@club.de', 'Trainer')).toHaveTextContent('5');
      expect(cell('head@club.de', 'Assist.')).toHaveTextContent('2');
      expect(cell('head@club.de', '14/18')).toHaveTextContent('–');
      expect(cell('head@club.de', 'Completed')).toHaveTextContent('7');
      expect(cell('head@club.de', 'Upcoming')).toHaveTextContent('3');
      expect(cell('trainer1@club.de', '14/18')).toHaveTextContent('4');
    });

    it('shows a dash for nothing, but a real 0 for completed sessions', async () => {
      render(<TrainerRoster />, { wrapper: MemoryRouter });
      await screen.findByText('Regular Trainer One');

      // A person without assignments has no row in the counts
      expect(cell('plain@club.de', 'Trainer')).toHaveTextContent('–');
      expect(cell('plain@club.de', 'Upcoming')).toHaveTextContent('–');
      expect(cell('plain@club.de', 'Completed')).toHaveTextContent('0');
    });

    it('shows the totals and the average per trainer, and what is counted', async () => {
      render(<TrainerRoster />, { wrapper: MemoryRouter });
      await screen.findByText('Regular Trainer One');

      const strip = screen.getByLabelText('Season totals');
      const tile = (term: string) =>
        within(strip).getByText(term, { selector: 'dt' }).nextElementSibling!.textContent;
      expect(tile('Completed')).toBe('11');
      expect(tile('Upcoming')).toBe('3');
      expect(tile('As substitute')).toBe('1');
      expect(tile('Average per trainer')).toBe('2.8'); // 11 over 4 people
      expect(
        screen.getByText(/Counted automatically from assignments.*Season 2026\/27/),
      ).toBeInTheDocument();
    });

    it('says so when the counts cannot be loaded, and still lists the team', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'boom' } });
      render(<TrainerRoster />, { wrapper: MemoryRouter });

      expect(await screen.findByText('Could not load the session counts.')).toBeInTheDocument();
      expect(screen.getByText('Regular Trainer One')).toBeInTheDocument();
    });

    it('is not shown to plain trainers, who do not even ask for the counts', async () => {
      mockPermissions.isHeadTrainer = false;
      render(<TrainerRoster />, { wrapper: MemoryRouter });
      await screen.findByText('Regular Trainer One');

      expect(screen.queryByRole('columnheader')).not.toBeInTheDocument();
      expect(screen.queryByRole('cell')).not.toBeInTheDocument();
      expect(screen.queryByText('Average per trainer')).not.toBeInTheDocument();
      expect(mockRpc).not.toHaveBeenCalled();
      expect(screen.getAllByTestId('team-member')).toHaveLength(4);
    });

    it('uses German labels and decimal format', async () => {
      await i18n.changeLanguage('de');
      render(<TrainerRoster />, { wrapper: MemoryRouter });
      await screen.findByText('Regular Trainer One');

      expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
        'Trainer',
        'Trainer',
        'Hilfs.',
        '14/18',
        'Geleistet',
        'Geplant',
      ]);
      expect(screen.getByText('Schnitt pro Trainer').nextElementSibling).toHaveTextContent('2.8');
    });
  });

  it('renders in German', async () => {
    await i18n.changeLanguage('de');
    render(<TrainerRoster />, { wrapper: MemoryRouter });
    await screen.findByText('Regular Trainer One');

    expect(screen.getByRole('radio', { name: 'Alle (4)' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Cheftrainer (2)' })).toBeInTheDocument();
    expect(within(memberRow('admin@club.de')).getByText('Super-Admin')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Plain Trainer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ Trainer einladen' })).toBeInTheDocument();
  });
});
