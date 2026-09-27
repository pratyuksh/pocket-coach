import React from 'react';
import { Card } from '../../../components/ui';
import { usePersonalStats } from '../hooks/usePersonalStats';
import { CheckCircle2, Calendar, Award, UserCheck } from 'lucide-react';

interface PersonalStatsCardProps {
  profileId?: string;
}

export const PersonalStatsCard: React.FC<PersonalStatsCardProps> = ({ profileId }) => {
  const { stats, loading, error } = usePersonalStats(profileId);

  if (loading) {
    return (
      <Card className="p-5 text-center text-xs text-slate-500">Loading trainer statistics...</Card>
    );
  }

  if (error) {
    return null;
  }

  return (
    <Card variant="solid" className="p-5 border border-slate-200 dark:border-slate-800 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Award className="w-4.5 h-4.5 text-emerald-500" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white font-heading">
            Training Season Performance & Metrics
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Metric 1: Completed Sessions */}
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
          <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400 font-medium">
            <span>Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-800 dark:text-emerald-300 font-heading">
            {stats.completed_sessions}
          </div>
          <p className="text-[10px] text-emerald-600/80">Past assigned sessions</p>
        </div>

        {/* Metric 2: Total Season Assigned */}
        <div className="p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/20 space-y-1">
          <div className="flex items-center justify-between text-xs text-teal-700 dark:text-teal-400 font-medium">
            <span>Total Assigned</span>
            <Calendar className="w-4 h-4 text-teal-500" />
          </div>
          <div className="text-2xl font-black text-teal-800 dark:text-teal-300 font-heading">
            {stats.total_assigned_sessions}
          </div>
          <p className="text-[10px] text-teal-600/80">Full season schedule</p>
        </div>

        {/* Metric 3: Lead vs Assistant Breakdown */}
        <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-medium">
            <span>Role Breakdown</span>
            <UserCheck className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-sm font-bold text-slate-900 dark:text-white pt-1">
            <span className="text-emerald-600 font-black">{stats.primary_role_count}</span> Lead /{' '}
            <span className="text-teal-600 font-black">{stats.assistant_role_count}</span> Assistant
          </div>
          <p className="text-[10px] text-slate-400">Primary vs Support slots</p>
        </div>
      </div>
    </Card>
  );
};
