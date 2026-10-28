import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '../i18n';
import { OpenSlotDialog } from '../features/sessions/components/OpenSlotDialog';
import type { EnrichedSession } from '../features/sessions/hooks/useSessions';

const h = vi.hoisted(() => ({
  busy: [] as unknown[],
  busyError: false,
  eqs: [] as [string, unknown][],
  neqs: [] as [string, unknown][],
  save: vi.fn(),
  saveError: null as string | null,
  stats: {} as Record<string, { completed: number; upcoming: number }>,
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: () => {
      const b: Record<string, unknown> = {};
      Object.assign(b, {
        select: () => b,
        eq: (col: string, val: unknown) => (h.eqs.push([col, val]), b),
        neq: (col: string, val: unknown) => (h.neqs.push([col, val]), b),
        then: (resolve: (v: unknown) => unknown) =>
          Promise.resolve(
            h.busyError ? { data: null, error: new Error('boom') } : { data: h.busy, error: null },
          ).then(resolve),
      });
      return b;
    },
  },
}));
vi.mock('../features/trainers/hooks/useTrainers', () => ({
  useTrainers: () => ({
    trainers: [
      { id: 'a', display_name: 'Anna Busy', is_active: true, is_junior_coach: false },
      {
        id: 'b',
        display_name: 'Ben Lots',
        is_active: true,
        is_junior_coach: false,
        specialty: 'Goalkeepers',
      },
      { id: 'c', display_name: 'Cara Few', is_active: true, is_junior_coach: false },
      { id: 'd', display_name: 'Dan Already', is_active: true, is_junior_coach: false },
      { id: 'e', display_name: 'Eli Away', is_active: false, is_junior_coach: false },
      { id: 'f', display_name: 'Finn Next', is_active: true, is_junior_coach: false },
      { id: 'j1', display_name: 'Jo Coach', is_active: true, is_junior_coach: true },
      { id: 'j2', display_name: 'Jay Coach', is_active: true, is_junior_coach: true },
    ],
    loading: false,
    error: null,
  }),
}));
vi.mock('../features/trainers/hooks/useTeamStats', () => ({
  EMPTY_STATS: { completed: 0, upcoming: 0 },
  useTeamStats: () => ({ stats: h.stats, error: false, refetch: () => {} }),
}));
vi.mock('../features/sessions/hooks/useAssignTrainer', () => ({
  useAssignTrainer: () => ({ saveAssignments: h.save, loading: false, error: h.saveError }),
}));

const asg = (profile: string, track: string, role = 'primary', status = 'active') => ({
  id: `${profile}-${track}`,
  profile_id: profile,
  track,
  session_role: role,
  status,
});

const session = (assignments: unknown[] = []) =>
  ({
    id: 's1',
    season_id: 'season-1',
    session_date: '2026-11-03',
    start_time: '17:30:00',
    end_time: '19:00:00',
    assignments,
  }) as unknown as EnrichedSession;

const busyRow = (profile: string, start: string, end: string) => ({
  profile_id: profile,
  session: { start_time: start, end_time: end },
});

const renderDialog = (
  s: EnrichedSession,
  track: 'regular' | 'junior_coach' = 'regular',
  callbacks: { onClose?: () => void; onAssigned?: (n: string) => void } = {},
) =>
  render(
    <OpenSlotDialog
      session={s}
      track={track}
      isOpen
      onClose={callbacks.onClose ?? vi.fn()}
      onAssigned={callbacks.onAssigned ?? vi.fn()}
    />,
  );

const names = () => screen.getAllByTestId('slot-candidate').map((b) => b.textContent);

beforeEach(async () => {
  await i18n.changeLanguage('en');
  vi.clearAllMocks();
  h.busy = [];
  h.busyError = false;
  h.eqs.length = 0;
  h.neqs.length = 0;
  h.saveError = null;
  h.save.mockResolvedValue(1);
  h.stats = {
    b: { completed: 9, upcoming: 3 },
    c: { completed: 1, upcoming: 0 },
    a: { completed: 4, upcoming: 2 },
    f: { completed: 4, upcoming: 2 },
  };
});

describe('OpenSlotDialog', () => {
  it('lists the trainers who are free, with the fewest sessions first', async () => {
    renderDialog(session([asg('d', 'regular')]));

    await screen.findAllByTestId('slot-candidate');
    // c: 1 session, a and f: 6 (by name), b: 12. Dan is on the session, Eli is inactive, the
    // 14/18 coaches belong to the other track
    expect(names()).toEqual([
      expect.stringContaining('Cara Few'),
      expect.stringContaining('Anna Busy'),
      expect.stringContaining('Finn Next'),
      expect.stringContaining('Ben Lots'),
    ]);
    expect(screen.getByText('1 session')).toBeInTheDocument();
    expect(screen.getByText('12 sessions')).toBeInTheDocument();
    expect(screen.getByText('Goalkeepers')).toBeInTheDocument();
    expect(screen.getByText('Assign a trainer')).toBeInTheDocument();
    expect(screen.getByText(/Tue 3 Nov/)).toBeInTheDocument();
  });

  it('asks for the session on that date and leaves out people with an overlapping session in any hall', async () => {
    h.busy = [
      busyRow('a', '18:15:00', '19:45:00'), // overlaps
      busyRow('b', '19:00:00', '20:30:00'), // starts when this one ends: no overlap
      busyRow('c', '16:00:00', '17:30:00'), // ends when this one starts: no overlap
      busyRow('f', '17:00:00', '20:00:00'), // contains it: overlaps
    ];
    renderDialog(session());

    await screen.findAllByTestId('slot-candidate');
    const listed = names().join('|');
    expect(listed).not.toContain('Anna Busy');
    expect(listed).not.toContain('Finn Next');
    expect(listed).toContain('Ben Lots');
    expect(listed).toContain('Cara Few');
    expect(h.eqs).toContainEqual(['session.session_date', '2026-11-03']);
    expect(h.neqs).toContainEqual(['session_id', 's1']);
  });

  it('offers only 14/18 coaches for a 14/18 slot', async () => {
    renderDialog(session(), 'junior_coach');

    await screen.findAllByTestId('slot-candidate');
    expect(names()).toEqual([
      expect.stringContaining('Jay Coach'),
      expect.stringContaining('Jo Coach'),
    ]);
    expect(screen.getByText('Assign a 14/18 coach')).toBeInTheDocument();
  });

  it('saves the people already on the session plus the pick, and closes', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onAssigned = vi.fn();
    renderDialog(
      session([
        asg('d', 'regular', 'primary'),
        asg('x', 'regular', 'primary', 'absent_pending_sub'),
      ]),
      'regular',
      {
        onClose,
        onAssigned,
      },
    );

    await user.click(await screen.findByRole('button', { name: /Cara Few/ }));

    // a lead exists, so the new trainer assists; the person who is out is not saved
    expect(h.save).toHaveBeenCalledWith('s1', [
      { profile_id: 'd', track: 'regular', session_role: 'primary' },
      { profile_id: 'c', track: 'regular', session_role: 'assistant_coach' },
    ]);
    expect(onAssigned).toHaveBeenCalledWith('Cara Few');
    expect(onClose).toHaveBeenCalled();
  });

  it('makes the first trainer of a session the lead', async () => {
    const user = userEvent.setup();
    renderDialog(session());

    await user.click(await screen.findByRole('button', { name: /Cara Few/ }));
    expect(h.save).toHaveBeenCalledWith('s1', [
      { profile_id: 'c', track: 'regular', session_role: 'primary' },
    ]);
  });

  it('adds a 14/18 coach on the 14/18 track as support', async () => {
    const user = userEvent.setup();
    renderDialog(session([asg('d', 'regular')]), 'junior_coach');

    await user.click(await screen.findByRole('button', { name: /Jo Coach/ }));
    expect(h.save).toHaveBeenCalledWith('s1', [
      { profile_id: 'd', track: 'regular', session_role: 'primary' },
      { profile_id: 'j1', track: 'junior_coach', session_role: 'assistant_coach' },
    ]);
  });

  it('keeps the dialog open and shows the message when saving fails', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    h.save.mockRejectedValue(new Error('assignment_limit_reached'));
    h.saveError = 'The session already has the maximum number of trainers.';
    renderDialog(session(), 'regular', { onClose });

    await user.click(await screen.findByRole('button', { name: /Cara Few/ }));

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('maximum number of trainers');
  });

  it('says so when nobody is available, and when availability cannot be checked', async () => {
    h.busy = ['a', 'b', 'c', 'd', 'f'].map((p) => busyRow(p, '17:30:00', '19:00:00'));
    const { unmount } = renderDialog(session());
    expect(await screen.findByText('Nobody is available for this slot.')).toBeInTheDocument();
    unmount();

    h.busyError = true;
    renderDialog(session());
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not check who is available.');
  });

  it('is in German when the language is German', async () => {
    await i18n.changeLanguage('de');
    renderDialog(session());

    expect(await screen.findByText('Trainer einteilen')).toBeInTheDocument();
    expect(
      within(await screen.findByRole('list', { name: 'Verfügbare Personen' })).getAllByRole(
        'listitem',
      ).length,
    ).toBeGreaterThan(0);
  });
});
