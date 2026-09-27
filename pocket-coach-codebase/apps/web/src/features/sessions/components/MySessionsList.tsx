import React from 'react';
import { Card, Badge } from '../../../components/ui';
import { useMySessions } from '../hooks/useMySessions';
import { Clock, MapPin, Calendar, UserCheck, Sparkles } from 'lucide-react';

export const MySessionsList: React.FC = () => {
  const { mySessions, loading, error } = useMySessions();

  if (loading) {
    return (
      <div className="py-16 text-center text-sm text-slate-500">
        Loading your personal training schedule...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 font-medium text-center">
        {error}
      </div>
    );
  }

  if (mySessions.length === 0) {
    return (
      <Card className="py-16 text-center space-y-4">
        <Calendar className="w-10 h-10 text-slate-400 mx-auto" />
        <h3 className="text-base font-bold text-slate-900 dark:text-white font-heading">
          No Sessions Assigned
        </h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          You currently have no training session assignments scheduled. Head-trainers can assign you
          to regular training slots or hall locations.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-500" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white font-heading">
            Your Assigned Sessions ({mySessions.length})
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {mySessions.map((item) => {
          const s = item.session;
          const startTime = s.start_time.slice(0, 5);
          const endTime = s.end_time.slice(0, 5);
          const dateObj = new Date(s.session_date);
          const weekdayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

          return (
            <Card
              key={item.assignment_id}
              className="p-4 sm:p-5 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/40 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                    <span className="text-[9px] font-black uppercase tracking-wider">
                      {weekdayName.slice(0, 3)}
                    </span>
                    <span className="text-sm font-extrabold font-heading">{dateObj.getDate()}</span>
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-white font-heading">
                        {weekdayName}, {s.session_date}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1 font-mono font-medium">
                        <Clock className="w-3.5 h-3.5 text-emerald-500" />
                        {startTime} – {endTime}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-teal-500" />
                        {s.location ? s.location.name : 'No Hall'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:self-center">
                  <Badge variant={item.session_role === 'primary' ? 'gradient' : 'neutral'}>
                    <UserCheck className="w-3 h-3 mr-1 text-emerald-300" />
                    {item.session_role === 'primary'
                      ? 'Primary Lead Trainer'
                      : 'Assistant / Support'}
                  </Badge>

                  {s.player_groups && s.player_groups.length > 0 && (
                    <div className="flex items-center gap-1">
                      {s.player_groups.map((pg) => (
                        <Badge key={pg.id} variant="neutral" className="text-[10px]">
                          {pg.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
