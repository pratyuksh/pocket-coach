import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAssignTrainer } from '../features/sessions/hooks/useAssignTrainer';
import { useBulkAssignTrainer } from '../features/sessions/hooks/useBulkAssignTrainer';
import { createMockTrainer } from './fixtures/sessionFixtures';

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
});
