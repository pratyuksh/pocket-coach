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
    <aside className="hidden md:flex flex-col w-64 bg-slate-900/90 border-r border-white/10 min-h-screen p-4">
      <div className="px-3 py-2 mb-6">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Navigation
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
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`
              }
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="pt-4 mt-auto border-t border-white/5 px-3 py-2 text-xs text-slate-400">
        PocketCoach v1.0 • Phase 1
      </div>
    </aside>
  );
};
