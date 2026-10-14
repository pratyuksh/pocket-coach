import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import de from '../locales/de/common.json';
import en from '../locales/en/common.json';

export const SUPPORTED_LANGUAGES = ['en', 'de'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

/** German is the column default of `profiles.preferred_language`, so it is also the fallback. */
export const DEFAULT_LANGUAGE: Language = 'de';
export const LANGUAGE_STORAGE_KEY = 'pocketcoach_language';

export const isLanguage = (value: unknown): value is Language =>
  typeof value === 'string' && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);

/**
 * Before sign-in the language comes from the browser (explicit choice first, then the browser
 * language, otherwise German). After sign-in `profiles.preferred_language` is the source of
 * truth and is applied by `LanguageSync`.
 */
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { common: en }, de: { common: de } },
    ns: ['common'],
    defaultNS: 'common',
    supportedLngs: SUPPORTED_LANGUAGES,
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    fallbackLng: DEFAULT_LANGUAGE,
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      // Only an explicit choice is stored (see changeAppLanguage), not the detected value.
      caches: [],
    },
    interpolation: { escapeValue: false },
    returnNull: false,
  });

const applyDocumentLanguage = (lng: string) => {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = lng.split('-')[0];
};

applyDocumentLanguage(i18n.resolvedLanguage ?? DEFAULT_LANGUAGE);
i18n.on('languageChanged', applyDocumentLanguage);

/** Switches the language immediately (no reload) and remembers the choice in this browser. */
export const changeAppLanguage = async (language: Language) => {
  await i18n.changeLanguage(language);
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Storage can be unavailable (private window); the switch still applies for this visit.
  }
};

export default i18n;
