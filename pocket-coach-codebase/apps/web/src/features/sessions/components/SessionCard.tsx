import React from 'react';
import { Card, Badge, Button } from '../../../components/ui';
import type { EnrichedSession } from '../hooks/useSessions';
import { Clock, MapPin, Edit2, Trash2, AlertCircle } from 'lucide-react';

interface SessionCardProps {
  session: EnrichedSession;
  canEdit?: boolean;
  onEditOverride?: (session: EnrichedSession) => void;
  onDeleteSession?: (session: EnrichedSession) => void;
}

const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export const SessionCard: React.FC<SessionCardProps> = ({
  session,
  canEdit = true,
  onEditOverride,
  onDeleteSession,
}) => {
  const weekdayName = WEEKDAY_NAMES[session.day_of_week] || 'Weekday';
  const startTime = session.start_time.slice(0, 5);
  const endTime = session.end_time.slice(0, 5);

  return (
    <Card
      variant="interactive"
      className="relative group py-4 px-4 sm:px-5 sm:py-4.5 border border-slate-200/80 dark:border-slate-800/80 hover:border-emerald-500/50 transition-all max-w-4xl"
    >
      <div className="flex flex-col md:flex-row md:items-center gap-4 lg:gap-5 py-0.5">
        {/* Left Column: Date & Time (Compact fixed width across all rows for vertical alignment) */}
        <div className="flex items-center gap-2.5 md:w-48 lg:w-52 md:shrink-0">
          <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
            <span className="text-[9px] font-black uppercase tracking-wider">
              {weekdayName.slice(0, 3)}
            </span>
            <span className="text-sm font-extrabold font-heading">
              {new Date(session.session_date).getDate()}
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-900 dark:text-white font-heading truncate">
                {weekdayName}
              </span>
              <span className="text-[11px] text-slate-400 font-medium shrink-0">
                {session.session_date}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              <Clock className="w-3 h-3 text-emerald-500 shrink-0" />
              <span className="font-mono font-medium">
                {startTime} – {endTime}
              </span>
            </div>
          </div>
        </div>

        {/* Middle Column: Hall Location (Compact fixed width so Player Groups sit closely beside it) */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 md:w-60 lg:w-64 md:shrink-0">
          <div className="p-1 rounded-md bg-teal-500/10 text-teal-500 shrink-0">
            <MapPin className="w-3.5 h-3.5" />
          </div>
          <span className="truncate">
            {session.location
              ? `${session.location.name}${session.location.district_area ? ` (${session.location.district_area})` : ''}`
              : 'No Hall Assigned'}
          </span>
        </div>

        {/* Player Groups Column (Positioned directly next to Hall Location with compact spacing) */}
        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          {session.is_time_overridden && (
            <Badge variant="warning">
              <AlertCircle className="w-3 h-3 mr-1 text-amber-500" /> Overridden
            </Badge>
          )}
          {session.player_groups && session.player_groups.length > 0 ? (
            session.player_groups.map((pg) => (
              <Badge key={pg.id} variant="neutral">
                {pg.name}
              </Badge>
            ))
          ) : (
            <span className="text-xs text-slate-400">All Groups</span>
          )}
        </div>

        {/* Right Action: Edit & Delete Buttons */}
        {canEdit && (onEditOverride || onDeleteSession) && (
          <div className="ml-auto shrink-0 flex items-center gap-1.5">
            {onEditOverride && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onEditOverride(session)}
                title="Override Session Details"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </Button>
            )}
            {onDeleteSession && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onDeleteSession(session)}
                title="Delete Session"
                className="text-red-500 hover:text-red-600 hover:bg-red-500/10 border-red-500/20"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

