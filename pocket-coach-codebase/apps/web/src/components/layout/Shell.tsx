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
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col md:flex-row text-[var(--text-primary)] selection:bg-emerald-500 selection:text-slate-950 relative overflow-x-hidden font-body transition-colors duration-200">
      {/* Background ambient lighting glow mesh */}
      <div className="fixed top-0 right-1/4 w-[500px] h-[500px] bg-[var(--ambient-glow-1)] rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed bottom-10 left-1/3 w-[450px] h-[450px] bg-[var(--ambient-glow-2)] rounded-full blur-[140px] pointer-events-none z-0" />

      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-0 z-10">
        <Header title={getPageTitle(location.pathname)} />

        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto animate-in fade-in duration-200">
          <Outlet />
        </main>

        <BottomNav />
      </div>
    </div>
  );
};
