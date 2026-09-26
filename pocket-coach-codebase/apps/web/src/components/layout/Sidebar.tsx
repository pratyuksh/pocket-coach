import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  ClipboardCheck,
  RefreshCw,
  Users,
  Settings,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Sessions', path: '/sessions', icon: CalendarDays },
    { label: 'Availability', path: '/availability', icon: ClipboardCheck },
    { label: 'Substitutions', path: '/substitutions', icon: RefreshCw },
    { label: 'Trainers', path: '/trainers', icon: Users },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-[var(--bg-glass)] backdrop-blur-2xl border-r border-[var(--border-glass)] min-h-screen p-5 z-20 shadow-[var(--shadow-main)] transition-colors duration-200">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-2 py-3 mb-6 border-b border-[var(--border-glass)] pb-5">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-emerald-400 text-slate-950 font-black text-lg shadow-lg shadow-emerald-500/25 ring-1 ring-emerald-400/40">
          PC
        </div>
        <div>
          <h2 className="text-base font-black text-[var(--text-primary)] tracking-tight font-heading">
            PocketCoach
          </h2>
        </div>
      </div>

      <div className="px-3 py-1 mb-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
          Management Console
        </span>
      </div>

      <nav className="flex-1 space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `relative flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-500/15 to-teal-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] border border-transparent'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-emerald-500 dark:bg-emerald-400 shadow-glow" />
                  )}
                  <Icon
                    className={`w-5 h-5 shrink-0 transition-colors ${isActive ? 'text-emerald-500' : 'text-[var(--text-muted)]'}`}
                  />
                  <span className="font-heading">{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="pt-4 mt-auto border-t border-[var(--border-glass)] px-3 py-2 text-[11px] text-[var(--text-secondary)] flex items-center justify-between">
        <span>v1.2 • Monorepo</span>
        <span className="inline-flex items-center gap-1.5 text-emerald-500 font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Active
        </span>
      </div>
    </aside>
  );
};
