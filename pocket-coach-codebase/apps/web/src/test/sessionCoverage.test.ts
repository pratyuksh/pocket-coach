import { describe, it, expect } from 'vitest';
import { isAssigned, sessionCoverage } from '../features/sessions/coverage';
import type { EnrichedSession } from '../features/sessions/hooks/useSessions';

const assignment = (
  id: string,
  profile: string,
  track: 'regular' | 'junior_coach',
  status = 'active',
) => ({
  id,
  session_id: 's',
  profile_id: profile,
  track,
  session_role: 'primary',
  status,
  is_substitute: false,
  assigned_at: '',
  assigned_by: null,
});

const session = (assignments: ReturnType<typeof assignment>[]): EnrichedSession =>
  ({
    id: 's',
    required_regular: 3,
    required_junior: 1,
    assignments,
  }) as unknown as EnrichedSession;

describe('sessionCoverage', () => {
  it('counts active assignments per track against the required numbers', () => {
    const c = sessionCoverage(
      session([
        assignment('1', 'a', 'regular'),
        assignment('2', 'b', 'regular'),
        assignment('3', 'c', 'junior_coach'),
      ]),
    );
    expect(c.regular).toEqual({ required: 3, filled: 2, missing: 1 });
    expect(c.junior).toEqual({ required: 1, filled: 1, missing: 0 });
    expect(c.short).toBe(true);
  });

  it('does not count people who are out or replaced', () => {
    const c = sessionCoverage(
      session([
        assignment('1', 'a', 'regular'),
        assignment('2', 'b', 'regular', 'absent_pending_sub'),
        assignment('3', 'c', 'regular', 'replaced'),
      ]),
    );
    expect(c.regular.filled).toBe(1);
  });

  it('is not short when every track is full, and extra people do not hide a gap elsewhere', () => {
    const full = sessionCoverage(
      session([
        assignment('1', 'a', 'regular'),
        assignment('2', 'b', 'regular'),
        assignment('3', 'c', 'regular'),
        assignment('4', 'd', 'junior_coach'),
      ]),
    );
    expect(full.short).toBe(false);

    const extraRegular = sessionCoverage(
      session([
        assignment('1', 'a', 'regular'),
        assignment('2', 'b', 'regular'),
        assignment('3', 'c', 'regular'),
        assignment('4', 'd', 'regular'),
      ]),
    );
    expect(extraRegular.regular.missing).toBe(0);
    expect(extraRegular.junior.missing).toBe(1);
    expect(extraRegular.short).toBe(true);
  });
});

describe('isAssigned', () => {
  it('is true only for an active assignment of that person', () => {
    const s = session([
      assignment('1', 'a', 'regular'),
      assignment('2', 'b', 'regular', 'absent_pending_sub'),
    ]);
    expect(isAssigned(s, 'a')).toBe(true);
    expect(isAssigned(s, 'b')).toBe(false);
    expect(isAssigned(s, 'z')).toBe(false);
    expect(isAssigned(s, undefined)).toBe(false);
  });
});
