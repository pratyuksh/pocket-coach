import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SessionAssigneeModal } from '../features/sessions/components/SessionAssigneeModal';
import { BulkAssignModal } from '../features/sessions/components/BulkAssignModal';
import { MySessionsList } from '../features/sessions/components/MySessionsList';
import { PersonalStatsCard } from '../features/sessions/components/PersonalStatsCard';
import type { EnrichedSession } from '../features/sessions/hooks/useSessions';

// Mocks
const mockAssignTrainer = vi.fn().mockResolvedValue({ id: 'asg-1' });
const mockRemoveAssignment = vi.fn().mockResolvedValue(undefined);
const mockBulkAssign = vi.fn().mockResolvedValue(24);

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: { signInWithOAuth: vi.fn() },
  },
}));

vi.mock('../features/sessions/hooks/useSessionAssignments', () => ({
  useSessionAssignments: () => ({
    assignments: [],
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('../features/sessions/hooks/useAssignTrainer', () => ({
  useAssignTrainer: () => ({
    assignTrainer: mockAssignTrainer,
    removeAssignment: mockRemoveAssignment,
    loading: false,
    error: null,
  }),
}));

vi.mock('../features/sessions/hooks/useBulkAssignTrainer', () => ({
  useBulkAssignTrainer: () => ({
    bulkAssign: mockBulkAssign,
    loading: false,
    error: null,
  }),
}));

vi.mock('../features/trainers/hooks/useTrainers', () => ({
  useTrainers: () => ({
    trainers: [
      { id: 'usr-1', display_name: 'Trainer One', email: 'one@club.de', is_junior_coach: false },
      { id: 'usr-2', display_name: 'Coach Alex', email: 'alex@club.de', is_junior_coach: true },
    ],
    loading: false,
    error: null,
  }),
}));

vi.mock('../features/locations/hooks/useLocations', () => ({
  useLocations: () => ({
    locations: [{ id: 'loc-1', name: 'Sporthalle Borrweg' }],
    loading: false,
  }),
}));

vi.mock('../features/sessions/hooks/useMySessions', () => ({
  useMySessions: () => ({
    mySessions: [
      {
        assignment_id: 'asg-1',
        track: 'regular',
        session_role: 'primary',
        status: 'active',
        is_substitute: false,
        assigned_at: '2026-09-27T00:00:00Z',
        session: {
          id: 'sess-1',
          session_date: '2026-10-06',
          day_of_week: 2,
          start_time: '17:30:00',
          end_time: '19:00:00',
          location: { name: 'Sporthalle Apfelbaum' },
          player_groups: [{ id: 'pg-1', name: 'Kids / Basic' }],
        },
      },
    ],
    loading: false,
    error: null,
  }),
}));

vi.mock('../features/sessions/hooks/usePersonalStats', () => ({
  usePersonalStats: () => ({
    stats: {
      completed_sessions: 14,
      total_assigned_sessions: 36,
      primary_role_count: 30,
      assistant_role_count: 6,
    },
    loading: false,
    error: null,
  }),
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'usr-admin' },
  }),
}));

describe('Sub-Phase 1.4 UI Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const sampleSession: EnrichedSession = {
    id: 'sess-1',
    season_id: 'season-1',
    block_week_id: null,
    session_date: '2026-10-06',
    day_of_week: 2,
    start_time: '17:30:00',
    end_time: '19:00:00',
    location_id: 'loc-1',
    is_time_overridden: false,
    created_at: '2026-09-27T00:00:00Z',
    location: {
      id: 'loc-1',
      name: 'Sporthalle Borrweg',
      district_area: null,
      is_active: true,
      created_at: '',
    },
  };

  describe('SessionAssigneeModal', () => {
    it('renders session details and dropdowns for trainer assignment', () => {
      render(<SessionAssigneeModal session={sampleSession} isOpen={true} onClose={vi.fn()} />);

      expect(screen.getByText('Assign Trainers to Session')).toBeInTheDocument();
      expect(screen.getByText(/2026-10-06/i)).toBeInTheDocument();
      expect(screen.getByText('Lead Coach (Primary)')).toBeInTheDocument();
    });

    it('submits trainer assignments on Save click', async () => {
      const onClose = vi.fn();
      render(<SessionAssigneeModal session={sampleSession} isOpen={true} onClose={onClose} />);

      const trainerSelect = screen.getAllByRole('combobox')[1];
      fireEvent.change(trainerSelect, { target: { value: 'usr-1' } });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Save Assignments/i }));
      });

      expect(mockAssignTrainer).toHaveBeenCalledWith({
        session_id: 'sess-1',
        profile_id: 'usr-1',
        track: 'regular',
        session_role: 'primary',
        assigned_by: 'usr-admin',
      });
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('BulkAssignModal', () => {
    it('renders matching session count and triggers bulk assign procedure', async () => {
      const onClose = vi.fn();
      render(
        <BulkAssignModal
          isOpen={true}
          onClose={onClose}
          seasonId="season-1"
          sessions={[sampleSession]}
        />,
      );

      expect(screen.getByText('Bulk Assign Trainer to Season')).toBeInTheDocument();
      expect(screen.getByText(/1 Sessions/i)).toBeInTheDocument();

      const trainerSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(trainerSelect, { target: { value: 'usr-1' } });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Execute Bulk Assign/i }));
      });

      expect(mockBulkAssign).toHaveBeenCalledWith({
        season_id: 'season-1',
        profile_id: 'usr-1',
        day_of_week: null,
        location_id: null,
        track: 'regular',
        session_role: 'primary',
        assigned_by: 'usr-admin',
      });
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('MySessionsList', () => {
    it('renders personal schedule cards with date, hall, and role badges', () => {
      render(<MySessionsList />);

      expect(screen.getByText(/Your Assigned Sessions \(1\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Tuesday, 2026-10-06/i)).toBeInTheDocument();
      expect(screen.getByText(/Sporthalle Apfelbaum/i)).toBeInTheDocument();
      expect(screen.getByText(/Primary Lead Trainer/i)).toBeInTheDocument();
    });
  });

  describe('PersonalStatsCard', () => {
    it('renders performance metrics tiles (Completed, Total, Role breakdown)', () => {
      render(<PersonalStatsCard profileId="usr-1" />);

      expect(screen.getByText('14')).toBeInTheDocument(); // Completed
      expect(screen.getByText('36')).toBeInTheDocument(); // Total
      expect(screen.getByText('30')).toBeInTheDocument(); // Primary count
      expect(screen.getByText('6')).toBeInTheDocument(); // Assistant count
    });
  });
});
