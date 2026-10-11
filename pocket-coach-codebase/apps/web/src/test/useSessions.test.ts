import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSessions } from '../features/sessions/hooks/useSessions';
import { query, routeFrom } from './fixtures/supabaseMock';

const mocks = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));
vi.mock('../lib/supabase', () => ({ supabase: { from: mocks.from, rpc: mocks.rpc } }));

const rawSession = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  season_id: 'season-1',
  session_date: '2026-11-03',
  day_of_week: 2,
  start_time: '17:30:00',
  end_time: '19:00:00',
  published_at: null,
  location: { id: 'loc-1', name: 'Borrweg' },
  session_player_groups: [
    { player_group: { id: 'g-1', name: 'Kids / Basic' } },
    { player_group: null },
  ],
  assignments: [{ id: 'a-1', profile_id: 'p-1', profile: { id: 'p-1', display_name: 'Max' } }],
  ...extra,
});

describe('useSessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads sessions and flattens joined player groups, assignments and hall', async () => {
    const q = query({
      data: [
        rawSession('s-1'),
        rawSession('s-2', { location: null, assignments: [{ id: 'a-2', profile: null }] }),
      ],
    });
    mocks.from.mockImplementation(routeFrom({ sessions: q }));

    const { result } = renderHook(() => useSessions({ seasonId: 'season-1' }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(q.order).toHaveBeenCalledWith('session_date', { ascending: true });
    expect(result.current.sessions).toHaveLength(2);
    const first = result.current.sessions[0];
    expect(first.location?.name).toBe('Borrweg');
    expect(first.player_groups).toEqual([{ id: 'g-1', name: 'Kids / Basic' }]); // empty join rows dropped
    expect(first.assignments?.[0].profile?.display_name).toBe('Max');
    expect(result.current.sessions[1].location).toBeNull();
    expect(result.current.sessions[1].assignments?.[0].profile).toBeNull();
  });

  it('applies the season, hall, weekday and month filters', async () => {
    const q = query({ data: [] });
    mocks.from.mockImplementation(routeFrom({ sessions: q }));

    const { result } = renderHook(() =>
      useSessions({ seasonId: 'season-1', locationId: 'loc-1', dayOfWeek: 0, month: '2026-02' }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(q.eq).toHaveBeenCalledWith('season_id', 'season-1');
    expect(q.eq).toHaveBeenCalledWith('location_id', 'loc-1');
    expect(q.eq).toHaveBeenCalledWith('day_of_week', 0); // Sunday (0) is a valid filter
    expect(q.gte).toHaveBeenCalledWith('session_date', '2026-02-01');
    expect(q.lte).toHaveBeenCalledWith('session_date', '2026-02-28'); // not a leap year
  });

  it('reloads when the filters change', async () => {
    const q = query({ data: [] });
    mocks.from.mockImplementation(routeFrom({ sessions: q }));

    const { result } = renderHook(() => useSessions({ seasonId: 'season-1' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const callsBefore = mocks.from.mock.calls.length;

    act(() => result.current.setFilters({ seasonId: 'season-2' }));
    await waitFor(() => expect(mocks.from.mock.calls.length).toBeGreaterThan(callsBefore));
    expect(q.eq).toHaveBeenCalledWith('season_id', 'season-2');
  });

  it('reports a failed load', async () => {
    mocks.from.mockImplementation(
      routeFrom({ sessions: query({ error: { message: 'offline' } }) }),
    );

    const { result } = renderHook(() => useSessions());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('offline');
    expect(result.current.sessions).toEqual([]);
  });

  describe('publishing', () => {
    beforeEach(() => {
      mocks.from.mockImplementation(routeFrom({ sessions: query({ data: [rawSession('s-1')] }) }));
    });

    it('publishRange calls publish_sessions, reloads and returns the count', async () => {
      mocks.rpc.mockResolvedValue({ data: { published: 3 }, error: null });
      const { result } = renderHook(() => useSessions({ seasonId: 'season-1' }));
      await waitFor(() => expect(result.current.loading).toBe(false));
      const loadsBefore = mocks.from.mock.calls.length;

      let n = 0;
      await act(async () => {
        n = await result.current.publishRange('season-1', '2026-11-01', '2026-11-30');
      });

      expect(mocks.rpc).toHaveBeenCalledWith('publish_sessions', {
        p_season_id: 'season-1',
        p_from: '2026-11-01',
        p_to: '2026-11-30',
      });
      expect(n).toBe(3);
      expect(mocks.from.mock.calls.length).toBeGreaterThan(loadsBefore);
    });

    it('unpublishRange returns how many were unpublished and skipped', async () => {
      mocks.rpc.mockResolvedValue({ data: { unpublished: 2, skipped: 1 }, error: null });
      const { result } = renderHook(() => useSessions({ seasonId: 'season-1' }));
      await waitFor(() => expect(result.current.loading).toBe(false));

      let outcome: { unpublished: number; skipped: number } | undefined;
      await act(async () => {
        outcome = await result.current.unpublishRange('season-1', '2026-11-01', '2026-11-30');
      });

      expect(mocks.rpc).toHaveBeenCalledWith('unpublish_sessions', expect.any(Object));
      expect(outcome).toEqual({ unpublished: 2, skipped: 1 });
    });

    it('translates a permission error into a readable message', async () => {
      mocks.rpc.mockResolvedValue({
        data: null,
        error: { message: 'not_authorized', code: '42501' },
      });
      const { result } = renderHook(() => useSessions({ seasonId: 'season-1' }));
      await waitFor(() => expect(result.current.loading).toBe(false));

      let caught: Error | undefined;
      await act(async () => {
        await result.current
          .publishRange('season-1', '2026-11-01', '2026-11-30')
          .catch((e: Error) => {
            caught = e;
          });
      });

      expect(caught?.message).toBe('You do not have permission to do this.');
      expect(result.current.error).toBe('You do not have permission to do this.');
    });
  });

  it('saves an override, marks the session overridden and updates it in place', async () => {
    const update = query({
      data: rawSession('s-1', { start_time: '18:00:00', is_time_overridden: true }),
    });
    mocks.from.mockImplementation(
      routeFrom({ sessions: [query({ data: [rawSession('s-1'), rawSession('s-2')] }), update] }),
    );

    const { result } = renderHook(() => useSessions({ seasonId: 'season-1' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.updateSessionOverride('s-1', { start_time: '18:00:00' });
    });

    expect(update.update).toHaveBeenCalledWith({
      start_time: '18:00:00',
      is_time_overridden: true,
    });
    expect(update.eq).toHaveBeenCalledWith('id', 's-1');
    expect(result.current.sessions.find((s) => s.id === 's-1')?.start_time).toBe('18:00:00');
    expect(result.current.sessions).toHaveLength(2);
  });

  it('removes a deleted session and keeps it when deleting fails', async () => {
    mocks.from.mockImplementation(
      routeFrom({
        sessions: [
          query({ data: [rawSession('s-1'), rawSession('s-2')] }),
          query({}),
          query({ error: { message: 'denied' } }),
        ],
      }),
    );

    const { result } = renderHook(() => useSessions({ seasonId: 'season-1' }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.deleteSession('s-1');
    });
    expect(result.current.sessions.map((s) => s.id)).toEqual(['s-2']);

    await act(async () => {
      await result.current.deleteSession('s-2').catch(() => {});
    });
    expect(result.current.error).toBe('denied');
    expect(result.current.sessions.map((s) => s.id)).toEqual(['s-2']);
  });
});
