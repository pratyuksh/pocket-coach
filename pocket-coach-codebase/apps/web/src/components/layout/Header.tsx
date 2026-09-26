import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import { Bell, LogOut, LogIn, ShieldAlert, Sparkles } from 'lucide-react';
import { Badge, ThemeToggle } from '../ui';
import { Link, useNavigate } from 'react-router-dom';

interface HeaderProps {
  title?: string;
}

export const Header: React.FC<HeaderProps> = ({ title = 'Dashboard' }) => {
  const { user, profile, signOut } = useAuth();
  const permissions = usePermissions();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const getPrimaryRoleBadge = () => {
    if (permissions.isSuperAdmin) {
      return (
        <Badge variant="warning" className="shadow-lg shadow-amber-500/10 border-amber-500/40">
          <ShieldAlert className="w-3 h-3 text-amber-400" />
          <span>Super Admin</span>
        </Badge>
      );
    }
    if (permissions.isHeadTrainer) {
      return (
        <Badge variant="info" className="shadow-lg shadow-cyan-500/10 border-cyan-500/40">
          <Sparkles className="w-3 h-3 text-cyan-400" />
          <span>Head Trainer</span>
        </Badge>
      );
    }
    return <Badge variant="neutral">Trainer</Badge>;
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-6 bg-[var(--bg-glass)] backdrop-blur-2xl border-b border-[var(--border-glass)] shadow-[var(--shadow-main)] transition-colors duration-200">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-emerald-400 text-slate-950 font-black shadow-md shadow-emerald-500/20 ring-1 ring-emerald-400/30">
          PC
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-[var(--text-primary)] font-heading">
            {title}
          </h1>
          <p className="text-[11px] text-[var(--text-secondary)] hidden sm:block font-medium">
            PocketCoach Operational Management
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {user && getPrimaryRoleBadge()}

        <ThemeToggle />

        <button
          className="relative p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] transition-all duration-150 border border-transparent hover:border-[var(--border-glass)]"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[var(--bg-surface)] animate-pulse" />
        </button>

        <div className="flex items-center gap-2 pl-2 border-l border-[var(--border-glass)]">
          {user ? (
            <div className="flex items-center gap-2.5 bg-[var(--bg-surface-elevated)] p-1.5 pr-2 rounded-xl border border-[var(--border-glass)]">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-700 dark:from-emerald-900 dark:to-slate-800 border border-emerald-500/40 flex items-center justify-center text-white dark:text-emerald-400 font-bold text-xs shadow-inner">
                {profile?.display_name
                  ? profile.display_name.charAt(0).toUpperCase()
                  : user.email?.charAt(0).toUpperCase()}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-semibold text-[var(--text-primary)] leading-tight truncate max-w-[120px]">
                  {profile?.display_name || user.email?.split('@')[0]}
                </p>
                <p className="text-[10px] text-[var(--text-secondary)] truncate max-w-[120px]">
                  {user.email}
                </p>
              </div>
              <button
                onClick={handleSignOut}
                title="Sign Out"
                className="p-1.5 text-[var(--text-secondary)] hover:text-rose-500 hover:bg-rose-500/15 rounded-lg transition-all duration-150 ml-1"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link to="/login">
              <button className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-500/25 text-xs font-bold border border-emerald-500/40 transition-all duration-200 shadow-sm">
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
