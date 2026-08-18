import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';

export const Shell: React.FC = () => {
  const location = useLocation();

  const getPageTitle = (pathname: string) => {
    switch (pathname) {
      case '/dashboard':
        return 'Overview & Dashboard';
      case '/sessions':
        return 'Training Sessions';
      case '/availability':
        return 'Availability Survey';
      case '/substitutions':
        return 'Substitution Gaps';
      case '/trainers':
        return 'Trainer Roster';
      case '/settings':
        return 'Settings & Profile';
      default:
        return 'PocketCoach';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row text-slate-100 selection:bg-emerald-500 selection:text-slate-950">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        <Header title={getPageTitle(location.pathname)} />

        <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto animate-in fade-in duration-150">
          <Outlet />
        </main>

        <BottomNav />
      </div>
    </div>
  );
};
