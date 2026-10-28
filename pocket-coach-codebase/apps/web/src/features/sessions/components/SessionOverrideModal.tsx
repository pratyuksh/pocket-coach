import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Dialog, Field, Input, Select, Tag } from '../../../components/ui';
import { AuthError } from '../../auth/AuthLayout';
import { useLocations } from '../../locations/hooks/useLocations';
import type { EnrichedSession } from '../hooks/useSessions';

interface SessionOverrideModalProps {
  session: EnrichedSession | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    sessionId: string,
    updates: { start_time?: string; end_time?: string; location_id?: string | null },
  ) => Promise<void>;
}

/** "Change time or hall": changes this one session; the weekly slot stays the same. */
export const SessionOverrideModal: React.FC<SessionOverrideModalProps> = ({
  session,
  isOpen,
  onClose,
  onSave,
}) => {
  const { t } = useTranslation();
  const { locations } = useLocations();
  const [startTime, setStartTime] = useState('17:30:00');
  const [endTime, setEndTime] = useState('19:00:00');
  const [locationId, setLocationId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session) {
      setStartTime(session.start_time || '17:30:00');
      setEndTime(session.end_time || '19:00:00');
      setLocationId(session.location_id || null);
    }
  }, [session]);

  if (!session) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      await onSave(session.id, {
        start_time: startTime.length === 5 ? `${startTime}:00` : startTime,
        end_time: endTime.length === 5 ? `${endTime}:00` : endTime,
        location_id: locationId,
      });
      onClose();
    } catch {
      setError(t('sessions.override.failed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={t('sessions.override.title')}
      closeLabel={t('actions.close')}
    >
      <form onSubmit={handleSave} className="flex flex-col gap-3">
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold">{session.session_date}</span>
          {session.is_time_overridden && (
            <Tag variant="outline">{t('sessions.override.previously')}</Tag>
          )}
        </p>
        <p className="text-[12.5px] text-neutral-700">{t('sessions.detail.overrideNote')}</p>
        {error && <AuthError message={error} />}

        <div className="grid grid-cols-2 gap-3">
          <Field label={t('sessions.override.start')}>
            <Input
              type="time"
              required
              value={startTime.slice(0, 5)}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </Field>
          <Field label={t('sessions.override.end')}>
            <Input
              type="time"
              required
              value={endTime.slice(0, 5)}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </Field>
        </div>

        <Field label={t('sessions.override.hall')}>
          <Select value={locationId || ''} onChange={(e) => setLocationId(e.target.value || null)}>
            <option value="">{t('sessions.override.noHall')}</option>
            {locations
              .filter((loc) => loc.is_active || loc.id === session.location_id)
              .map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                  {loc.district_area ? ` (${loc.district_area})` : ''}
                </option>
              ))}
          </Select>
        </Field>

        {session.player_groups && session.player_groups.length > 0 && (
          <p className="text-[12.5px] text-neutral-700">
            {t('sessions.override.groups')}: {session.player_groups.map((g) => g.name).join(' · ')}
          </p>
        )}

        <div className="mt-1 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            {t('sessions.override.cancel')}
          </Button>
          <Button type="submit" isLoading={submitting}>
            {t('sessions.override.save')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
