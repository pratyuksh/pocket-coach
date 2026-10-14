import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SegmentedControl } from '../ui';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../i18n/useLanguage';
import type { Language } from '../../i18n';
import { NAV_ITEMS } from './navItems';
import { useNavLabel } from './useNavLabels';
import { useRoleSummary } from './useRoleSummary';

export const Sidebar: React.FC = () => {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const { language, setLanguage } = useLanguage();
  const navLabel = useNavLabel();
  const roleSummary = useRoleSummary();

  const options: ReadonlyArray<{ value: Language; label: string }> = [
    { value: 'en', label: t('language.en') },
    { value: 'de', label: t('language.de') },
  ];

  return (
    <aside className="hidden md:flex md:sticky md:top-0 md:h-screen flex-col border-r-2 border-divider pt-5 pb-4">
      <div className="px-5 pb-[18px] font-heading text-[19px] font-extrabold">{t('app.name')}</div>

      <nav aria-label={t('nav.label')} className="flex flex-col border-t-2 border-divider">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.key}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center justify-between border-b border-divider px-5 py-[11px] text-sm text-text no-underline hover:bg-neutral-100 hover:no-underline ${
                isActive
                  ? 'bg-neutral-100 font-semibold shadow-[inset_3px_0_0_var(--color-accent)]'
                  : ''
              }`
            }
          >
            {navLabel(item.key)}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-0.5 border-t-2 border-divider px-5 pt-3.5">
        <span className="truncate text-sm font-semibold">
          {profile?.display_name || user?.email?.split('@')[0]}
        </span>
        <span className="text-xs text-neutral-700">{roleSummary}</span>
        <SegmentedControl
          className="mt-2.5 self-start"
          ariaLabel={t('language.label')}
          options={options}
          value={language}
          onChange={setLanguage}
        />
      </div>
    </aside>
  );
};
