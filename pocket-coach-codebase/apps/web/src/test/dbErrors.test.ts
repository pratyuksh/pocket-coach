import { describe, it, expect } from 'vitest';
import { dbErrorCode, describeDbError } from '../lib/dbErrors';

describe('dbErrors', () => {
  it('reads a stable code from the exception message', () => {
    expect(dbErrorCode({ message: 'assignment_limit_reached', code: 'P0001' })).toBe(
      'assignment_limit_reached',
    );
  });

  it('ignores ordinary English messages', () => {
    expect(dbErrorCode({ message: 'duplicate key value violates unique constraint' })).toBeNull();
    expect(dbErrorCode(null)).toBeNull();
  });

  it('maps the unique active-assignment index to assignment_duplicate', () => {
    expect(
      dbErrorCode({
        code: '23505',
        message:
          'duplicate key value violates unique constraint "uq_session_assignments_active_profile"',
      }),
    ).toBe('assignment_duplicate');
  });

  it('describes known codes in plain language', () => {
    expect(describeDbError({ message: 'season_in_use' }, 'fallback')).toMatch(
      /cannot be regenerated/,
    );
    expect(describeDbError({ message: 'not_authorized' }, 'fallback')).toMatch(/permission/);
  });

  it('falls back to the raw message, then to the fallback text', () => {
    expect(describeDbError({ message: 'Network down' }, 'fallback')).toBe('Network down');
    expect(describeDbError({}, 'fallback')).toBe('fallback');
  });
});
