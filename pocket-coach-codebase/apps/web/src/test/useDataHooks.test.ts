import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTrainers } from '../features/trainers/hooks/useTrainers';
import { useLocations } from '../features/locations/hooks/useLocations';
import { query, routeFrom } from './fixtures/supabaseMock';

const mocks = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('../lib/supabase', () => ({ supabase: { from: mocks.from } }));

describe('useTrainers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads active trainers sorted by name', async () => {
    const q = query({
      data: [
        { id: 'p-1', display_name: 'Anna' },
        { id: 'p-2', display_name: 'Ben' },
      ],
    });
    mocks.from.mockImplementation(routeFrom({ profiles: q }));

    const { result } = renderHook(() => useTrainers());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(q.eq).toHaveBeenCalledWith('is_active', true);
    expect(q.order).toHaveBeenCalledWith('display_name', { ascending: true });
    expect(result.current.trainers.map((t) => t.display_name)).toEqual(['Anna', 'Ben']);
  });

  it('reports an error and returns an empty list', async () => {
    mocks.from.mockImplementation(routeFrom({ profiles: query({ error: { message: 'denied' } }) }));

    const { result } = renderHook(() => useTrainers());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('denied');
    expect(result.current.trainers).toEqual([]);
  });
});

describe('useLocations', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads halls sorted by name', async () => {
    const q = query({ data: [{ id: 'l-1', name: 'Borrweg' }] });
    mocks.from.mockImplementation(routeFrom({ locations: q }));

    const { result } = renderHook(() => useLocations());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(q.order).toHaveBeenCalledWith('name', { ascending: true });
    expect(result.current.locations).toHaveLength(1);
  });

  it('adds a hall with trimmed values and keeps the list sorted', async () => {
    const insert = query({ data: { id: 'l-2', name: 'Aeschbach' } });
    mocks.from.mockImplementation(
      routeFrom({ locations: [query({ data: [{ id: 'l-1', name: 'Borrweg' }] }), insert] }),
    );

    const { result } = renderHook(() => useLocations());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.addLocation('  Aeschbach ', ' Zürich ', {
        address: ' Weg 1 ',
        trainer_note: '',
      });
    });

    expect(insert.insert).toHaveBeenCalledWith([
      { name: 'Aeschbach', district_area: 'Zürich', address: 'Weg 1', trainer_note: null },
    ]);
    expect(result.current.locations.map((l) => l.name)).toEqual(['Aeschbach', 'Borrweg']);
  });

  it('updates a hall in place', async () => {
    mocks.from.mockImplementation(
      routeFrom({
        locations: [
          query({ data: [{ id: 'l-1', name: 'Borrweg', address: null }] }),
          query({ data: { id: 'l-1', name: 'Borrweg', address: 'Borrweg 80' } }),
        ],
      }),
    );

    const { result } = renderHook(() => useLocations());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.updateLocation('l-1', { address: 'Borrweg 80' });
    });

    expect(result.current.locations[0].address).toBe('Borrweg 80');
  });

  it('reports a failed add and rethrows', async () => {
    mocks.from.mockImplementation(
      routeFrom({ locations: [query({ data: [] }), query({ error: { message: 'duplicate' } })] }),
    );

    const { result } = renderHook(() => useLocations());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let thrown = false;
    await act(async () => {
      await result.current.addLocation('X').catch(() => {
        thrown = true;
      });
    });

    expect(thrown).toBe(true);
    expect(result.current.error).toBe('duplicate');
    expect(result.current.locations).toEqual([]);
  });
});
