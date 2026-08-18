import React from 'react';
import { ShieldAlert, Bell, User } from 'lucide-react';
import { Badge } from '../ui';

interface HeaderProps {
  title?: string;
  activeRole?: string;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'Dashboard',
  activeRole = 'Head Trainer',
}) => {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-6 bg-slate-900/80 backdrop-blur-xl border-b border-white/10">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-slate-950 font-bold shadow-md shadow-emerald-950/40">
          PC
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-white">{title}</h1>
          <p className="text-xs text-slate-400 hidden sm:block">
            PocketCoach Operational Management
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Badge variant="info" size="sm" className="hidden sm:inline-flex">
          <ShieldAlert className="w-3 h-3" />
          <span>{activeRole}</span>
        </Badge>

        <button
          className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
        </button>

        <div className="flex items-center gap-2 pl-2 border-l border-white/10">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
            <User className="w-4 h-4" />
          </div>
        </div>
      </div>
    </header>
  );
};
