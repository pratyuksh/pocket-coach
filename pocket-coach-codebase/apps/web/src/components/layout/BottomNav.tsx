import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TAB_ITEMS } from './navItems';
import { useNavLabel } from './useNavLabels';

export const BottomNav: React.FC = () => {
  const { t } = useTranslation();
  const navLabel = useNavLabel();

  return (
    <nav
      aria-label={t('nav.label')}
      className="md:hidden fixed inset-x-0 bottom-0 z-40 grid h-[60px] grid-cols-4 border-t-2 border-divider bg-bg"
    >
      {TAB_ITEMS.map((item) => (
        <NavLink
          key={item.key}
          to={item.path}
          className={({ isActive }) =>
            `-mt-0.5 flex flex-col justify-center border-t-[3px] pl-[9px] text-[11.5px] text-text no-underline hover:no-underline ${
              isActive ? 'border-accent font-semibold' : 'border-transparent'
            }`
          }
        >
          {navLabel(item.key)}
        </NavLink>
      ))}
    </nav>
  );
};
