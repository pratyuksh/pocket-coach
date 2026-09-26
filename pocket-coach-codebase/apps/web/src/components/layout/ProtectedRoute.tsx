import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center p-4 relative overflow-hidden font-body transition-colors duration-200">
        {/* Background glow mesh */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/3 left-1/2 -translate-x-1/2 translate-y-1/2 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center space-y-4 text-center">
          <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 text-slate-950 font-black text-xl shadow-xl shadow-emerald-500/20 animate-pulse">
            PC
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-[var(--text-primary)] tracking-tight">
              Authenticating Session...
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Verifying secure credentials with PocketCoach
            </p>
          </div>
          <div className="w-32 h-1 bg-[var(--bg-surface-elevated)] rounded-full overflow-hidden border border-[var(--border-glass)]">
            <div className="w-full h-full bg-gradient-to-r from-emerald-500 to-teal-400 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
