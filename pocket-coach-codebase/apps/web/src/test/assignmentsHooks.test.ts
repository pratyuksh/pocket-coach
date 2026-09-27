import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSessionAssignments } from '../features/sessions/hooks/useSessionAssignments';
import { useAssignTrainer } from '../features/sessions/hooks/useAssignTrainer';
import { useBulkAssignTrainer } from '../features/sessions/hooks/useBulkAssignTrainer';
import { useMySessions } from '../features/sessions/hooks/useMySessions';
import { usePersonalStats } from '../features/sessions/hooks/usePersonalStats';
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
    it('assigns trainer by inserting a new record if none exists', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'asg-new',
                session_id: 'sess-1',
                profile_id: 'usr-2',
                track: 'regular',
                session_role: 'primary',
                profile: { id: 'usr-2', display_name: 'Coach Alex' },
              },
              error: null,
            }),
          }),
        }),
      });

      const { result } = renderHook(() => useAssignTrainer());

      let createdAssignment: any;
      await act(async () => {
        createdAssignment = await result.current.assignTrainer({
          session_id: 'sess-1',
          profile_id: 'usr-2',
          track: 'regular',
          session_role: 'primary',
        });
      });

      expect(createdAssignment.id).toBe('asg-new');
      expect(createdAssignment.profile.display_name).toBe('Coach Alex');
    });

    it('updates an existing assignment if one already exists for session & track', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'asg-existing' }, error: null }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'asg-existing',
                  session_id: 'sess-1',
                  profile_id: 'usr-3',
                  track: 'regular',
                  session_role: 'primary',
                  profile: { id: 'usr-3', display_name: 'Coach Taylor' },
                },
                error: null,
              }),
            }),
          }),
        }),
      });

      const { result } = renderHook(() => useAssignTrainer());

      let updatedAssignment: any;
      await act(async () => {
        updatedAssignment = await result.current.assignTrainer({
          session_id: 'sess-1',
          profile_id: 'usr-3',
          track: 'regular',
          session_role: 'primary',
        });
      });

      expect(updatedAssignment.id).toBe('asg-existing');
      expect(updatedAssignment.profile.display_name).toBe('Coach Taylor');
    });

    it('removes an assignment when removeAssignment is called', async () => {
      mockSupabaseFrom.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      const { result } = renderHook(() => useAssignTrainer());

      await act(async () => {
        await result.current.removeAssignment('asg-1');
      });

      expect(mockSupabaseFrom).toHaveBeenCalledWith('session_assignments');
    });

    it('captures error when assignment update fails', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'RLS Permission Denied' },
            }),
          }),
        }),
      });

      const { result } = renderHook(() => useAssignTrainer());

      let caughtErr: any = null;
      await act(async () => {
        try {
          await result.current.assignTrainer({
            session_id: 'sess-1',
            profile_id: 'usr-2',
            track: 'regular',
            session_role: 'primary',
          });
        } catch (err) {
          caughtErr = err;
        }
      });

      expect(caughtErr?.message).toBe('RLS Permission Denied');
      expect(result.current.error).toBe('RLS Permission Denied');
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

  describe('usePersonalStats', () => {
    it('calculates completed vs total assigned sessions correctly', async () => {
      const mockAssignmentsData = [
        {
          id: 'asg-1',
          session_role: 'primary',
          status: 'active',
          session: { session_date: '2020-01-01' }, // Past date
        },
        {
          id: 'asg-2',
          session_role: 'assistant_coach',
          status: 'active',
          session: { session_date: '2099-12-31' }, // Future date
        },
      ];

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockAssignmentsData, error: null }),
      });

      const { result } = renderHook(() => usePersonalStats('usr-1'));

      await act(async () => {});

      expect(result.current.stats.total_assigned_sessions).toBe(2);
      expect(result.current.stats.completed_sessions).toBe(1);
      expect(result.current.stats.primary_role_count).toBe(1);
      expect(result.current.stats.assistant_role_count).toBe(1);
    });

    it('handles zero assignments gracefully without crashing', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      const { result } = renderHook(() => usePersonalStats('usr-zero'));

      await act(async () => {});

      expect(result.current.stats.total_assigned_sessions).toBe(0);
      expect(result.current.stats.completed_sessions).toBe(0);
      expect(result.current.stats.primary_role_count).toBe(0);
      expect(result.current.stats.assistant_role_count).toBe(0);
    });
  });
});
