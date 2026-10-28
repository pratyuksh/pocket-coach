import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardPage } from '../pages/Dashboard';
import i18n from '../i18n';
import { addDays } from './helpers/dates';

// ---------------------------------------------------------------------------------------------
// A chainable stand-in for the Supabase query builder: each table resolves to configured rows.
// "session_assignments" is read twice by the home (own sessions, then the others on them); the
// second read is the one that filters with `.in(...)`.
// ---------------------------------------------------------------------------------------------
const db = vi.hoisted(() => ({
  mine: [] as unknown[],
  others: [] as unknown[],
  sessions: [] as unknown[],
  profiles: [] as unknown[],
  stats: [] as unknown[],
  filled: [] as unknown[],
  eqs: [] as [string, string, unknown][],
  rpc: vi.fn(),
}));

vi.mock('../lib/supabase', () => {
  const builder = (table: string) => {
    let isOthers = false;
    const b: Record<string, unknown> = {};
    const result = () => {
      if (table === 'session_assignments')
        return { data: isOthers ? db.others : db.mine, error: null };
      if (table === 'sessions') return { data: db.sessions, error: null };
      if (table === 'profiles') return { data: db.profiles, error: null };
      if (table === 'substitution_requests') return { data: db.filled, error: null };
      if (table === 'locations') return { data: LOCATIONS, error: null };
      return { data: [], error: null };
    };
    Object.assign(b, {
      select: () => b,
      order: () => b,
      not: () => b,
      gte: () => b,
      eq: (col: string, val: unknown) => (db.eqs.push([table, col, val]), b),
      neq: () => b,
      limit: () => b,
      in: () => ((isOthers = true), b),
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
const mockPermissions = vi.hoisted(() => ({ isHeadTrainer: false }));
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

const group = (name: string, sort_order: number) => ({ player_group: { name, sort_order } });

const assignment = (
  id: string,
  daysAhead: number,
  extra: Record<string, unknown> = {},
  location = 'hall-1',
) => ({
  id,
  track: 'regular',
  session_role: 'primary',
  is_substitute: false,
  session: {
    id: `s-${id}`,
    session_date: addDays(daysAhead),
    start_time: '17:30:00',
    end_time: '19:00:00',
    location_id: location,
    session_player_groups: [group('Advanced-2', 2), group('Advanced-1', 1)],
  },
  ...extra,
});

const renderHome = () =>
  render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  );

const signInAs = (isHeadTrainer: boolean, profile: Record<string, unknown> = {}) => {
  mockPermissions.isHeadTrainer = isHeadTrainer;
  mockUseAuth.mockReturnValue({
    user: { id: 'me', email: 'lena@club.de' },
    profile: { id: 'me', display_name: 'Lena Brunner', is_junior_coach: false, ...profile },
  });
};

describe('Home (trainer)', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
    vi.clearAllMocks();
    db.eqs.length = 0;
    db.mine = [
      assignment('late', 9, { session_role: 'assistant_coach' }, 'hall-2'),
      assignment('soon', 2),
      // ended earlier today: must not be offered as the next session
      assignment('ended', 0, {
        session: {
          id: 's-ended',
          session_date: addDays(0),
          start_time: '00:00:00',
          end_time: '00:01:00',
          location_id: 'hall-1',
          session_player_groups: [],
        },
      }),
    ];
    db.others = [
      { session_id: 's-soon', profile: { display_name: 'Max Trainer' } },
      { session_id: 's-soon', profile: { display_name: 'Aylin Demir' } },
      { session_id: 's-late', profile: { display_name: 'Mia Huber' } },
    ];
    db.rpc.mockResolvedValue({
      data: [
        {
          profile_id: 'me',
          as_trainer: 6,
          as_assistant: 2,
          as_junior: 0,
          completed: 7,
          upcoming: 3,
          as_substitute: 1,
        },
      ],
      error: null,
    });
    signInAs(false);
  });

  it('shows the next session with hall, groups, role and the people working it', async () => {
    renderHome();
    const next = await screen.findByTestId('next-session');

    expect(within(next).getByText('17:30–19:00')).toBeInTheDocument();
    expect(
      within(next).getByText('Sporthalle Borrweg · Advanced-1 · Advanced-2'),
    ).toBeInTheDocument();
    expect(within(next).getByText('Trainer')).toBeInTheDocument();
    expect(within(next).getByText('With Max Trainer, Aylin Demir')).toBeInTheDocument();
  });

  it('lists the sessions after the next one, with the role in each', async () => {
    renderHome();
    await screen.findByTestId('next-session');

    const rows = screen.getAllByTestId('upcoming-session');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent('Schulhaus Apfelbaum');
    expect(rows[0]).toHaveTextContent('Assistant coach');
    expect(rows[0]).toHaveTextContent('17:30');
  });

  it('shows the season counts from the shared definition: trainer and assistant for a trainer', async () => {
    renderHome();
    await screen.findByTestId('next-session');

    await waitFor(() => expect(screen.getByTestId('stat-completed')).toHaveTextContent('7'));
    expect(screen.getByTestId('stat-trainer')).toHaveTextContent('6');
    expect(screen.getByTestId('stat-assistant')).toHaveTextContent('2');
    expect(screen.getByTestId('stat-upcoming')).toHaveTextContent('3 sessions still to come');
    expect(db.rpc).toHaveBeenCalledWith('team_session_stats', {
      p_season_id: 'season-1',
      p_profile_id: 'me',
    });
    expect(screen.getByRole('link', { name: /view session log/i })).toHaveAttribute(
      'href',
      '/trainers/me',
    );
  });

  it('shows the 14/18 count, without substitutions, for a 14/18 coach', async () => {
    signInAs(false, { is_junior_coach: true });
    db.rpc.mockResolvedValue({
      data: [
        {
          profile_id: 'me',
          as_trainer: 0,
          as_assistant: 0,
          as_junior: 5,
          completed: 5,
          upcoming: 1,
          as_substitute: 2,
        },
      ],
      error: null,
    });
    renderHome();

    await waitFor(() => expect(screen.getByTestId('stat-junior')).toHaveTextContent('5'));
    // substitutions are not shown to a 14/18 coach
    expect(screen.queryByTestId('stat-substitute')).not.toBeInTheDocument();
    expect(screen.queryByText('As substitute')).not.toBeInTheDocument();
    expect(screen.queryByTestId('stat-trainer')).not.toBeInTheDocument();
    expect(screen.getByTestId('stat-upcoming')).toHaveTextContent('1 session still to come');
  });

  describe('open gaps you can cover', () => {
    const upcoming = (
      id: string,
      daysAhead: number,
      assignments: { track: string; status: string; profile_id: string | null }[],
    ) => ({
      id,
      session_date: addDays(daysAhead),
      start_time: '17:30:00',
      end_time: '19:00:00',
      location_id: 'hall-1',
      required_regular: 3,
      required_junior: 1,
      assignments,
    });
    const on = (who: string, track = 'regular') => ({
      track,
      status: 'active',
      profile_id: who,
    });

    beforeEach(() => {
      db.sessions = [
        // short of regulars, I am not on it
        upcoming('open', 3, [on('x'), on('y'), on('z', 'junior_coach')]),
        // I am on it and it is short: not offered
        upcoming('mine', 4, [on('me'), on('y'), on('z', 'junior_coach')]),
        // only the 14/18 track is short: not offered to a trainer
        upcoming('junior-only', 5, [on('x'), on('y'), on('w')]),
      ];
    });

    it('lists the gaps on the trainer track that the trainer is not already part of', async () => {
      renderHome();
      const card = await screen.findByTestId('coverable-gaps');

      expect(within(card).getByText('Open gaps you can cover')).toBeInTheDocument();
      const rows = within(card).getAllByTestId('coverable-gap');
      expect(rows.map((r) => r.getAttribute('data-session-id'))).toEqual(['open']);
      expect(rows[0]).toHaveTextContent('1 trainer needed');
      expect(rows[0]).toHaveTextContent('Sporthalle Borrweg');
      expect(rows[0]).toHaveTextContent('17:30–19:00');
      // read-only for now: no way to volunteer yet
      expect(within(card).queryByRole('button')).not.toBeInTheDocument();
      expect(db.eqs).toContainEqual(['sessions', 'season_id', 'season-1']);
    });

    it('offers a 14/18 coach the 14/18 gaps only', async () => {
      signInAs(false, { is_junior_coach: true });
      renderHome();
      const card = await screen.findByTestId('coverable-gaps');

      const rows = within(card).getAllByTestId('coverable-gap');
      expect(rows.map((r) => r.getAttribute('data-session-id'))).toEqual(['junior-only']);
      expect(rows[0]).toHaveTextContent('1 14/18 coach needed');
    });

    it('is left out when there is nothing the trainer could cover', async () => {
      db.sessions = [upcoming('full', 3, [on('x'), on('y'), on('z'), on('w', 'junior_coach')])];
      renderHome();
      await screen.findByTestId('next-session');

      expect(screen.queryByTestId('coverable-gaps')).not.toBeInTheDocument();
    });
  });

  it('says so when nothing is assigned yet', async () => {
    db.mine = [];
    renderHome();

    expect(await screen.findByText(/nothing assigned yet/i)).toBeInTheDocument();
    expect(screen.getByText('No further sessions assigned.')).toBeInTheDocument();
  });

  it('points to the calendar link in Settings', async () => {
    renderHome();
    await screen.findByTestId('next-session');
    expect(screen.getByRole('link', { name: /set up/i })).toHaveAttribute('href', '/settings');
  });

  it('is in German when the language is German', async () => {
    await i18n.changeLanguage('de');
    renderHome();
    await screen.findByTestId('next-session');

    expect(screen.getByText('Nächstes Training')).toBeInTheDocument();
    expect(screen.getByText('Mit Max Trainer, Aylin Demir')).toBeInTheDocument();
  });
});

describe('Dashboard (Head-trainer and above)', () => {
  const session = (
    id: string,
    daysAhead: number,
    assignments: { track: string; status: string }[],
    extra: Record<string, unknown> = {},
  ) => ({
    id,
    session_date: addDays(daysAhead),
    start_time: '17:30:00',
    end_time: '19:00:00',
    location_id: 'hall-1',
    required_regular: 3,
    required_junior: 1,
    assignments,
    ...extra,
  });
  const reg = (n: number, status = 'active') =>
    Array.from({ length: n }, () => ({ track: 'regular', status }));
  const jun = (n: number) =>
    Array.from({ length: n }, () => ({ track: 'junior_coach', status: 'active' }));

  beforeEach(async () => {
    await i18n.changeLanguage('en');
    vi.clearAllMocks();
    db.eqs.length = 0;
    db.sessions = [
      // fully staffed
      session('full', 3, [...reg(3), ...jun(1)]),
      // 2 of 3 trainers and no 14/18 coach: two gaps
      session('short', 4, reg(2)),
      // a trainer is out (absent_pending_sub): that person does not count; the extra trainer on a
      // full track does not hide the gap on the other track
      session('out', 5, [...reg(2), ...reg(1, 'absent_pending_sub'), ...jun(1)]),
      // ended earlier today: left out of everything
      session('ended', 0, [], {
        start_time: '00:00:00',
        end_time: '00:01:00',
      }),
    ];
    db.profiles = [
      { id: 'a', display_name: 'Aylin Demir' },
      { id: 'b', display_name: 'Max Trainer' },
      { id: 'c', display_name: 'Zoe Idle' },
    ];
    db.rpc.mockResolvedValue({
      data: [
        {
          profile_id: 'a',
          as_trainer: 4,
          as_assistant: 0,
          as_junior: 0,
          completed: 4,
          upcoming: 2,
          as_substitute: 0,
        },
        {
          profile_id: 'b',
          as_trainer: 8,
          as_assistant: 0,
          as_junior: 0,
          completed: 8,
          upcoming: 2,
          as_substitute: 1,
        },
      ],
      error: null,
    });
    db.mine = [assignment('mine', 1, {}, 'hall-2')];
    db.others = [];
    db.filled = [];
    signInAs(true);
  });

  it('shows the calendar week, coverage and open gaps in three tiles', async () => {
    renderHome();
    const coverage = await screen.findByTestId('tile-coverage');

    // 3 sessions: needed (3+1) x 3 = 12; filled 4 + 2 + 3 = 9 -> 75 %
    expect(coverage).toHaveTextContent('75%');
    expect(screen.getByText('9/12 upcoming slots filled')).toBeInTheDocument();
    expect(screen.getByTestId('tile-gaps')).toHaveTextContent('3');
    expect(screen.getByTestId('tile-week')).toHaveTextContent(/^CW \d+$/);
    expect(screen.getAllByRole('term')).toHaveLength(3);
    expect(screen.getByRole('link', { name: '75%' })).toHaveAttribute('href', '/sessions');
    expect(screen.getByRole('link', { name: '3' })).toHaveAttribute('href', '/substitutions');
  });

  it('lists each short track once, with how many are missing', async () => {
    renderHome();
    await screen.findByTestId('tile-coverage');

    const rows = screen.getAllByTestId('gap-row');
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent('1 trainer needed');
    expect(rows[0]).toHaveTextContent('Sporthalle Borrweg');
    expect(rows[1]).toHaveTextContent('1 14/18 coach needed');
    expect(rows[2]).toHaveTextContent('1 trainer needed');
    expect(screen.getAllByRole('link', { name: 'Assign' })[0]).toHaveAttribute('href', '/sessions');
    expect(screen.getByText('3 open')).toBeInTheDocument();
  });

  it('does not count gaps of sessions that are over: stale gaps are never shown', async () => {
    db.sessions = [
      // a week ago, yesterday and earlier today (ended), all unstaffed
      session('week-ago', -7, []),
      session('yesterday', -1, []),
      session('ended-today', 0, [], { start_time: '00:00:00', end_time: '00:01:00' }),
      session('tomorrow', 1, [...reg(3), ...jun(1)]),
    ];
    renderHome();

    expect(await screen.findByText('Every session is fully staffed.')).toBeInTheDocument();
    expect(screen.getByTestId('tile-gaps')).toHaveTextContent('0');
    expect(screen.getByTestId('tile-coverage')).toHaveTextContent('100%');
    expect(screen.queryByTestId('gap-row')).not.toBeInTheDocument();
  });

  it('says every session is staffed when there are no gaps', async () => {
    db.sessions = [session('full', 3, [...reg(3), ...jun(1)])];
    renderHome();

    expect(await screen.findByText('Every session is fully staffed.')).toBeInTheDocument();
    expect(screen.getByTestId('tile-coverage')).toHaveTextContent('100%');
    expect(screen.getByTestId('tile-gaps')).toHaveTextContent('0');
    expect(screen.queryByTestId('gap-row')).not.toBeInTheDocument();
  });

  it('only reads the active season', async () => {
    renderHome();
    await screen.findByTestId('tile-coverage');

    expect(db.eqs).toContainEqual(['sessions', 'season_id', 'season-1']);
  });

  it('lists the next five gaps in date order and links to the Gaps page for the rest', async () => {
    db.sessions = Array.from({ length: 8 }, (_, i) =>
      session(`g${i}`, i + 1, reg(0), { required_junior: 0 }),
    );
    renderHome();
    await screen.findByTestId('tile-coverage');

    const rows = screen.getAllByTestId('gap-row');
    expect(rows).toHaveLength(5);
    expect(rows.map((r) => r.getAttribute('data-session-date'))).toEqual([
      addDays(1),
      addDays(2),
      addDays(3),
      addDays(4),
      addDays(5),
    ]);
    expect(screen.getByRole('link', { name: 'See all gaps →' })).toHaveAttribute(
      'href',
      '/substitutions',
    );
    expect(screen.getByTestId('tile-gaps')).toHaveTextContent('8');
  });

  it('counts and lists only the gaps of the next 14 days, but coverage covers every upcoming session', async () => {
    db.sessions = [
      session('last-day', 13, reg(0), { required_junior: 0 }),
      session('too-far', 14, reg(0), { required_junior: 0 }),
      session('much-later', 40, [...reg(3), ...jun(1)]),
    ];
    renderHome();
    await screen.findByTestId('tile-coverage');

    expect(screen.getByTestId('tile-gaps')).toHaveTextContent('1');
    expect(screen.getByText('Next 14 days')).toBeInTheDocument();
    const rows = screen.getAllByTestId('gap-row');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveAttribute('data-session-date', addDays(13));
    expect(screen.getByText('1 open')).toBeInTheDocument();
    // needed: 3 + 3 + (3 + 1) = 10 regular/junior slots; only the staffed session is filled
    expect(screen.getByText('4/10 upcoming slots filled')).toBeInTheDocument();
    expect(screen.getByTestId('tile-coverage')).toHaveTextContent('40%');
  });

  it('ranks the workload by completed plus upcoming and links each person to their profile', async () => {
    renderHome();
    await screen.findByTestId('tile-coverage');

    const rows = screen.getAllByTestId('workload-row');
    expect(rows.map((r) => r.textContent)).toEqual([
      expect.stringContaining('Max Trainer'),
      expect.stringContaining('Aylin Demir'),
      expect.stringContaining('Zoe Idle'),
    ]);
    expect(rows[0]).toHaveTextContent('10');
    expect(within(rows[0]).getByRole('link')).toHaveAccessibleName(
      'Max Trainer: 8 completed, 2 upcoming',
    );
    expect(within(rows[0]).getByRole('link')).toHaveAttribute('href', '/trainers/b');
    expect(rows[2]).toHaveTextContent('0');
  });

  it("shows the viewer's own next session", async () => {
    renderHome();
    const next = await screen.findByTestId('my-next-session');

    expect(next).toHaveTextContent('17:30');
    expect(next).toHaveTextContent('Schulhaus Apfelbaum');
  });

  it('says so in the own-session block when nothing is assigned to the viewer', async () => {
    db.mine = [];
    renderHome();
    await screen.findByTestId('tile-coverage');

    expect(screen.getByText('My next session')).toBeInTheDocument();
    expect(screen.getByText('Nothing assigned to you yet.')).toBeInTheDocument();
    expect(screen.queryByTestId('my-next-session')).not.toBeInTheDocument();
  });

  it('lists who covered for whom, newest first, and says so when nothing is filled yet', async () => {
    renderHome();
    expect(await screen.findByText('Nothing has been filled yet.')).toBeInTheDocument();
    expect(screen.queryByTestId('filled-row')).not.toBeInTheDocument();
  });

  it('shows recently filled gaps with the people and when', async () => {
    db.filled = [
      {
        id: 'f1',
        filled_at: new Date(Date.now() - 5 * 3_600_000).toISOString(),
        session: { session_date: addDays(2) },
        original: { display_name: 'Sofia Meier' },
        volunteer: { display_name: 'Aylin Demir' },
      },
      {
        id: 'f2',
        filled_at: new Date(Date.now() - 3 * 86_400_000).toISOString(),
        session: { session_date: addDays(-1) },
        original: { display_name: 'Luca Steiner' },
        volunteer: { display_name: 'Mia Huber' },
      },
    ];
    renderHome();
    await screen.findByTestId('tile-coverage');

    const rows = await screen.findAllByTestId('filled-row');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('Aylin Demir covered for Sofia Meier');
    expect(rows[0]).toHaveTextContent('5 hours ago');
    expect(rows[1]).toHaveTextContent('Mia Huber covered for Luca Steiner');
    expect(rows[1]).toHaveTextContent('3 days ago');
  });
});
