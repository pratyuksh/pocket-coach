import React from 'react';
import { useTranslation } from 'react-i18next';
import { SegmentedControl } from '../../components/ui';
import { useLanguage } from '../../i18n/useLanguage';
import type { Language } from '../../i18n';

const BENEFITS = ['sessions', 'published', 'substitutes'] as const;

/**
 * Shared frame of the sign-in and invite screens: wordmark and language switch, the page
 * content, and the privacy line on the left; three numbered benefits on the right (desktop).
 */
export const AuthLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();

  const options: ReadonlyArray<{ value: Language; label: string }> = [
    { value: 'en', label: t('language.en') },
    { value: 'de', label: t('language.de') },
  ];

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] bg-bg text-text font-body">
      <div className="flex min-h-screen flex-col gap-5 p-6 sm:p-10 lg:p-14">
        <div className="flex items-center justify-between">
          <span className="font-heading font-extrabold text-lg">{t('app.name')}</span>
          <SegmentedControl
            ariaLabel={t('language.label')}
            options={options}
            value={language}
            onChange={setLanguage}
          />
        </div>

        <main className="flex w-full max-w-md flex-col gap-5">{children}</main>

        <p className="mt-auto border-t-2 border-divider pt-3 text-xs text-neutral-700">
          {t('auth.privacy')}
        </p>
      </div>

      <aside
        aria-label={t('auth.benefitsLabel')}
        className="hidden lg:grid grid-rows-3 border-l-2 border-text"
      >
        {BENEFITS.map((key, index) => (
          <div
            key={key}
            className="flex flex-col justify-end gap-2 border-b-2 border-divider px-10 py-7 last:border-b-0"
          >
            <span className="font-heading text-[13px] font-extrabold text-accent-700">
              {String(index + 1).padStart(2, '0')}
            </span>
            <h2 className="max-w-[520px] text-[30px] leading-[1.1] tracking-[-0.02em]">
              {t(`auth.benefits.${key}.title`)}
            </h2>
            <p className="max-w-[480px] text-sm text-neutral-800">
              {t(`auth.benefits.${key}.body`)}
            </p>
          </div>
        ))}
      </aside>
    </div>
  );
};

/** Heading block used by every auth screen: 2 px rule, title, one line of context. */
export const AuthHeading: React.FC<{ title: string; body: string }> = ({ title, body }) => (
  <div className="border-t-2 border-divider pt-5">
    <h1 className="mb-2 text-[34px]">{title}</h1>
    <p className="text-sm text-neutral-800">{body}</p>
  </div>
);

export const AuthError: React.FC<{ message: string }> = ({ message }) => (
  <div
    role="alert"
    className="border-t-2 border-accent bg-accent-100 px-3 py-2.5 text-sm text-accent-800"
  >
    {message}
  </div>
);
