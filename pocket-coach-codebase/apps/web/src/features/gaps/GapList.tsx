import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Section } from '../../components/ui';
import { formatDayMonth, zurichToday } from '../../lib/dates';
import { AuthError } from '../auth/AuthLayout';
import { RecentlyFilledSection } from '../home/RecentlyFilledSection';
import { gapsWithin, useCoverage } from '../home/hooks/useCoverage';
import { hallNameFrom } from '../home/shared';
import { useLocations } from '../locations/hooks/useLocations';
import { useActiveSeason } from '../seasons/hooks/useActiveSeason';

/**
 * Gaps: the sessions of the active season that are short of trainers or 14/18 coaches in the next
 * 14 days, one row per short track, each opening its session. The same gaps the Dashboard counts.
 * Volunteering ("Volunteer", the reason it is not possible) arrives with Sub-Phase 1.5.
 */
export const GapList: React.FC = () => {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? 'de';
  const { season, loading: seasonLoading } = useActiveSeason();
  const { coverage, loading, error } = useCoverage(season?.id, true);
  const { locations } = useLocations();
  const hallName = useMemo(() => hallNameFrom(locations), [locations]);

  if (seasonLoading || loading) {
    return (
      <p role="status" className="text-sm text-neutral-700">
        {t('status.loading')}…
      </p>
    );
  }

  const gaps = gapsWithin(coverage.gaps, zurichToday());

  return (
    <div className="flex max-w-[820px] flex-col gap-[18px]">
      <p className="text-sm text-neutral-800">{t('gaps.intro')}</p>
      {error && <AuthError message={t('gaps.loadError')} />}

      <Section title={t('gaps.heading')}>
        {gaps.length === 0 ? (
          <p className="text-sm text-neutral-700">{t('dashboard.noGaps')}</p>
        ) : (
          <ul className="-mt-1 flex flex-col">
            {gaps.map((gap) => (
              <li key={`${gap.sessionId}-${gap.track}`}>
                <Link
                  to={`/sessions/${gap.sessionId}`}
                  data-testid="gap-row"
                  data-session-id={gap.sessionId}
                  data-session-date={gap.date}
                  data-track={gap.track}
                  className="flex flex-col gap-[3px] border-b border-divider py-3.5 text-text no-underline hover:bg-neutral-100 hover:no-underline"
                >
                  <span className="font-heading text-[17px] font-extrabold">
                    {formatDayMonth(gap.date, language)} · {gap.startTime.slice(0, 5)}
                  </span>
                  <span className="text-[13px]">
                    {hallName(gap.locationId)}
                    {hallName(gap.locationId) && ' · '}
                    <span className="font-semibold text-accent-700">
                      {t(
                        gap.track === 'junior_coach'
                          ? 'dashboard.needJunior'
                          : 'dashboard.needRegular',
                        { count: gap.missing },
                      )}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <RecentlyFilledSection />
    </div>
  );
};
