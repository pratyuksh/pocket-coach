import type { UserRole, AssignmentTrack, SessionRole, AssignmentStatus } from './roles.js';
import type { SurveyStatus, ResponseState, SubstitutionStatus } from './availability.js';

export interface Profile {
  id: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
  specialty: string | null;
  is_junior_coach: boolean;
  is_active: boolean;
  preferred_language: 'en' | 'de';
  calendar_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRoleRecord {
  id: string;
  profile_id: string;
  role: UserRole;
  granted_at: string;
  granted_by: string | null;
}

export interface DeviceToken {
  id: string;
  profile_id: string;
  token: string;
  platform: 'web' | 'android' | 'ios';
  created_at: string;
  updated_at: string;
}

export interface Season {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
}

export interface TrainingDay {
  id: string;
  season_id: string;
  day_of_week: number; // 0=Sun .. 6=Sat
  default_start_time: string;
  default_end_time: string;
}

export interface TrainingDayPlayerGroup {
  id: string;
  training_day_id: string;
  player_group_id: string;
}

export interface PlayerGroup {
  id: string;
  season_id: string;
  name: string;
  description: string | null;
  sort_order: number;
}

export interface Session {
  id: string;
  season_id: string;
  block_week_id: string | null; // Nullable Phase 2 extension
  session_date: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_time_overridden: boolean;
  created_at: string;
}

export interface SessionPlayerGroup {
  id: string;
  session_id: string;
  player_group_id: string;
}

export interface SessionAssignment {
  id: string;
  session_id: string;
  profile_id: string | null;
  track: AssignmentTrack;
  session_role: SessionRole;
  status: AssignmentStatus;
  is_substitute: boolean;
  assigned_at: string;
  assigned_by: string | null;
}

export interface AvailabilitySurvey {
  id: string;
  season_id: string;
  name: string;
  range_start: string;
  range_end: string;
  status: SurveyStatus;
  created_at: string;
}

export interface AvailabilityResponse {
  id: string;
  survey_id: string;
  profile_id: string;
  session_id: string;
  state: ResponseState;
  responded_at: string;
}

export interface SubstitutionRequest {
  id: string;
  session_id: string;
  original_trainer_id: string;
  volunteer_id: string | null;
  track: AssignmentTrack;
  status: SubstitutionStatus;
  created_at: string;
  filled_at: string | null;
  escalated_at: string | null;
}

export interface Notification {
  id: string;
  recipient_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}
