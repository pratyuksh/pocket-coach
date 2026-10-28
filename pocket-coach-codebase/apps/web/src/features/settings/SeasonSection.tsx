import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Dialog } from '../../components/ui';
import { formatDate, formatTimeRange, weekdayShort } from '../../lib/dates';
import { AuthError } from '../auth/AuthLayout';
import { useSeasons } from '../seasons/hooks/useSeasons';
import { SeasonSetupModal } from '../seasons/components/SeasonSetupModal';
import type { useActiveSeason } from '../seasons/hooks/useActiveSeason';
import { Section } from '../../components/ui';

type ActiveSeason = ReturnType<typeof useActiveSeason>;

/** Head-trainer and above: the current season and its weekly slots, and the season wizard. */
export const SeasonSection: React.FC<
  Pick<ActiveSeason, 'season' | 'slots' | 'refetch'> & { onNotice: (message: string) => void }
> = ({ season, slots, refetch, onNotice }) => {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? 'de';
  const [wizardOpen, setWizardOpen] = useState(false);
  const { deleteSeason } = useSeasons();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!season) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteSeason(season.id);
      setDeleteOpen(false);
      onNotice(t('settings.notices.seasonDeleted'));
      void refetch();
    } catch {
      setDeleteError(t('settings.season.deleteFailed'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Section
      title={t('settings.season.title')}
      action={
        <Button variant="ghost" className="!px-0" onClick={() => setWizardOpen(true)}>
          {t('settings.season.new')}
        </Button>
      }
    >
      {season ? (
        <div>
          <p className="font-heading text-lg font-extrabold">{season.name}</p>
          <p className="mb-2 text-[12.5px] text-neutral-700">
            {formatDate(season.start_date, language)} – {formatDate(season.end_date, language)}
          </p>
          {slots.length === 0 ? (
            <p className="text-sm text-neutral-700">{t('settings.season.noSlots')}</p>
          ) : (
            <ul>
              {slots.map((slot) => (
                <li
                  key={slot.id}
                  className="grid grid-cols-[44px_92px_minmax(0,1fr)] items-baseline gap-2.5 border-b border-divider py-2 text-[13px]"
                >
                  <span className="font-extrabold">{weekdayShort(slot.dayOfWeek, language)}</span>
                  <span className="tabular-nums">
                    {formatTimeRange(slot.startTime, slot.endTime)}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span>{slot.hall ?? t('settings.season.noHall')}</span>
                    <span className="text-[11.5px] text-neutral-700">{slot.groups.join(', ')}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <p className="text-sm text-neutral-700">{t('settings.season.none')}</p>
      )}
      {season && (
        <Button variant="ghost" className="!px-0 self-start" onClick={() => setDeleteOpen(true)}>
          {t('settings.season.delete')}
        </Button>
      )}

      <Dialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={t('settings.season.deleteTitle')}
        closeLabel={t('actions.close')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              {t('settings.season.deleteCancel')}
            </Button>
            <Button isLoading={deleting} onClick={handleDelete}>
              {deleting ? t('settings.season.deleting') : t('settings.season.deleteConfirm')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          {deleteError && <AuthError message={deleteError} />}
          <p className="text-sm">{t('settings.season.deleteBody', { name: season?.name })}</p>
        </div>
      </Dialog>

      <SeasonSetupModal
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSuccess={() => {
          setWizardOpen(false);
          void refetch();
        }}
      />
    </Section>
  );
};
