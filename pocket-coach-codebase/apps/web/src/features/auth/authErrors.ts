import type { TFunction } from 'i18next';

interface ErrorLike {
  code?: string;
  message?: string;
}

/**
 * Translated message for a Supabase auth error. Known error codes map to catalog entries;
 * anything else shows the server's own text, or the given fallback when there is none.
 */
export const authErrorMessage = (
  err: unknown,
  t: TFunction,
  fallback: 'auth.errors.signInFailed' | 'auth.errors.setupFailed' | 'auth.errors.googleFailed',
): string => {
  const { code, message } = (err ?? {}) as ErrorLike;
  switch (code) {
    case 'invalid_credentials':
      return t('auth.errors.invalidCredentials');
    case 'user_already_exists':
    case 'email_exists':
      return t('auth.errors.alreadyRegistered');
    default:
      return message || t(fallback);
  }
};
