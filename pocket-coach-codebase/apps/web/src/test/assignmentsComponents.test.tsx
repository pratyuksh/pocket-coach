import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { BulkAssignModal } from '../features/sessions/components/BulkAssignModal';
import type { EnrichedSession } from '../features/sessions/hooks/useSessions';

// Mocks
// Hook mocks must return referentially stable values (like the real hooks backed by
// useState). Returning fresh object/array literals per call can re-trigger effects on every
// render and hang the test run.
const mocks = vi.hoisted(() => ({
  saveAssignments: vi.fn(),
  bulkAssign: vi.fn(),
  trainers: {
    trainers: [
      { id: 'usr-1', display_name: 'Trainer One', email: 'one@club.de', is_junior_coach: false },
      { id: 'usr-2', display_name: 'Coach Alex', email: 'alex@club.de', is_junior_coach: true },
    ],
    loading: false,
    error: null,
  },
  locations: {
    locations: [{ id: 'loc-1', name: 'Sporthalle Borrweg' }],
    loading: false,
  },
  auth: { user: { id: 'usr-admin' } },
}));

const assignTrainerResult = {
  saveAssignments: mocks.saveAssignments,
  loading: false,
  error: null,
};
const bulkAssignResult = { bulkAssign: mocks.bulkAssign, loading: false, error: null };

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: { signInWithOAuth: vi.fn() },
  },
}));

vi.mock('../features/sessions/hooks/useAssignTrainer', () => ({
  useAssignTrainer: () => assignTrainerResult,
}));

vi.mock('../features/sessions/hooks/useBulkAssignTrainer', () => ({
  useBulkAssignTrainer: () => bulkAssignResult,
}));

vi.mock('../features/trainers/hooks/useTrainers', () => ({
  useTrainers: () => mocks.trainers,
}));

vi.mock('../features/locations/hooks/useLocations', () => ({
  useLocations: () => mocks.locations,
}));

vi.mock('../features/trainers/hooks/useTeamStats', () => ({
  EMPTY_STATS: { completed: 0, upcoming: 0 },
  useTeamStats: () => ({ stats: {}, error: false, refetch: () => {} }),
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => mocks.auth,
}));

describe('Sub-Phase 1.4 UI Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.saveAssignments.mockResolvedValue(1);
    mocks.bulkAssign.mockResolvedValue(24);
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
    required_regular: 3,
    required_junior: 1,
    published_at: '2026-09-27T00:00:00Z',
    created_at: '2026-09-27T00:00:00Z',
    location: {
      id: 'loc-1',
      name: 'Sporthalle Borrweg',
      district_area: null,
      address: null,
      trainer_note: null,
      is_active: true,
      created_at: '',
    },
  };

  describe('BulkAssignModal', () => {
    it('renders matching upcoming session count and triggers bulk assign procedure', async () => {
      const onClose = vi.fn();
      render(
        <BulkAssignModal
          isOpen={true}
          onClose={onClose}
          seasonId="season-1"
          sessions={[
            { ...sampleSession, session_date: '2099-01-06' },
            { ...sampleSession, id: 'sess-past', session_date: '2000-01-04' },
          ]}
        />,
      );

      expect(screen.getByText('Bulk assign trainer to season')).toBeInTheDocument();
      expect(screen.getByText(/1 Sessions/i)).toBeInTheDocument();

      const trainerSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(trainerSelect, { target: { value: 'usr-1' } });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Execute Bulk Assign/i }));
      });

      expect(mocks.bulkAssign).toHaveBeenCalledWith({
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

    const asg = (id: string, profile: string, track: 'regular' | 'junior_coach') =>
      ({
        id,
        session_id: 'x',
        profile_id: profile,
        track,
        session_role: 'primary',
        status: 'active',
        is_substitute: false,
        assigned_at: '',
        assigned_by: null,
      }) as never;

    it('does not count sessions that already have the trainers they require', () => {
      const future = '2099-01-06';
      render(
        <BulkAssignModal
          isOpen={true}
          onClose={vi.fn()}
          seasonId="season-1"
          sessions={[
            { ...sampleSession, id: 'open', session_date: future },
            // requires two, has two: full although the global maximum is three
            {
              ...sampleSession,
              id: 'full',
              session_date: future,
              required_regular: 2,
              assignments: [asg('1', 'a', 'regular'), asg('2', 'b', 'regular')],
            },
            // one position left
            {
              ...sampleSession,
              id: 'one-left',
              session_date: future,
              required_regular: 2,
              assignments: [asg('3', 'a', 'regular')],
            },
          ]}
        />,
      );

      expect(screen.getByText(/2 Sessions/i)).toBeInTheDocument();
    });

    it('does not count sessions the chosen trainer is already on, and uses the 14/18 target for a 14/18 coach', () => {
      const future = '2099-01-06';
      render(
        <BulkAssignModal
          isOpen={true}
          onClose={vi.fn()}
          seasonId="season-1"
          sessions={[
            {
              ...sampleSession,
              id: 'a',
              session_date: future,
              assignments: [asg('1', 'usr-1', 'regular')],
            },
            { ...sampleSession, id: 'b', session_date: future },
            { ...sampleSession, id: 'c', session_date: future, required_junior: 0 },
          ]}
        />,
      );

      fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'usr-1' } });
      expect(screen.getByText(/2 Sessions/i)).toBeInTheDocument();

      // Coach Alex works the 14/18 track; session c requires no 14/18 coach
      fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'usr-2' } });
      expect(screen.getByText(/2 Sessions/i)).toBeInTheDocument();
    });

    it('reports how many sessions the trainer was added to', async () => {
      const onSuccess = vi.fn();
      render(
        <BulkAssignModal
          isOpen={true}
          onClose={vi.fn()}
          seasonId="season-1"
          sessions={[{ ...sampleSession, session_date: '2099-01-06' }]}
          onSuccess={onSuccess}
        />,
      );

      fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'usr-1' } });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Execute Bulk Assign/i }));
      });

      expect(onSuccess).toHaveBeenCalledWith(24, 'Trainer One');
    });
  });
});
