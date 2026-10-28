import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AssignmentTrack } from '@pocket-coach/shared-types';
import { Dialog } from '../../../components/ui';
import { formatDayMonth, formatTimeRange } from '../../../lib/dates';
import { AuthError } from '../../auth/AuthLayout';
import { useAssignTrainer, type SessionAssignmentRow } from '../hooks/useAssignTrainer';
import { useAvailableTrainers } from '../hooks/useAvailableTrainers';
import type { EnrichedSession } from '../hooks/useSessions';

interface OpenSlotDialogProps {
  session: EnrichedSession | null;
  /** The track of the open slot that was clicked */
  track: AssignmentTrack;
  isOpen: boolean;
  onClose: () => void;
  /** Called after the person was added, with their name */
  onAssigned: (name: string) => void;
}

/** The people on the session now, as the rows the save function expects. */
export const currentRows = (session: EnrichedSession): SessionAssignmentRow[] =>
  (session.assignments ?? [])
    .filter((a) => a.status === 'active' && a.profile_id)
    .map((a) => ({
      profile_id: a.profile_id as string,
      track: a.track,
      session_role: a.session_role,
    }));

/**
 * Click an open slot, pick a person: the list holds the people who are free at that time and
 * have the right role for the track, fewest sessions first. Picking one saves straight away.
 */
export const OpenSlotDialog: React.FC<OpenSlotDialogProps> = ({
  session,
  track,
  isOpen,
  onClose,
  onAssigned,
}) => {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? 'de';
  const { candidates, loading, error: loadError } = useAvailableTrainers(session, track, isOpen);
  const { saveAssignments, loading: saving, error: saveError } = useAssignTrainer();
  const [pending, setPending] = useState<string | null>(null);

  if (!session) return null;

  const pick = async (profileId: string, name: string) => {
    const rows = currentRows(session);
    // The first trainer of a session leads, further trainers assist; a 14/18 coach supports
    const hasLead = rows.some((r) => r.track === 'regular' && r.session_role === 'primary');
    setPending(profileId);
    try {
      await saveAssignments(session.id, [
        ...rows,
        {
          profile_id: profileId,
          track,
          session_role: track === 'junior_coach' || hasLead ? 'assistant_coach' : 'primary',
        },
      ]);
      onAssigned(name);
      onClose();
    } catch {
      // the message is shown from the hook's error
    } finally {
      setPending(null);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={t(
        track === 'junior_coach' ? 'sessions.slot.titleJunior' : 'sessions.slot.titleRegular',
      )}
      closeLabel={t('actions.close')}
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm">
          <span className="font-semibold">{formatDayMonth(session.session_date, language)}</span>
          {' · '}
          <span className="tabular-nums">
            {formatTimeRange(session.start_time, session.end_time)}
          </span>
        </p>
        <p className="text-[12.5px] text-neutral-700">{t('sessions.slot.intro')}</p>

        {(saveError || loadError) && (
          <AuthError message={saveError || t('sessions.slot.loadFailed')} />
        )}

        {loading ? (
          <p role="status" className="py-4 text-sm text-neutral-700">
            {t('sessions.slot.loading')}
          </p>
        ) : candidates.length === 0 ? (
          <p className="py-2 text-sm text-neutral-700">{t('sessions.slot.none')}</p>
        ) : (
          <ul
            aria-label={t('sessions.slot.list')}
            className="flex max-h-80 flex-col overflow-y-auto"
          >
            {candidates.map(({ profile, sessions }) => (
              <li key={profile.id}>
                <button
                  type="button"
                  data-testid="slot-candidate"
                  disabled={saving}
                  onClick={() => void pick(profile.id, profile.display_name)}
                  className="grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-divider bg-transparent py-2.5 text-left text-text hover:bg-neutral-100 disabled:cursor-default disabled:opacity-60"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="text-sm font-semibold">{profile.display_name}</span>
                    {profile.specialty && (
                      <span className="truncate text-xs text-neutral-700">{profile.specialty}</span>
                    )}
                  </span>
                  <span className="whitespace-nowrap text-xs tabular-nums text-neutral-700">
                    {pending === profile.id
                      ? t('sessions.slot.saving')
                      : t('sessions.slot.count', { count: sessions })}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Dialog>
  );
};
