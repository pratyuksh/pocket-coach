import React, { useState, useMemo } from 'react';
import { Modal, Button, Badge } from '../../../components/ui';
import { useBulkAssignTrainer } from '../hooks/useBulkAssignTrainer';
import { useTrainers } from '../../trainers/hooks/useTrainers';
import { useLocations } from '../../locations/hooks/useLocations';
import { useAuth } from '../../../hooks/useAuth';
import type { EnrichedSession } from '../hooks/useSessions';
import type { AssignmentTrack, SessionRole } from '@pocket-coach/shared-types';
import { Layers, Filter, Sparkles } from 'lucide-react';

interface BulkAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  seasonId: string | undefined;
  sessions: EnrichedSession[];
  onSuccess?: () => void;
}

export const BulkAssignModal: React.FC<BulkAssignModalProps> = ({
  isOpen,
  onClose,
  seasonId,
  sessions,
  onSuccess,
}) => {
  const { user } = useAuth();
  const { trainers } = useTrainers();
  const { locations } = useLocations();
  const { bulkAssign, loading, error } = useBulkAssignTrainer();

  const [selectedTrainerId, setSelectedTrainerId] = useState<string>('');
  const [track, setTrack] = useState<AssignmentTrack>('regular');
  const [sessionRole, setSessionRole] = useState<SessionRole>('primary');
  const [dayOfWeekFilter, setDayOfWeekFilter] = useState<string>('');
  const [locationIdFilter, setLocationIdFilter] = useState<string>('');
  const [localError, setLocalError] = useState<string | null>(null);

  // Compute matching sessions preview count
  const matchingSessionsCount = useMemo(() => {
    return sessions.filter((s) => {
      if (dayOfWeekFilter !== '') {
        if (s.day_of_week !== parseInt(dayOfWeekFilter, 10)) return false;
      }
      if (locationIdFilter !== '') {
        if (s.location_id !== locationIdFilter) return false;
      }
      return true;
    }).length;
  }, [sessions, dayOfWeekFilter, locationIdFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seasonId) {
      setLocalError('No active season selected.');
      return;
    }
    if (!selectedTrainerId) {
      setLocalError('Please select a trainer to assign.');
      return;
    }

    try {
      setLocalError(null);
      await bulkAssign({
        season_id: seasonId,
        profile_id: selectedTrainerId,
        day_of_week: dayOfWeekFilter !== '' ? parseInt(dayOfWeekFilter, 10) : null,
        location_id: locationIdFilter !== '' ? locationIdFilter : null,
        track,
        session_role: sessionRole,
        assigned_by: user?.id,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setLocalError(err.message || 'Failed to bulk assign trainer');
    }
  };

  const selectedTrainer = trainers.find((t) => t.id === selectedTrainerId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bulk Assign Trainer to Season">
      <form onSubmit={handleSubmit} className="space-y-6 py-2">
        {(localError || error) && (
          <div className="p-3 text-xs font-medium text-red-600 bg-red-500/10 border border-red-500/20 rounded-lg">
            {localError || error}
          </div>
        )}

        {/* Dynamic Matching Preview Count Banner */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-500/20 flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-600 dark:text-emerald-400 font-heading">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              Batch Assignment Preview
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {selectedTrainer ? (
                <span>
                  Assigning <span className="font-bold">{selectedTrainer.display_name}</span> across
                  matching season slots
                </span>
              ) : (
                'Select a trainer and filters below'
              )}
            </p>
          </div>
          <Badge variant="gradient" className="text-sm font-black px-3 py-1">
            {matchingSessionsCount} Sessions
          </Badge>
        </div>

        {/* Trainer Selection */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Target Trainer:
          </label>
          <select
            value={selectedTrainerId}
            onChange={(e) => setSelectedTrainerId(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            <option value="">-- Select Trainer --</option>
            {trainers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.is_junior_coach ? '🌱 ' : ''}
                {t.display_name} ({t.email})
              </option>
            ))}
          </select>
        </div>

        {/* Track & Role Selection Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Assignment Track:
            </label>
            <select
              value={track}
              onChange={(e) => setTrack(e.target.value as AssignmentTrack)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="regular">Regular Track (Primary)</option>
              <option value="junior_coach">1418 Coach Track (Support)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Session Role:
            </label>
            <select
              value={sessionRole}
              onChange={(e) => setSessionRole(e.target.value as SessionRole)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="primary">Primary Trainer</option>
              <option value="assistant_coach">Assistant Coach</option>
            </select>
          </div>
        </div>

        {/* Filters Grid */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
            <Filter className="w-4 h-4 text-emerald-500" /> Filter Criteria (Optional):
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Weekday Filter */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-500">Day of Week:</label>
              <select
                value={dayOfWeekFilter}
                onChange={(e) => setDayOfWeekFilter(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
              >
                <option value="">All Weekdays</option>
                <option value="2">Tuesdays</option>
                <option value="3">Wednesdays</option>
                <option value="4">Thursdays</option>
                <option value="5">Fridays</option>
              </select>
            </div>

            {/* Hall Location Filter */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-500">
                Sports Hall Location:
              </label>
              <select
                value={locationIdFilter}
                onChange={(e) => setLocationIdFilter(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
              >
                <option value="">All Sports Halls ({locations.length})</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    📍 {loc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Submit / Cancel buttons */}
        <div className="pt-4 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={loading}>
            <Layers className="w-4 h-4 mr-1" /> Execute Bulk Assign
          </Button>
        </div>
      </form>
    </Modal>
  );
};
