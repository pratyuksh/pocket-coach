import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSeasons } from '../features/seasons/hooks/useSeasons';
import { query, routeFrom } from './fixtures/supabaseMock';

const mocks = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));
vi.mock('../lib/supabase', () => ({ supabase: { from: mocks.from, rpc: mocks.rpc } }));

const seasonA = {
  id: 's-1',
  name: 'Season A',
  start_date: '2026-08-01',
  end_date: '2027-07-31',
  is_active: false,
};
const seasonB = {
  id: 's-2',
  name: 'Season B',
  start_date: '2025-08-01',
  end_date: '2026-07-31',
  is_active: true,
};

const input = {
  name: '  New Season ',
  start_date: '2027-02-01',
  end_date: '2027-02-14',
  is_active: true,
  player_groups: [{ name: 'Kids / Basic', sort_order: 1 }],
  slots: [
    {
      day_of_week: 3,
      default_start_time: '17:30:00',
      default_end_time: '18:30:00',
      location_id: 'loc-1',
      player_group_names: ['Kids / Basic'],
      required_regular: 2,
      required_junior: 1,
    },
  ],
};

describe('useSeasons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads seasons and selects the active one', async () => {
    mocks.from.mockImplementation(
      routeFrom({
        seasons: query({ data: [seasonA, seasonB] }),
        season_templates: query({ data: [{ id: 't-1', name: 'Standard' }] }),
      }),
    );

    const { result } = renderHook(() => useSeasons());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.seasons).toHaveLength(2);
    expect(result.current.activeSeason?.id).toBe('s-2');
    expect(result.current.templates).toHaveLength(1);
  });

  it('falls back to the first season when none is active', async () => {
    mocks.from.mockImplementation(
      routeFrom({ seasons: query({ data: [seasonA] }), season_templates: query({ data: [] }) }),
    );

    const { result } = renderHook(() => useSeasons());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.activeSeason?.id).toBe('s-1');
  });

  it('reports a failed load', async () => {
    mocks.from.mockImplementation(
      routeFrom({
        seasons: query({ error: { message: 'boom' } }),
        season_templates: query({ data: [] }),
      }),
    );

    const { result } = renderHook(() => useSeasons());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('boom');
    expect(result.current.seasons).toEqual([]);
  });

  describe('createSeason', () => {
    beforeEach(() => {
      mocks.from.mockImplementation(
        routeFrom({
          seasons: [
            query({ data: [seasonB] }), // initial list
            query({ data: { ...seasonA, id: 's-new', name: 'New Season' } }), // fetch by id
            query({ data: [seasonB] }), // refetch
          ],
          season_templates: query({ data: [] }),
        }),
      );
    });

    it('creates the whole season with one create_season call', async () => {
      mocks.rpc.mockResolvedValue({ data: { season_id: 's-new', generated: 4 }, error: null });

      const { result } = renderHook(() => useSeasons());
      await waitFor(() => expect(result.current.loading).toBe(false));

      let created: Awaited<ReturnType<typeof result.current.createSeason>> | undefined;
      await act(async () => {
        created = await result.current.createSeason(input);
      });

      expect(mocks.rpc).toHaveBeenCalledTimes(1);
      expect(mocks.rpc).toHaveBeenCalledWith('create_season', {
        p_name: 'New Season',
        p_start_date: '2027-02-01',
        p_end_date: '2027-02-14',
        p_is_active: true,
        p_groups: [{ name: 'Kids / Basic', description: '', sort_order: 1 }],
        p_slots: [
          {
            day_of_week: 3,
            default_start_time: '17:30:00',
            default_end_time: '18:30:00',
            location_id: 'loc-1',
            player_group_names: ['Kids / Basic'],
            required_regular: 2,
            required_junior: 1,
          },
        ],
      });
      expect(created?.season.id).toBe('s-new');
      expect(created?.generatedCount).toBe(4);
    });

    it('defaults to an active season when is_active is omitted', async () => {
      mocks.rpc.mockResolvedValue({ data: { season_id: 's-new', generated: 0 }, error: null });

      const { result } = renderHook(() => useSeasons());
      await waitFor(() => expect(result.current.loading).toBe(false));
      await act(async () => {
        await result.current.createSeason({ ...input, is_active: undefined });
      });

      expect(mocks.rpc.mock.calls[0][1].p_is_active).toBe(true);
    });

    it('turns a database error code into a readable message and writes nothing else', async () => {
      mocks.rpc.mockResolvedValue({
        data: null,
        error: { message: 'invalid_range', code: '22023' },
      });

      const { result } = renderHook(() => useSeasons());
      await waitFor(() => expect(result.current.loading).toBe(false));

      let caught: Error | undefined;
      await act(async () => {
        await result.current.createSeason(input).catch((e: Error) => {
          caught = e;
        });
      });

      expect(caught?.message).toBe('The date range is not valid.');
      expect(result.current.error).toBe('The date range is not valid.');
      // The browser performs no separate writes that could leave a half-built season
      expect(mocks.rpc).toHaveBeenCalledTimes(1);
      const writes = mocks.from.mock.results
        .map((r) => r.value)
        .filter((q) => q.insert.mock.calls.length || q.update.mock.calls.length);
      expect(writes).toHaveLength(0);
    });
  });

  it('deletes a season and reloads the list', async () => {
    const del = query({});
    mocks.from.mockImplementation(
      routeFrom({
        seasons: [query({ data: [seasonA] }), del, query({ data: [] })],
        season_templates: query({ data: [] }),
      }),
    );

    const { result } = renderHook(() => useSeasons());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.deleteSeason('s-1');
    });

    expect(del.delete).toHaveBeenCalled();
    expect(del.eq).toHaveBeenCalledWith('id', 's-1');
    await waitFor(() => expect(result.current.seasons).toEqual([]));
  });

  it('keeps the season and reports the error when deleting fails', async () => {
    mocks.from.mockImplementation(
      routeFrom({
        seasons: [query({ data: [seasonA] }), query({ error: { message: 'no permission' } })],
        season_templates: query({ data: [] }),
      }),
    );

    const { result } = renderHook(() => useSeasons());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.deleteSeason('s-1').catch(() => {});
    });

    expect(result.current.error).toBe('no permission');
    expect(result.current.seasons).toHaveLength(1);
  });

  it('generateSessions returns the generated count', async () => {
    mocks.from.mockImplementation(
      routeFrom({ seasons: query({ data: [] }), season_templates: query({ data: [] }) }),
    );
    mocks.rpc.mockResolvedValue({ data: 12, error: null });

    const { result } = renderHook(() => useSeasons());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let n = 0;
    await act(async () => {
      n = await result.current.generateSessions('s-1');
    });

    expect(mocks.rpc).toHaveBeenCalledWith('generate_season_sessions', { p_season_id: 's-1' });
    expect(n).toBe(12);
  });
});
