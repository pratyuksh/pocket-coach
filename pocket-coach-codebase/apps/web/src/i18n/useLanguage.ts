import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { changeAppLanguage, DEFAULT_LANGUAGE, isLanguage, type Language } from './index';

/**
 * Current language and a setter that applies immediately. When signed in, the choice is also
 * saved to `profiles.preferred_language` so it follows the user across devices.
 */
export const useLanguage = () => {
  const { i18n } = useTranslation();
  const { user, refreshProfile } = useAuth();

  const language: Language = isLanguage(i18n.resolvedLanguage)
    ? i18n.resolvedLanguage
    : DEFAULT_LANGUAGE;

  const setLanguage = useCallback(
    async (next: Language) => {
      await changeAppLanguage(next);
      if (!user) return;
      const { error } = await supabase
        .from('profiles')
        .update({ preferred_language: next })
        .eq('id', user.id);
      if (error) {
        console.error('Could not save the preferred language:', error.message);
        return;
      }
      await refreshProfile();
    },
    [user, refreshProfile],
  );

  return { language, setLanguage };
};
