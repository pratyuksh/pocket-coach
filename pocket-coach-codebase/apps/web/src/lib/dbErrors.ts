import i18n from '../i18n';

/**
 * Database functions raise stable error codes (the exception message IS the code, for example
 * `assignment_limit_reached`) instead of English sentences. The messages for these codes live in
 * the translation catalogs under `dbErrors.<code>` and follow the current language.
 */
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
  if (code && i18n.exists(`dbErrors.${code}`)) return i18n.t(`dbErrors.${code}` as never);
  const message = (error as ErrorLike | null | undefined)?.message;
  return message || fallback;
}
