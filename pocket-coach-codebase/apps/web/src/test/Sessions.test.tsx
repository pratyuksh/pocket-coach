import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import i18n from '../i18n';
import { SessionList } from '../features/sessions/SessionList';
import { SessionDetail } from '../features/sessions/SessionDetail';
import { addDays } from './helpers/dates';
import { isoWeekNumber, weekStart } from '../lib/dates';

const h = vi.hoisted(() => ({
  season: null as unknown,
  lastFilters: null as unknown,
  sessions: [] as unknown[],
  session: null as unknown,
  deleteSession: vi.fn(),
  saveAssignments: vi.fn(),
  refetch: vi.fn(),
  updateOverride: vi.fn(),
  updateRequirements: vi.fn(),
  permissions: { canManageSeasons: false, isHeadTrainer: false },
  navigated: [] as string[],
}));

vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'me' } }) }));
vi.mock('../hooks/usePermissions', () => ({ usePermissions: () => h.permissions }));
vi.mock('../features/seasons/hooks/useActiveSeason', () => ({
  useActiveSeason: () => ({
    season: h.season,
    slots: [],
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
vi.mock('../features/locations/hooks/useLocations', () => ({
  useLocations: () => ({
    locations: [
      { id: 'hall-1', name: 'Sporthalle Borrweg', is_active: true, district_area: 'Friesenberg' },
      { id: 'hall-2', name: 'Schulhaus Apfelbaum', is_active: true, district_area: null },
      { id: 'hall-3', name: 'Unused Hall', is_active: true, district_area: null },
    ],
    loading: false,
    error: null,
  }),
}));
vi.mock('../features/sessions/hooks/useSessions', () => ({
  useSessions: (filters: unknown) => ({
    sessions: ((h.lastFilters = filters), h.sessions),
    loading: false,
    error: null,
    refetch: vi.fn(),
    publishRange: vi.fn(),
    unpublishRange: vi.fn(),
  }),
}));
vi.mock('../features/sessions/hooks/useSession', () => ({
  useSession: () => ({
    session: h.session,
    loading: false,
    notFound: h.session === null,
    error: false,
    refetch: h.refetch,
    updateOverride: h.updateOverride,
    updateRequirements: h.updateRequirements,
    deleteSession: h.deleteSession,
  }),
}));
// The dialogs have their own tests; here they only need to open
vi.mock('../features/sessions/hooks/useAssignTrainer', () => ({
  useAssignTrainer: () => ({ saveAssignments: h.saveAssignments, loading: false, error: null }),
}));
vi.mock('../features/sessions/components/OpenSlotDialog', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../features/sessions/components/OpenSlotDialog')>()),
  OpenSlotDialog: ({
    isOpen,
    onClose,
    track,
  }: {
    isOpen: boolean;
    onClose: () => void;
    track: string;
  }) =>
    isOpen ? (
      <div role="dialog">
        slot dialog for {track}
        <button onClick={onClose}>close dialog</button>
      </div>
    ) : null,
}));
vi.mock('../features/sessions/components/SessionOverrideModal', () => ({
  SessionOverrideModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div role="dialog">
        override dialog
        <button onClick={onClose}>close dialog</button>
      </div>
    ) : null,
}));
vi.mock('../features/sessions/components/PublishSessionsModal', () => ({
  PublishSessionsModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div role="dialog">
        publish dialog
        <button onClick={onClose}>close dialog</button>
      </div>
    ) : null,
}));
vi.mock('../features/sessions/components/BulkAssignModal', () => ({
  BulkAssignModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div role="dialog">
        bulk dialog
        <button onClick={onClose}>close dialog</button>
      </div>
    ) : null,
}));

const season = (id: string, name: string, is_active: boolean) => ({
  id,
  name,
  is_active,
  start_date: '2026-08-01',
  end_date: '2027-07-31',
});

const asg = (
  id: string,
  profile: string | null,
  track: 'regular' | 'junior_coach',
  extra: Record<string, unknown> = {},
) => ({
  id,
  profile_id: profile,
  track,
  session_role: 'primary',
  status: 'active',
  is_substitute: false,
  assigned_at: `2026-10-0${id.length}T00:00:00Z`,
  profile: profile ? { id: profile, display_name: `Person ${profile}` } : null,
  ...extra,
});

const sess = (id: string, daysAhead: number, extra: Record<string, unknown> = {}) => ({
  id,
  season_id: 's1',
  session_date: addDays(daysAhead),
  day_of_week: 2,
  start_time: '17:30:00',
  end_time: '19:00:00',
  location_id: 'hall-1',
  location: { id: 'hall-1', name: 'Sporthalle Borrweg', district_area: 'Friesenberg' },
  required_regular: 3,
  required_junior: 1,
  is_time_overridden: false,
  published_at: '2026-10-01T00:00:00Z',
  player_groups: [{ id: 'g1', name: 'Advanced-1' }],
  assignments: [],
  ...extra,
});

const renderList = () =>
  render(
    <MemoryRouter initialEntries={['/sessions']}>
      <Routes>
        <Route path="/sessions" element={<SessionList />} />
        <Route path="/sessions/:sessionId" element={<p>detail page</p>} />
        <Route path="/settings" element={<p>settings page</p>} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(async () => {
  await i18n.changeLanguage('en');
  vi.clearAllMocks();
  h.permissions = { canManageSeasons: false, isHeadTrainer: false };
  h.season = season('s1', 'Season 2026/27', true);
});

describe('Sessions list', () => {
  beforeEach(() => {
    h.sessions = [
      sess('a', 2, {
        assignments: [
          asg('1', 'me', 'regular'),
          asg('22', 'x', 'regular'),
          asg('333', 'y', 'regular'),
          asg('4444', 'z', 'junior_coach'),
        ],
      }),
      sess('b', 3, {
        location_id: 'hall-2',
        location: { id: 'hall-2', name: 'Schulhaus Apfelbaum', district_area: null },
        is_time_overridden: true,
        assignments: [asg('55555', 'x', 'regular')],
      }),
    ];
  });

  it('shows the season, the week and a row per session with hall, groups and coverage', async () => {
    renderList();

    expect(await screen.findByText('Season 2026/27')).toBeInTheDocument();
    expect(screen.getByText('Current season')).toBeInTheDocument();
    const rows = screen.getAllByTestId('session-row');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('17:30–19:00');
    expect(rows[0]).toHaveTextContent('Sporthalle Borrweg · Advanced-1');
    expect(rows[0]).toHaveTextContent('3/3');
    expect(rows[0]).toHaveTextContent('1/1');
    // the second is short of trainers and has a 14/18 gap
    expect(rows[1]).toHaveTextContent('1/3');
    expect(rows[1]).toHaveTextContent('0/1');
    expect(rows[0]).toHaveAttribute('href', '/sessions/a');
  });

  it('marks own sessions with You, changed times with Changed, and drafts with Draft', async () => {
    h.sessions = [...(h.sessions as object[]), sess('c', 4, { published_at: null })];
    renderList();
    await screen.findAllByTestId('session-row');

    const rows = screen.getAllByTestId('session-row');
    expect(within(rows[0]).getByText('You')).toBeInTheDocument();
    expect(within(rows[1]).queryByText('You')).not.toBeInTheDocument();
    expect(within(rows[1]).getByText('Changed')).toBeInTheDocument();
    expect(within(rows[2]).getByText('Draft')).toBeInTheDocument();
  });

  it('filters by hall (only halls used in the season are offered) and by "Only mine"', async () => {
    const user = userEvent.setup();
    renderList();
    await screen.findAllByTestId('session-row');

    const halls = screen.getByRole('radiogroup', { name: 'Hall' });
    expect(
      within(halls)
        .getAllByRole('radio')
        .map((r) => r.textContent),
    ).toEqual(['All halls', 'Sporthalle Borrweg', 'Schulhaus Apfelbaum']);

    await user.click(within(halls).getByRole('radio', { name: 'Schulhaus Apfelbaum' }));
    expect(screen.getAllByTestId('session-row')).toHaveLength(1);
    expect(screen.getByTestId('session-row')).toHaveAttribute('data-session-id', 'b');

    await user.click(within(halls).getByRole('radio', { name: 'All halls' }));
    await user.click(screen.getByRole('checkbox', { name: 'Only mine' }));
    expect(screen.getAllByTestId('session-row')).toHaveLength(1);
    expect(screen.getByTestId('session-row')).toHaveAttribute('data-session-id', 'a');
  });

  it('says so when a filter leaves nothing', async () => {
    const user = userEvent.setup();
    h.sessions = [sess('b', 3, { assignments: [asg('1', 'x', 'regular')] })];
    renderList();
    await screen.findAllByTestId('session-row');

    await user.click(screen.getByRole('checkbox', { name: 'Only mine' }));
    expect(screen.getByText('No sessions match this selection.')).toBeInTheDocument();
  });

  it('only reads the current (active) season', async () => {
    renderList();
    await screen.findAllByTestId('session-row');
    expect(h.lastFilters).toEqual({ seasonId: 's1' });
  });

  it('shows this week and the next four as chips, starting with the current calendar week', async () => {
    renderList();
    await screen.findAllByTestId('session-row');

    const chips = within(screen.getByRole('group', { name: 'Weeks' })).getAllByRole('button', {
      name: /^CW/,
    });
    const current = weekStart(addDays(0));
    expect(chips.map((c) => c.getAttribute('data-week'))).toEqual(
      [0, 7, 14, 21, 28].map((d) => weekStart(addDays(d))),
    );
    expect(chips[0].getAttribute('data-week')).toBe(current);
    expect(chips[0]).toHaveTextContent(`CW ${isoWeekNumber(current)}`);
  });

  it('shows one week at a time and switches with the week chips and the calendar', async () => {
    const user = userEvent.setup();
    h.sessions = [sess('a', 1), sess('far', 21)];
    renderList();
    await screen.findAllByTestId('session-row');

    expect(screen.getAllByTestId('session-row')).toHaveLength(1);
    expect(screen.getByTestId('session-row')).toHaveAttribute('data-session-id', 'a');
    const farChip = screen
      .getAllByRole('button', { name: /^CW/ })
      .find((c) => c.getAttribute('data-week') === weekStart(addDays(21))) as HTMLElement;

    await user.click(farChip);
    expect(farChip).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('session-row')).toHaveAttribute('data-session-id', 'far');

    // the calendar marks the days and selects a week
    const calendar = screen.getByTestId('session-calendar');
    expect(calendar.querySelector(`[data-date="${addDays(1)}"]`)).toHaveAttribute(
      'data-state',
      'short',
    );
    await user.click(
      within(calendar).getByRole('button', {
        name: `Show week ${isoWeekNumber(weekStart(addDays(1)))}`,
      }),
    );
    expect(screen.getByTestId('session-row')).toHaveAttribute('data-session-id', 'a');
  });

  it('pages through later weeks with the arrows and cannot go before this week', async () => {
    const user = userEvent.setup();
    h.sessions = [sess('soon', 1), sess('later', 60)];
    renderList();
    await screen.findAllByTestId('session-row');

    const prev = screen.getByRole('button', { name: 'Previous weeks' });
    const next = screen.getByRole('button', { name: 'Next weeks' });
    expect(prev).toBeDisabled();
    expect(next).toBeEnabled();

    await user.click(next);
    const chips = screen.getAllByRole('button', { name: /^CW/ });
    expect(chips[0].getAttribute('data-week')).toBe(weekStart(addDays(35)));
    expect(screen.getByTestId('session-row')).toHaveAttribute('data-session-id', 'later');
    expect(prev).toBeEnabled();
    expect(next).toBeDisabled();

    await user.click(prev);
    expect(screen.getAllByRole('button', { name: /^CW/ })[0].getAttribute('data-week')).toBe(
      weekStart(addDays(0)),
    );
    expect(screen.getByTestId('session-row')).toHaveAttribute('data-session-id', 'soon');
    expect(prev).toBeDisabled();
  });

  it('moves the weeks to a week picked in the calendar that is beyond the five shown', async () => {
    const user = userEvent.setup();
    h.sessions = [sess('soon', 1), sess('later', 60)];
    renderList();
    await screen.findAllByTestId('session-row');

    const calendar = screen.getByTestId('session-calendar');
    // step the calendar forward until the week of the later session has a button
    const laterCw = isoWeekNumber(weekStart(addDays(60)));
    for (
      let i = 0;
      i < 3 && !within(calendar).queryByRole('button', { name: `Show week ${laterCw}` });
      i++
    ) {
      await user.click(within(calendar).getByRole('button', { name: 'Next month' }));
    }
    await user.click(within(calendar).getByRole('button', { name: `Show week ${laterCw}` }));

    expect(screen.getByTestId('session-row')).toHaveAttribute('data-session-id', 'later');
    expect(screen.getAllByRole('button', { name: /^CW/ })[0].getAttribute('data-week')).toBe(
      weekStart(addDays(60)),
    );
  });

  it('starts the chips at this week but keeps earlier weeks of the season reachable in the calendar', async () => {
    const user = userEvent.setup();
    h.sessions = [sess('old', -14), sess('now', 1)];
    renderList();
    await screen.findAllByTestId('session-row');

    // the list and the chips start at the current week
    expect(screen.getByTestId('session-row')).toHaveAttribute('data-session-id', 'now');
    const chipWeeks = () =>
      screen.getAllByRole('button', { name: /^CW/ }).map((c) => c.getAttribute('data-week'));
    expect(chipWeeks()[0]).toBe(weekStart(addDays(0)));
    expect(screen.getByRole('button', { name: 'Previous weeks' })).toBeDisabled();

    // the calendar marks the older session and selects its week
    const calendar = screen.getByTestId('session-calendar');
    const oldCw = isoWeekNumber(weekStart(addDays(-14)));
    for (
      let i = 0;
      i < 2 && !within(calendar).queryByRole('button', { name: `Show week ${oldCw}` });
      i++
    ) {
      await user.click(within(calendar).getByRole('button', { name: 'Previous month' }));
    }
    expect(calendar.querySelector(`[data-date="${addDays(-14)}"]`)).toHaveAttribute(
      'data-state',
      'short',
    );
    await user.click(within(calendar).getByRole('button', { name: `Show week ${oldCw}` }));

    expect(screen.getByTestId('session-row')).toHaveAttribute('data-session-id', 'old');
    expect(chipWeeks()[0]).toBe(weekStart(addDays(-14)));
  });

  it('lets the arrows go back to the first week of the season once an earlier week is shown', async () => {
    const user = userEvent.setup();
    h.sessions = [sess('first', -70), sess('mid', -14), sess('now', 1)];
    renderList();
    await screen.findAllByTestId('session-row');

    // an earlier week picked in the calendar moves the chips there
    const calendar = screen.getByTestId('session-calendar');
    const midCw = isoWeekNumber(weekStart(addDays(-14)));
    for (
      let i = 0;
      i < 3 && !within(calendar).queryByRole('button', { name: `Show week ${midCw}` });
      i++
    ) {
      await user.click(within(calendar).getByRole('button', { name: 'Previous month' }));
    }
    await user.click(within(calendar).getByRole('button', { name: `Show week ${midCw}` }));
    const prev = screen.getByRole('button', { name: 'Previous weeks' });
    expect(prev).toBeEnabled();

    // five weeks back, then the step is cut short at the first week of the season
    await user.click(prev);
    expect(screen.getAllByRole('button', { name: /^CW/ })[0].getAttribute('data-week')).toBe(
      weekStart(addDays(-49)),
    );
    expect(prev).toBeEnabled();
    await user.click(prev);
    expect(screen.getAllByRole('button', { name: /^CW/ })[0].getAttribute('data-week')).toBe(
      weekStart(addDays(-70)),
    );
    expect(screen.getByTestId('session-row')).toHaveAttribute('data-session-id', 'first');
    expect(prev).toBeDisabled();
  });

  it('says so when the selected week has no sessions', async () => {
    const user = userEvent.setup();
    h.sessions = [sess('soon', 1)];
    renderList();
    await screen.findAllByTestId('session-row');

    const empty = screen
      .getAllByRole('button', { name: /^CW/ })
      .find((c) => c.getAttribute('data-week') === weekStart(addDays(14))) as HTMLElement;
    await user.click(empty);
    expect(screen.getByText('No sessions this week.')).toBeInTheDocument();
  });

  it('marks a week and a day red when a session is short, black when all are full', async () => {
    h.sessions = [
      sess('full', 1, {
        assignments: [
          asg('1', 'a', 'regular'),
          asg('22', 'b', 'regular'),
          asg('333', 'c', 'regular'),
          asg('4444', 'd', 'junior_coach'),
        ],
      }),
    ];
    renderList();
    await screen.findAllByTestId('session-row');

    expect(
      screen.getByTestId('session-calendar').querySelector(`[data-date="${addDays(1)}"]`),
    ).toHaveAttribute('data-state', 'full');
    const chip = screen
      .getAllByRole('button', { name: /^CW/ })
      .find((c) => c.getAttribute('data-week') === weekStart(addDays(1))) as HTMLElement;
    expect(chip.querySelector('.bg-text')).not.toBeNull();
    expect(chip.querySelector('.bg-accent')).toBeNull();
  });

  it('shows Publish with the draft count and Bulk assign to Head-trainers only', async () => {
    h.sessions = [sess('d', 2, { published_at: null }), sess('e', 3, { published_at: null })];
    renderList();
    await screen.findAllByTestId('session-row');
    expect(screen.queryByRole('button', { name: /bulk assign/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^publish/i })).not.toBeInTheDocument();
    expect(screen.getByText('Published sessions')).toBeInTheDocument();
  });

  it('gives a Head-trainer the Publish and Bulk assign buttons and the drafts', async () => {
    const user = userEvent.setup();
    h.permissions = { canManageSeasons: true, isHeadTrainer: true };
    h.sessions = [sess('d', 2, { published_at: null }), sess('e', 3, { published_at: null })];
    renderList();
    await screen.findAllByTestId('session-row');

    expect(screen.getByText('Published sessions and drafts')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Publish 2 drafts' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('publish dialog');
    await user.click(screen.getByRole('button', { name: 'close dialog' }));
    await user.click(screen.getByRole('button', { name: 'Bulk assign' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('bulk dialog');
  });

  it('says so when the season has no sessions, and when there is no season', async () => {
    h.sessions = [];
    const { unmount } = renderList();
    expect(await screen.findByText('This season has no sessions yet.')).toBeInTheDocument();
    unmount();

    h.season = null;
    h.permissions = { canManageSeasons: true, isHeadTrainer: true };
    renderList();
    expect(await screen.findByText('There is no season yet.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute('href', '/settings');
  });

  it('is in German when the language is German', async () => {
    await i18n.changeLanguage('de');
    renderList();
    await screen.findAllByTestId('session-row');

    expect(screen.getByText('Aktuelle Saison')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Nur meine' })).toBeInTheDocument();
    expect(screen.getByText('Alle Hallen')).toBeInTheDocument();
  });
});

describe('Session detail', () => {
  const detail = (extra: Record<string, unknown> = {}) =>
    sess('a', 2, {
      location: {
        id: 'hall-1',
        name: 'Sporthalle Borrweg',
        district_area: 'Friesenberg',
        address: 'Borrweg 70, 8055 Zürich',
        trainer_note: 'Key at reception',
      },
      assignments: [
        asg('1', 'me', 'regular'),
        asg('22', 'x', 'regular', { session_role: 'assistant_coach' }),
        asg('333', 'y', 'regular', { status: 'absent_pending_sub' }),
        asg('4444', 'z', 'junior_coach', { is_substitute: true }),
      ],
      ...extra,
    });

  const renderDetail = () =>
    render(
      <MemoryRouter initialEntries={['/sessions/a']}>
        <Routes>
          <Route path="/sessions/:sessionId" element={<SessionDetail />} />
          <Route path="/sessions" element={<p>sessions list</p>} />
        </Routes>
      </MemoryRouter>,
    );

  beforeEach(() => {
    h.session = detail();
  });

  it('shows time, hall with area, address link, note and groups', () => {
    renderDetail();

    expect(screen.getByText('17:30–19:00')).toBeInTheDocument();
    expect(screen.getByText('Sporthalle Borrweg (Friesenberg)')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Sporthalle Borrweg in maps' })).toHaveAttribute(
      'href',
      expect.stringContaining('maps.google.com'),
    );
    expect(screen.getByText('Key at reception')).toBeInTheDocument();
    expect(screen.getByText('Groups: Advanced-1')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back/i })).toHaveAttribute('href', '/sessions');
  });

  it('lists the people per track, with You, Assistant and Substitute tags, open slots and who is out', () => {
    renderDetail();

    const regular = screen.getByTestId('track-regular');
    expect(within(regular).getAllByTestId('slot-person')).toHaveLength(2);
    expect(within(regular).getByText('Person me')).toBeInTheDocument();
    expect(within(regular).getByText('You')).toBeInTheDocument();
    expect(within(regular).getByText('Assistant', { selector: 'span' })).toBeInTheDocument();
    expect(within(regular).getAllByTestId('slot-open')).toHaveLength(1);
    const out = within(regular).getByTestId('slot-out');
    expect(out).toHaveTextContent('Person y');
    expect(out).toHaveTextContent('Out · sub requested');

    const junior = screen.getByTestId('track-junior');
    expect(within(junior).getByText('Person z')).toBeInTheDocument();
    expect(within(junior).getByText('Substitute')).toBeInTheDocument();
    expect(within(junior).queryByTestId('slot-open')).not.toBeInTheDocument();
    // 2 of 3 regular, 1 of 1 junior
    expect(screen.getByText('2/3')).toBeInTheDocument();
    expect(screen.getByText('1/1')).toBeInTheDocument();
    expect(screen.getByText('1 trainer needed')).toBeInTheDocument();
  });

  it('shows no management actions to a trainer', () => {
    renderDetail();

    expect(screen.queryByRole('button', { name: /assign/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /change time or hall/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete session/i })).not.toBeInTheDocument();
  });

  it('lets a Head-trainer assign, change time or hall, and delete after confirming', async () => {
    const user = userEvent.setup();
    h.permissions = { canManageSeasons: true, isHeadTrainer: true };
    h.deleteSession.mockResolvedValue(undefined);
    renderDetail();

    // there is no separate Assign button: open slots are the way to assign
    expect(screen.queryByRole('button', { name: /^assign trainers/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /change time or hall/i }));
    expect(screen.getByRole('dialog')).toHaveTextContent('override dialog');
    await user.click(screen.getByRole('button', { name: 'close dialog' }));

    await user.click(screen.getByRole('button', { name: 'Delete session' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete session' });
    expect(h.deleteSession).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole('button', { name: 'Delete session' }));

    expect(h.deleteSession).toHaveBeenCalled();
    expect(await screen.findByText('sessions list')).toBeInTheDocument();
  });

  it('lets a Head-trainer click an open slot to pick someone for that track', async () => {
    const user = userEvent.setup();
    h.permissions = { canManageSeasons: true, isHeadTrainer: true };
    // one open trainer slot and one open 14/18 slot
    h.session = detail({
      assignments: [asg('1', 'me', 'regular'), asg('22', 'x', 'regular')],
    });
    renderDetail();

    const open = screen.getAllByTestId('slot-open');
    expect(open).toHaveLength(1 + 1);
    await user.click(
      within(screen.getByTestId('track-regular')).getByRole('button', { name: /open slot/i }),
    );
    expect(screen.getByRole('dialog')).toHaveTextContent('slot dialog for regular');
    await user.click(screen.getByRole('button', { name: 'close dialog' }));

    await user.click(
      within(screen.getByTestId('track-junior')).getByRole('button', { name: /open slot/i }),
    );
    expect(screen.getByRole('dialog')).toHaveTextContent('slot dialog for junior_coach');
  });

  it('shows open slots to a trainer as plain text, not as something to click', () => {
    renderDetail();

    const open = within(screen.getByTestId('track-regular')).getByTestId('slot-open');
    expect(open).toHaveTextContent('Open slot');
    expect(within(open).queryByRole('button')).not.toBeInTheDocument();
  });

  describe('open slots of a session (Head-trainer)', () => {
    beforeEach(() => {
      h.permissions = { canManageSeasons: true, isHeadTrainer: true };
      h.updateRequirements.mockResolvedValue(undefined);
      // 3 trainers and 1 coach required; one trainer and no coach assigned
      h.session = detail({ assignments: [asg('1', 'me', 'regular')] });
    });

    it('offers to remove each open slot, but not the filled ones', () => {
      renderDetail();

      const regular = screen.getByTestId('track-regular');
      expect(within(regular).getAllByTestId('slot-open')).toHaveLength(2);
      expect(within(regular).getAllByRole('button', { name: /remove this slot/i })).toHaveLength(2);
      // the assigned person has Remove, not "Remove slot"
      const person = within(regular).getByTestId('slot-person');
      expect(within(person).queryByRole('button', { name: /remove this slot/i })).toBeNull();
      expect(
        within(screen.getByTestId('track-junior')).getAllByRole('button', {
          name: /remove this slot/i,
        }),
      ).toHaveLength(1);
    });

    it('takes one open slot away from the session with one click', async () => {
      const user = userEvent.setup();
      renderDetail();

      await user.click(
        within(screen.getByTestId('track-regular')).getAllByRole('button', {
          name: /remove this slot/i,
        })[0],
      );

      expect(h.updateRequirements).toHaveBeenCalledWith({ required_regular: 2 });
      expect(
        await screen.findByText('The open slot was removed for this session.'),
      ).toBeInTheDocument();
    });

    it('takes the 14/18 slot away', async () => {
      const user = userEvent.setup();
      renderDetail();

      await user.click(
        within(screen.getByTestId('track-junior')).getByRole('button', {
          name: /remove this slot/i,
        }),
      );
      expect(h.updateRequirements).toHaveBeenCalledWith({ required_junior: 0 });
    });

    it('keeps a track that needs nobody visible so a slot can be added back', async () => {
      const user = userEvent.setup();
      h.session = detail({ required_junior: 0, assignments: [asg('1', 'me', 'regular')] });
      renderDetail();

      const junior = screen.getByTestId('track-junior');
      expect(within(junior).queryByTestId('slot-open')).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: /add a slot to 14\/18 coaches/i }));
      expect(h.updateRequirements).toHaveBeenCalledWith({ required_junior: 1 });
    });

    it('adds a slot back up to the maximum a track can have, and no further', () => {
      // trainers: 3 required = maximum, so no Add slot; 14/18 coaches: 1 of 2, so Add slot
      renderDetail();

      expect(
        screen.queryByRole('button', { name: /add a slot to trainers/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /add a slot to 14\/18 coaches/i }),
      ).toBeInTheDocument();
    });

    it('says so and changes nothing when saving fails', async () => {
      const user = userEvent.setup();
      h.updateRequirements.mockRejectedValue(new Error('boom'));
      renderDetail();

      await user.click(
        within(screen.getByTestId('track-regular')).getAllByRole('button', {
          name: /remove this slot/i,
        })[0],
      );
      expect(await screen.findByText('Could not change the number of slots.')).toBeInTheDocument();
    });
  });

  it('gives a trainer no way to change the open slots, and hides a track the session does not need', () => {
    h.session = detail({ required_junior: 0, assignments: [asg('1', 'me', 'regular')] });
    renderDetail();

    expect(
      screen.queryByRole('button', { name: /remove this slot|add a slot/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('track-junior')).not.toBeInTheDocument();
  });

  it('lets a Head-trainer remove a person from the session', async () => {
    const user = userEvent.setup();
    h.permissions = { canManageSeasons: true, isHeadTrainer: true };
    h.saveAssignments.mockResolvedValue(2);
    renderDetail();

    await user.click(screen.getByRole('button', { name: 'Remove Person x' }));

    // everyone else stays, the person who is out is not part of the saved set
    expect(h.saveAssignments).toHaveBeenCalledWith('a', [
      { profile_id: 'me', track: 'regular', session_role: 'primary' },
      { profile_id: 'z', track: 'junior_coach', session_role: 'primary' },
    ]);
    expect(h.refetch).toHaveBeenCalled();
    expect(await screen.findByText('Person x was removed.')).toBeInTheDocument();
    // people who are out cannot be removed here
    expect(screen.queryByRole('button', { name: 'Remove Person y' })).not.toBeInTheDocument();
  });

  it('keeps the dialog and says so when deleting fails', async () => {
    const user = userEvent.setup();
    h.permissions = { canManageSeasons: true, isHeadTrainer: true };
    h.deleteSession.mockRejectedValue(new Error('boom'));
    renderDetail();

    await user.click(screen.getByRole('button', { name: 'Delete session' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete session' });
    await user.click(within(dialog).getByRole('button', { name: 'Delete session' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Failed to delete session');
  });

  it('marks a draft and a changed time', () => {
    h.session = detail({ published_at: null, is_time_overridden: true });
    renderDetail();

    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByText('Changed')).toBeInTheDocument();
  });

  it('says so when the session does not exist', () => {
    h.session = null;
    renderDetail();

    expect(screen.getByRole('alert')).toHaveTextContent('This session could not be found.');
  });
});
