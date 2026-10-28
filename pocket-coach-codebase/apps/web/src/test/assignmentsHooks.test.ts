import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSessionAssignments } from '../features/sessions/hooks/useSessionAssignments';
import { useAssignTrainer } from '../features/sessions/hooks/useAssignTrainer';
import { useBulkAssignTrainer } from '../features/sessions/hooks/useBulkAssignTrainer';
import { useMySessions } from '../features/sessions/hooks/useMySessions';
import { createMockAssignment, createMockTrainer } from './fixtures/sessionFixtures';

// Mock Supabase
const mockSupabaseFrom = vi.fn();
const mockSupabaseRpc = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (...args: any[]) => mockSupabaseFrom(...args),
    rpc: (...args: any[]) => mockSupabaseRpc(...args),
  },
}));

// Mock useAuth
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'usr-1' },
    profile: createMockTrainer(),
  }),
}));

describe('Sub-Phase 1.4 Custom React Data Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useSessionAssignments', () => {
    it('fetches assignments with joined profile for given session ID', async () => {
      const mockAssignmentsData = [createMockAssignment({ session_id: 'sess-100' })];

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockAssignmentsData, error: null }),
      });

      const { result } = renderHook(() => useSessionAssignments('sess-100'));

      await act(async () => {});

      expect(mockSupabaseFrom).toHaveBeenCalledWith('session_assignments');
      expect(result.current.assignments.length).toBe(1);
      expect(result.current.assignments[0].profile?.display_name).toBe('Trainer One');
    });

    it('reports loading from the first render when the session changes', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      const seen: boolean[] = [];
      const { rerender } = renderHook(
        ({ id }: { id?: string }) => {
          const r = useSessionAssignments(id);
          seen.push(r.loading);
          return r;
        },
        { initialProps: { id: undefined as string | undefined } },
      );
      await act(async () => {});
      expect(seen[seen.length - 1]).toBe(false); // nothing to load without a session

      seen.length = 0;
      rerender({ id: 'sess-2' });
      // The render caused by the new id must already say "loading"
      expect(seen[0]).toBe(true);
      await act(async () => {});
      expect(seen[seen.length - 1]).toBe(false);
    });

    it('sets error state when fetching assignments fails', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi
          .fn()
          .mockResolvedValue({ data: null, error: { message: 'Database query failed' } }),
      });

      const { result } = renderHook(() => useSessionAssignments('sess-err'));

      await act(async () => {});

      expect(result.current.error).toBe('Database query failed');
      expect(result.current.assignments.length).toBe(0);
    });
  });

  describe('useAssignTrainer', () => {
    const rows = [
      { profile_id: 'usr-2', track: 'regular' as const, session_role: 'primary' as const },
      { profile_id: 'usr-3', track: 'regular' as const, session_role: 'assistant_coach' as const },
    ];

    it('saves the whole assignee list with one set_session_assignments call', async () => {
      mockSupabaseRpc.mockResolvedValue({ data: 2, error: null });

      const { result } = renderHook(() => useAssignTrainer());

      let count: number | undefined;
      await act(async () => {
        count = await result.current.saveAssignments('sess-1', rows);
      });

      expect(mockSupabaseRpc).toHaveBeenCalledWith('set_session_assignments', {
        p_session_id: 'sess-1',
        p_rows: rows,
      });
      expect(count).toBe(2);
      expect(result.current.error).toBeNull();
    });

    it('translates a database error code into a readable message', async () => {
      mockSupabaseRpc.mockResolvedValue({
        data: null,
        error: { message: 'assignment_limit_reached', code: '23514' },
      });

      const { result } = renderHook(() => useAssignTrainer());

      let caught: Error | null = null;
      await act(async () => {
        try {
          await result.current.saveAssignments('sess-1', rows);
        } catch (err) {
          caught = err as Error;
        }
      });

      expect(caught).not.toBeNull();
      expect((caught as unknown as Error).message).toMatch(/maximum number of trainers/);
      expect(result.current.error).toMatch(/maximum number of trainers/);
    });

    it('reports a duplicate trainer from the unique active-assignment index', async () => {
      mockSupabaseRpc.mockResolvedValue({
        data: null,
        error: { message: 'assignment_duplicate', code: '23505' },
      });

      const { result } = renderHook(() => useAssignTrainer());

      await act(async () => {
        await result.current.saveAssignments('sess-1', rows).catch(() => {});
      });

      expect(result.current.error).toBe('This trainer is already assigned to this session.');
    });
  });

  describe('useBulkAssignTrainer', () => {
    it('calls bulk_assign_trainer RPC with correct payload', async () => {
      mockSupabaseRpc.mockResolvedValue({ data: 12, error: null });

      const { result } = renderHook(() => useBulkAssignTrainer());

      let count = 0;
      await act(async () => {
        count = await result.current.bulkAssign({
          season_id: 'season-1',
          profile_id: 'usr-1',
          day_of_week: 2,
          track: 'regular',
          session_role: 'primary',
        });
      });

      expect(mockSupabaseRpc).toHaveBeenCalledWith('bulk_assign_trainer', {
        p_season_id: 'season-1',
        p_profile_id: 'usr-1',
        p_day_of_week: 2,
        p_location_id: null,
        p_track: 'regular',
        p_session_role: 'primary',
        p_assigned_by: null,
      });
      expect(count).toBe(12);
    });

    it('captures RPC errors when bulk assignment fails', async () => {
      mockSupabaseRpc.mockResolvedValue({ data: null, error: { message: 'Procedure error' } });

      const { result } = renderHook(() => useBulkAssignTrainer());

      let caughtErr: any = null;
      await act(async () => {
        try {
          await result.current.bulkAssign({
            season_id: 'season-1',
            profile_id: 'usr-1',
          });
        } catch (err) {
          caughtErr = err;
        }
      });

      expect(caughtErr?.message).toBe('Procedure error');
      expect(result.current.error).toBe('Procedure error');
    });
  });

  describe('useMySessions', () => {
    it('queries assignments for logged-in user and sorts chronologically', async () => {
      const mockUserAssignments = [
        {
          id: 'asg-1',
          track: 'regular',
          session_role: 'primary',
          status: 'active',
          is_substitute: false,
          assigned_at: '2026-09-27T00:00:00Z',
          session: {
            id: 'sess-2',
            session_date: '2026-10-10',
            start_time: '18:00:00',
            end_time: '19:30:00',
            location: { name: 'Borrweg' },
          },
        },
        {
          id: 'asg-2',
          track: 'regular',
          session_role: 'primary',
          status: 'active',
          is_substitute: false,
          assigned_at: '2026-09-27T00:00:00Z',
          session: {
            id: 'sess-1',
            session_date: '2026-10-06',
            start_time: '17:30:00',
            end_time: '19:00:00',
            location: { name: 'Apfelbaum' },
          },
        },
      ];

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockUserAssignments, error: null }),
      });

      const { result } = renderHook(() => useMySessions());

      await act(async () => {});

      expect(result.current.mySessions.length).toBe(2);
      expect(result.current.mySessions[0].session.session_date).toBe('2026-10-06');
      expect(result.current.mySessions[1].session.session_date).toBe('2026-10-10');
    });
  });
});
