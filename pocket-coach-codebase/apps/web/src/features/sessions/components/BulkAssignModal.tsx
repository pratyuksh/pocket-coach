import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Dialog, Field, Select } from '../../../components/ui';
import { useAuth } from '../../../hooks/useAuth';
import { describeDbError } from '../../../lib/dbErrors';
import { toLocalDateString } from '../../../lib/dates';
import type { AssignmentTrack, SessionRole } from '@pocket-coach/shared-types';
import { AuthError } from '../../auth/AuthLayout';
import { useLocations } from '../../locations/hooks/useLocations';
import { useTrainers } from '../../trainers/hooks/useTrainers';
import { useBulkAssignTrainer } from '../hooks/useBulkAssignTrainer';
import type { EnrichedSession } from '../hooks/useSessions';

interface BulkAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  seasonId: string | undefined;
  sessions: EnrichedSession[];
  /** Called after saving with how many sessions the trainer was added to. */
  onSuccess?: (assigned: number, trainerName: string) => void;
}

const WEEKDAYS = ['2', '3', '4', '5'] as const;

/** Adds one trainer to many upcoming sessions of the season at once (filter by weekday, hall). */
export const BulkAssignModal: React.FC<BulkAssignModalProps> = ({
  isOpen,
  onClose,
  seasonId,
  sessions,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { trainers } = useTrainers();
  const { locations } = useLocations();
  const { bulkAssign, loading, error } = useBulkAssignTrainer();

  const [selectedTrainerId, setSelectedTrainerId] = useState('');
  const [track, setTrack] = useState<AssignmentTrack>('regular');
  const [sessionRole, setSessionRole] = useState<SessionRole>('primary');
  const [dayOfWeekFilter, setDayOfWeekFilter] = useState('');
  const [locationIdFilter, setLocationIdFilter] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  // Bulk assign only touches upcoming sessions that still have an open position on the track
  // (the database stops at what each session requires) and that the trainer is not on yet
  const matchingSessionsCount = useMemo(() => {
    const today = toLocalDateString();
    return sessions.filter((s) => {
      if (s.session_date < today) return false;
      if (dayOfWeekFilter !== '' && s.day_of_week !== parseInt(dayOfWeekFilter, 10)) return false;
      if (locationIdFilter !== '' && s.location_id !== locationIdFilter) return false;
      const active = (s.assignments ?? []).filter((a) => a.status === 'active');
      if (selectedTrainerId && active.some((a) => a.profile_id === selectedTrainerId)) return false;
      const required = track === 'junior_coach' ? s.required_junior : s.required_regular;
      return active.filter((a) => a.track === track).length < required;
    }).length;
  }, [sessions, dayOfWeekFilter, locationIdFilter, selectedTrainerId, track]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seasonId) {
      setLocalError(t('sessions.bulk.noSeason'));
      return;
    }
    if (!selectedTrainerId) {
      setLocalError(t('sessions.bulk.noTrainer'));
      return;
    }
    try {
      setLocalError(null);
      const assigned = await bulkAssign({
        season_id: seasonId,
        profile_id: selectedTrainerId,
        day_of_week: dayOfWeekFilter !== '' ? parseInt(dayOfWeekFilter, 10) : null,
        location_id: locationIdFilter !== '' ? locationIdFilter : null,
        track,
        session_role: sessionRole,
        assigned_by: user?.id,
      });
      onSuccess?.(assigned, trainers.find((tr) => tr.id === selectedTrainerId)?.display_name ?? '');
      onClose();
    } catch (err: unknown) {
      setLocalError(describeDbError(err, t('sessions.bulk.failed')));
    }
  };

  const selectedTrainer = trainers.find((tr) => tr.id === selectedTrainerId);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={t('sessions.bulk.title')}
      closeLabel={t('actions.close')}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {(localError || error) && <AuthError message={localError || error || ''} />}

        <div className="flex items-center justify-between gap-3 border-y-2 border-divider py-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-700">
              {t('sessions.bulk.preview')}
            </span>
            <span className="text-[12.5px] text-neutral-800">
              {selectedTrainer
                ? t('sessions.bulk.previewTrainer', { name: selectedTrainer.display_name })
                : t('sessions.bulk.previewNone')}
            </span>
          </div>
          <span className="whitespace-nowrap font-heading text-lg font-extrabold tabular-nums">
            {t('sessions.bulk.count', { count: matchingSessionsCount })}
          </span>
        </div>

        <Field label={t('sessions.bulk.trainer')}>
          <Select
            required
            value={selectedTrainerId}
            onChange={(e) => {
              const id = e.target.value;
              setSelectedTrainerId(id);
              // The track follows the 14/18 label: coaches only work the 14/18 track
              const picked = trainers.find((tr) => tr.id === id);
              if (picked) setTrack(picked.is_junior_coach ? 'junior_coach' : 'regular');
            }}
          >
            <option value="">{t('sessions.bulk.selectTrainer')}</option>
            {trainers.map((tr) => (
              <option key={tr.id} value={tr.id}>
                {tr.display_name} ({tr.email})
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field
            label={t('sessions.bulk.track')}
            hint={selectedTrainerId ? t('sessions.bulk.trackHint') : undefined}
          >
            <Select
              value={track}
              onChange={(e) => setTrack(e.target.value as AssignmentTrack)}
              disabled={Boolean(selectedTrainerId)}
            >
              <option value="regular">{t('sessions.bulk.regular')}</option>
              <option value="junior_coach">{t('sessions.bulk.junior')}</option>
            </Select>
          </Field>
          <Field label={t('sessions.bulk.role')}>
            <Select
              value={sessionRole}
              onChange={(e) => setSessionRole(e.target.value as SessionRole)}
            >
              <option value="primary">{t('sessions.bulk.primary')}</option>
              <option value="assistant_coach">{t('sessions.bulk.assistant')}</option>
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t('sessions.bulk.weekday')}>
            <Select value={dayOfWeekFilter} onChange={(e) => setDayOfWeekFilter(e.target.value)}>
              <option value="">{t('sessions.bulk.allWeekdays')}</option>
              {WEEKDAYS.map((d) => (
                <option key={d} value={d}>
                  {t(`sessions.weekdays.${d}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('sessions.bulk.hall')}>
            <Select value={locationIdFilter} onChange={(e) => setLocationIdFilter(e.target.value)}>
              <option value="">{t('sessions.bulk.allHalls')}</option>
              {locations
                .filter((loc) => loc.is_active)
                .map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
            </Select>
          </Field>
        </div>

        <div className="mt-1 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {t('sessions.bulk.cancel')}
          </Button>
          <Button type="submit" isLoading={loading}>
            {t('sessions.bulk.run')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
