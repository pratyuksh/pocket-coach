import type { EnrichedSession } from './hooks/useSessions';

/** The most a session can require per track (the staffing targets the database accepts). */
export const MAX_REQUIRED = { regular: 3, junior: 2 } as const;

export interface TrackCoverage {
  required: number;
  filled: number;
  /** Positions still open on the track (never below zero) */
  missing: number;
}

export interface SessionCoverage {
  regular: TrackCoverage;
  junior: TrackCoverage;
  /** At least one track has fewer active people than it needs */
  short: boolean;
}

const track = (required: number, active: number): TrackCoverage => ({
  required,
  filled: active,
  missing: Math.max(0, required - active),
});

/** How well a session is staffed: active assignments per track against the required numbers. */
export function sessionCoverage(session: EnrichedSession): SessionCoverage {
  const active = (session.assignments ?? []).filter((a) => a.status === 'active');
  const regular = track(
    session.required_regular,
    active.filter((a) => a.track === 'regular').length,
  );
  const junior = track(
    session.required_junior,
    active.filter((a) => a.track === 'junior_coach').length,
  );
  return { regular, junior, short: regular.missing > 0 || junior.missing > 0 };
}

/** Whether a person has an active assignment on the session. */
export const isAssigned = (session: EnrichedSession, profileId: string | undefined): boolean =>
  !!profileId &&
  (session.assignments ?? []).some((a) => a.profile_id === profileId && a.status === 'active');
