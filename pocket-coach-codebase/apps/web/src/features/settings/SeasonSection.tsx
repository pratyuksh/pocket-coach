import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui';
import { formatDate, formatTimeRange, weekdayShort } from '../../lib/dates';
import { SeasonSetupModal } from '../seasons/components/SeasonSetupModal';
import type { useActiveSeason } from '../seasons/hooks/useActiveSeason';
import { Section } from '../../components/ui';

type ActiveSeason = ReturnType<typeof useActiveSeason>;

/** Head-trainer and above: the current season and its weekly slots, and the season wizard. */
export const SeasonSection: React.FC<Pick<ActiveSeason, 'season' | 'slots' | 'refetch'>> = ({
  season,
  slots,
  refetch,
}) => {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? 'de';
  const [wizardOpen, setWizardOpen] = useState(false);

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
