/**
 * Database functions raise stable error codes (the exception message IS the code, for example
 * `assignment_limit_reached`) instead of English sentences. This maps a code to a message for the
 * user. Sub-Phase 1.4d moves these messages into the EN/DE translation catalogs.
 */
const MESSAGES: Record<string, string> = {
  not_authorized: 'You do not have permission to do this.',
  season_not_found: 'The season could not be found.',
  season_in_use:
    'This season already has trainer assignments or time changes, so its sessions cannot be regenerated.',
  session_not_found: 'The session could not be found.',
  assignment_duplicate: 'This trainer is already assigned to this session.',
  assignment_limit_reached:
    'This session already has the maximum number of trainers on that track (3 regular, 2 14/18 coaches).',
  track_label_mismatch:
    'Only trainers with the 14/18 Coach label can be on the 14/18 track, and they cannot be on the regular track.',
  label_change_blocked:
    'The 14/18 Coach label cannot change while this person has upcoming assignments on the other track. Remove those assignments first.',
  cannot_remove_own_super_admin: 'You cannot remove your own Super-admin role.',
  invalid_range: 'The date range is not valid.',
  invalid_input: 'Some of the values are not valid. Please check the form.',
  profile_not_found: 'The person could not be found.',
};

const CODE_PATTERN = /^[a-z][a-z0-9_]*$/;

interface ErrorLike {
  message?: string;
  code?: string;
  details?: string;
}

/** Returns the stable error code carried by a database error, or null if it has none. */
export function dbErrorCode(error: unknown): string | null {
  const err = error as ErrorLike | null | undefined;
  if (!err) return null;
  const message = err.message ?? '';
  if (CODE_PATTERN.test(message)) return message;
  // Unique index: a trainer can be actively assigned only once per session
  if (
    err.code === '23505' &&
    `${message} ${err.details ?? ''}`.includes('uq_session_assignments_active_profile')
  ) {
    return 'assignment_duplicate';
  }
  return null;
}

/** A user-facing message for a database error, falling back to the raw message or `fallback`. */
export function describeDbError(error: unknown, fallback: string): string {
  const code = dbErrorCode(error);
  if (code && MESSAGES[code]) return MESSAGES[code];
  const message = (error as ErrorLike | null | undefined)?.message;
  return message || fallback;
}
