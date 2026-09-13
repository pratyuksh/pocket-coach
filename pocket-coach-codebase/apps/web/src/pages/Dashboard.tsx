import React from 'react';
import { Link } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  Button,
  Badge,
} from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';
import {
  Users,
  ShieldCheck,
  UserCheck,
  ArrowRight,
  Sparkles,
  CalendarDays,
  Clock,
  Activity,
  UserPlus,
  CheckCircle2,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user, profile } = useAuth();
  const permissions = usePermissions();

  return (
    <div className="space-y-6">
      {/* High Impact Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 dark:from-emerald-950 dark:via-slate-900 dark:to-slate-950 border border-emerald-500/30 p-6 sm:p-8 shadow-2xl shadow-emerald-950/40 text-white">
        {/* Glow accent mesh inside banner */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="gradient">
                <Sparkles className="w-3 h-3 text-emerald-300" />
                <span>Phase 1 Operating System</span>
              </Badge>
              {user && (
                <Badge variant="warning">
                  Signed in as {profile?.display_name || user.email?.split('@')[0]}
                </Badge>
              )}
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-heading">
              Welcome back{profile?.display_name ? `, ${profile.display_name}` : ''}!
            </h2>
            <p className="text-emerald-100 dark:text-slate-300 text-sm leading-relaxed">
              Streamlined sports club management active. Monitor trainer rosters, assign coaching roles, collect availability surveys, and solve substitution gaps in real-time.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link to="/trainers">
                <Button variant="gradient" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Manage Trainer Roster
                </Button>
              </Link>
              {permissions.canInviteTrainers && (
                <Link to="/trainers">
                  <Button variant="outline" size="sm" leftIcon={<UserPlus className="w-4 h-4" />}>
                    Invite New Trainer
                  </Button>
                </Link>
              )}
            </div>
          </div>

          <div className="hidden lg:flex flex-col items-end space-y-2 text-right">
            <div className="p-3 bg-slate-900/90 rounded-2xl border border-white/10 shadow-xl backdrop-blur-xl flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
              <div>
                <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">System Status</p>
                <p className="text-xs font-extrabold text-emerald-400">All Services Operational</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="interactive">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                Authenticated User
              </p>
              <h4 className="text-sm font-black text-[var(--text-primary)] truncate max-w-[160px] font-heading">
                {user ? (profile?.display_name || user.email?.split('@')[0]) : 'Guest'}
              </h4>
              <p className="text-[11px] text-emerald-500 font-semibold truncate max-w-[160px]">
                {user?.email}
              </p>
            </div>
            <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl text-emerald-500 shadow-md">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card variant="interactive">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                RBAC Access Tier
              </p>
              <div className="flex flex-wrap gap-1 pt-0.5">
                {permissions.isSuperAdmin && <Badge variant="warning">Super Admin</Badge>}
                {permissions.isHeadTrainer && <Badge variant="info">Head Trainer</Badge>}
                {permissions.isTrainer && <Badge variant="neutral">Trainer</Badge>}
              </div>
            </div>
            <div className="p-3.5 bg-amber-500/15 border border-amber-500/30 rounded-2xl text-amber-500 shadow-md">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card variant="interactive">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                Club Roster
              </p>
              <Link to="/trainers" className="text-sm font-black text-emerald-500 hover:text-emerald-400 flex items-center gap-1.5 font-heading">
                <span>View Roster</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="p-3.5 bg-teal-500/15 border border-teal-500/30 rounded-2xl text-teal-500 shadow-md">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card variant="interactive">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                Local Database
              </p>
              <h4 className="text-sm font-black text-[var(--text-primary)] font-heading">Supabase Stack</h4>
              <Badge variant="success" size="sm">Connected</Badge>
            </div>
            <div className="p-3.5 bg-cyan-500/15 border border-cyan-500/30 rounded-2xl text-cyan-500 shadow-md">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Grid: Overview Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Operational Actions */}
        <Card variant="glass" className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-500" />
              <CardTitle>Management Workflows</CardTitle>
            </div>
            <Badge variant="gradient">Phase 1 Active</Badge>
          </CardHeader>

          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link to="/trainers" className="group p-4 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--border-glass)] hover:border-emerald-500/40 transition-all duration-200 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Users className="w-5 h-5" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                </div>
                <h4 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-emerald-500 transition-colors font-heading">
                  Trainer Roster & Roles
                </h4>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Invite new coaches, grant RBAC elevations, and track specialties.
                </p>
              </Link>

              <Link to="/sessions" className="group p-4 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--border-glass)] hover:border-teal-500/40 transition-all duration-200 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <CalendarDays className="w-5 h-5" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-teal-500 group-hover:translate-x-1 transition-all" />
                </div>
                <h4 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-teal-500 transition-colors font-heading">
                  Training Sessions
                </h4>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  View scheduled club sessions, age brackets, and trainer assignments.
                </p>
              </Link>
            </div>
          </CardBody>
        </Card>

        {/* System & Seed Account Info Card */}
        <Card variant="glass">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-cyan-500" />
              <CardTitle className="text-base">Test Credentials</CardTitle>
            </div>
          </CardHeader>

          <CardBody className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-glass)] space-y-1.5 font-mono">
              <div className="flex justify-between items-center text-[var(--text-primary)]">
                <span className="text-amber-500 font-bold">Super Admin:</span>
                <span className="text-[var(--text-secondary)]">admin@club.de</span>
              </div>
              <div className="flex justify-between items-center text-[var(--text-primary)]">
                <span className="text-cyan-500 font-bold">Head Trainer:</span>
                <span className="text-[var(--text-secondary)]">headtrainer@club.de</span>
              </div>
              <div className="flex justify-between items-center text-[var(--text-primary)]">
                <span className="text-emerald-500 font-bold">Trainer:</span>
                <span className="text-[var(--text-secondary)]">trainer1@club.de</span>
              </div>
              <div className="pt-1.5 border-t border-[var(--border-glass)] text-[var(--text-secondary)] text-[10px] flex justify-between">
                <span>Password for all:</span>
                <span className="text-emerald-500 font-bold">Password123!</span>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};
