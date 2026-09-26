import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, ClipboardCheck, RefreshCw, Users } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Sessions', path: '/sessions', icon: CalendarDays },
    { label: 'Availability', path: '/availability', icon: ClipboardCheck },
    { label: 'Gaps', path: '/substitutions', icon: RefreshCw },
    { label: 'Trainers', path: '/trainers', icon: Users },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg-glass)] backdrop-blur-xl border-t border-[var(--border-glass)] px-2 py-1.5 flex items-center justify-around shadow-[var(--shadow-main)] transition-colors duration-200">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'text-emerald-500 font-bold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};
