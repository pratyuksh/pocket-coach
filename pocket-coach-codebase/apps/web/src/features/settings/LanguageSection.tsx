import React from 'react';
import { useTranslation } from 'react-i18next';
import { SegmentedControl } from '../../components/ui';
import type { Language } from '../../i18n';
import { useLanguage } from '../../i18n/useLanguage';
import { Section } from '../../components/ui';

/** Switching applies immediately and is saved to the profile (see useLanguage). */
export const LanguageSection: React.FC = () => {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();

  const options: ReadonlyArray<{ value: Language; label: string }> = [
    { value: 'en', label: t('settings.language.english') },
    { value: 'de', label: t('settings.language.german') },
  ];

  return (
    <Section title={t('settings.language.title')}>
      <SegmentedControl
        className="self-start"
        ariaLabel={t('settings.language.title')}
        options={options}
        value={language}
        onChange={setLanguage}
      />
    </Section>
  );
};
