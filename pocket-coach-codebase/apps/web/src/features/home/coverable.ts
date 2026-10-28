import type { Coverage, CoverageGap } from './hooks/useCoverage';

/**
 * The gaps a person could fill: on their own track (the 14/18 label means the junior track),
 * on a session they are not already working, and not overlapping another of their sessions
 * the same day (any hall). These are the eligibility rules of Sub-Phase 1.5, minus the final
 * check the database makes when someone volunteers.
 */
export function coverableGaps(
  coverage: Pick<Coverage, 'gaps' | 'sessions'>,
  profileId: string,
  isJuniorCoach: boolean,
): CoverageGap[] {
  const track = isJuniorCoach ? 'junior_coach' : 'regular';
  const mine = coverage.sessions.filter((s) => s.activeIds.includes(profileId));
  return coverage.gaps.filter((gap) => {
    if (gap.track !== track) return false;
    if (mine.some((s) => s.id === gap.sessionId)) return false;
    return !mine.some(
      (s) => s.date === gap.date && s.startTime < gap.endTime && gap.startTime < s.endTime,
    );
  });
}
