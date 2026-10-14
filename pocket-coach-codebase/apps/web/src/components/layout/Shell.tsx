import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useActiveSeason } from '../../features/seasons/hooks/useActiveSeason';
import { isoWeekNumber, zurichToday } from '../../lib/dates';
import { BottomNav } from './BottomNav';
import { NAV_ITEMS } from './navItems';
import { PageHeader } from './PageHeader';
import { PageTitleContext } from './pageTitle';
import { Sidebar } from './Sidebar';
import { useNavLabel } from './useNavLabels';

export const Shell: React.FC = () => {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { season } = useActiveSeason();
  const navLabel = useNavLabel();
  const [titleOverride, setTitleOverride] = useState<string | null>(null);

  const current = NAV_ITEMS.find(
    (item) => pathname === item.path || pathname.startsWith(`${item.path}/`),
  );
  const title = titleOverride ?? (current ? navLabel(current.key) : t('app.name'));

  const week = t('shell.calendarWeek', { week: isoWeekNumber(zurichToday()) });
  const subtitle = (() => {
    switch (current?.key) {
      case 'home':
        return season ? `${season.name} · ${week}` : week;
      case 'sessions':
        return season?.name;
      case 'gaps':
        return t('shell.gapsSub');
      case 'team':
        return t('shell.teamSub');
      case 'settings':
        return t('shell.settingsSub');
      default:
        return undefined;
    }
  })();

  return (
    <div className="min-h-screen bg-bg text-text md:grid md:grid-cols-[224px_minmax(0,1fr)]">
      <Sidebar />

      <div className="flex min-w-0 flex-col pb-[60px] md:pb-0">
        <PageHeader title={title} subtitle={subtitle} />
        <main className="flex-1 p-4 md:p-8">
          <PageTitleContext.Provider value={setTitleOverride}>
            <Outlet />
          </PageTitleContext.Provider>
        </main>
      </div>

      <BottomNav />
    </div>
  );
};
