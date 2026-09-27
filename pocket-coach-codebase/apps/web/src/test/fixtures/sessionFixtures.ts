import type { EnrichedSession } from '../../features/sessions/hooks/useSessions';
import type { Profile, EnrichedSessionAssignment } from '@pocket-coach/shared-types';

export function createMockSession(overrides?: Partial<EnrichedSession>): EnrichedSession {
  return {
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
      name: 'Sporthalle Schulhaus Apfelbaum',
      district_area: 'Oerlikon',
      is_active: true,
      created_at: '2026-09-27T00:00:00Z',
    },
    player_groups: [
      {
        id: 'pg-1',
        season_id: 'season-1',
        name: 'Kids / Basic',
        description: null,
        sort_order: 1,
      },
    ],
    ...overrides,
  };
}

export function createMockTrainer(overrides?: Partial<Profile>): Profile {
  return {
    id: 'usr-1',
    display_name: 'Trainer One',
    email: 'trainer1@club.de',
    avatar_url: null,
    specialty: 'Badminton Lead',
    is_junior_coach: false,
    is_active: true,
    preferred_language: 'de',
    calendar_token: null,
    created_at: '2026-09-27T00:00:00Z',
    updated_at: '2026-09-27T00:00:00Z',
    ...overrides,
  };
}

export function createMockAssignment(
  overrides?: Partial<EnrichedSessionAssignment>,
): EnrichedSessionAssignment {
  return {
    id: 'asg-1',
    session_id: 'sess-1',
    profile_id: 'usr-1',
    track: 'regular',
    session_role: 'primary',
    status: 'active',
    is_substitute: false,
    assigned_at: '2026-09-27T00:00:00Z',
    assigned_by: 'usr-admin',
    profile: createMockTrainer(),
    ...overrides,
  };
}
