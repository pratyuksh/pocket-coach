import { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import i18n, { changeAppLanguage, isLanguage } from './index';

/** After sign-in, applies the profile's saved language (the source of truth for signed-in users). */
export const LanguageSync = () => {
  const { profile } = useAuth();
  const preferred = profile?.preferred_language;

  useEffect(() => {
    if (isLanguage(preferred) && preferred !== i18n.resolvedLanguage) {
      void changeAppLanguage(preferred);
    }
  }, [preferred]);

  return null;
};
