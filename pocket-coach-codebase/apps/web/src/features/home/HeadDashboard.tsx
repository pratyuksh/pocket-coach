import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Section } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import {
  addDaysToDate,
  formatDayMonth,
  isoWeekNumber,
  timeAgo,
  weekRange,
  zurichToday,
} from '../../lib/dates';
import { AuthError } from '../auth/AuthLayout';
import { useLocations } from '../locations/hooks/useLocations';
import { useActiveSeason } from '../seasons/hooks/useActiveSeason';
import { useTeamStats, EMPTY_STATS } from '../trainers/hooks/useTeamStats';
import { useTrainers } from '../trainers/hooks/useTrainers';
import { useCoverage } from './hooks/useCoverage';
import { useMyUpcoming } from './hooks/useMyUpcoming';
import { useRecentlyFilled } from './hooks/useRecentlyFilled';
import { hallNameFrom } from './shared';

const GAP_PREVIEW = 5;
/** The Dashboard counts and lists the gaps of today and the 13 days after it. */
const GAP_WINDOW_DAYS = 14;

interface Tile {
  key: string;
  label: string;
  value: string;
  sub: string;
  to?: string;
  alert?: boolean;
}

const StatStrip: React.FC<{ tiles: Tile[] }> = ({ tiles }) => {
  const { t } = useTranslation();
  return (
    <dl
      aria-label={t('dashboard.strip.label')}
      className="grid grid-cols-3 border-y-2 border-divider"
    >
      {tiles.map((tile) => (
        <div
          key={tile.key}
          className="relative flex min-w-0 flex-col gap-0.5 border-l border-divider px-3 py-3 first:border-l-0 md:px-3.5 [&:has(a:hover)]:bg-neutral-100"
        >
          <dt className="text-xs text-neutral-700">{tile.label}</dt>
          <dd
            data-testid={`tile-${tile.key}`}
            className={`whitespace-nowrap font-heading text-2xl font-extrabold leading-[1.1] tabular-nums md:text-[30px] ${
              tile.alert ? 'text-accent' : ''
            }`}
          >
            {tile.to ? (
              <Link to={tile.to} className="text-inherit no-underline after:absolute after:inset-0">
                {tile.value}
              </Link>
            ) : (
              tile.value
            )}
          </dd>
          <dd className="text-xs text-neutral-700">{tile.sub}</dd>
        </div>
      ))}
    </dl>
  );
};

/**
 * Home for Head-trainers and Super-admins (from the design, with three tiles because the survey
 * tile returns in Phase 2.1): calendar week, coverage and open gaps; the gap list (next 14 days); the viewer's
 * own next session; and the workload of everyone. "Recently filled" and the Assign action on a
 * gap come with Sub-Phase 1.5, until then Assign opens the Sessions screen.
 */
export const HeadDashboard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? 'de';
  const { user } = useAuth();
  const { season, loading: seasonLoading } = useActiveSeason();
  const { locations } = useLocations();
  const { trainers } = useTrainers();
  const { stats, error: statsError } = useTeamStats(season?.id, true);
  const { coverage, loading, error } = useCoverage(season?.id, true);
  const { sessions: mine } = useMyUpcoming(user?.id, 1);
  const { filled } = useRecentlyFilled(true);

  const hallName = useMemo(() => hallNameFrom(locations), [locations]);
  const today = zurichToday();
  const next = mine[0];
  const lastDay = addDaysToDate(today, GAP_WINDOW_DAYS - 1);
  const soonGaps = coverage.gaps.filter((gap) => gap.date <= lastDay);

  if (seasonLoading || loading) {
    return (
      <p role="status" className="text-sm text-neutral-700">
        {t('status.loading')}…
      </p>
    );
  }

  const tiles: Tile[] = [
    {
      key: 'week',
      label: t('dashboard.strip.week'),
      value: t('shell.calendarWeek', { week: isoWeekNumber(today) }),
      sub: weekRange(today, language),
    },
    {
      key: 'coverage',
      label: t('dashboard.strip.coverage'),
      value:
        coverage.needed > 0 ? `${Math.round((coverage.filled / coverage.needed) * 100)}%` : '–',
      sub: t('dashboard.strip.coverageSub', { filled: coverage.filled, needed: coverage.needed }),
      to: '/sessions',
    },
    {
      key: 'gaps',
      label: t('dashboard.strip.gaps'),
      value: String(soonGaps.length),
      sub: t('shell.gapsSub'),
      to: '/substitutions',
      alert: soonGaps.length > 0,
    },
  ];

  const gapsShown = soonGaps.slice(0, GAP_PREVIEW);

  const rows = trainers
    .map((person) => {
      const s = stats[person.id] ?? EMPTY_STATS;
      return {
        id: person.id,
        name: person.display_name,
        completed: s.completed,
        upcoming: s.upcoming,
      };
    })
    .sort(
      (a, b) =>
        b.completed + b.upcoming - (a.completed + a.upcoming) || a.name.localeCompare(b.name),
    );
  const maxLoad = Math.max(1, ...rows.map((r) => r.completed + r.upcoming));

  return (
    <div className="flex flex-col gap-6 md:gap-9">
      {(error || statsError) && <AuthError message={t('dashboard.loadError')} />}
      <StatStrip tiles={tiles} />

      <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] md:gap-9">
        <div className="flex min-w-0 flex-col gap-[22px]">
          <Section
            title={t('dashboard.gapsHeading')}
            action={
              soonGaps.length > 0 && (
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-accent-700">
                  {t('dashboard.gapsCount', { count: soonGaps.length })}
                </span>
              )
            }
          >
            {soonGaps.length === 0 ? (
              <p className="text-sm text-neutral-700">{t('dashboard.noGaps')}</p>
            ) : (
              <>
                <ul className="-mt-1 flex flex-col">
                  {gapsShown.map((gap) => (
                    <li
                      key={`${gap.sessionId}-${gap.track}`}
                      data-testid="gap-row"
                      data-session-id={gap.sessionId}
                      data-session-date={gap.date}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-divider py-[11px]"
                    >
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="text-sm font-semibold">
                          {formatDayMonth(gap.date, language)} · {gap.startTime.slice(0, 5)}
                        </span>
                        <span className="text-[12.5px] text-neutral-700">
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
                      </div>
                      <Link
                        to="/sessions"
                        className="inline-flex min-h-8 items-center border border-divider px-2.5 py-1.5 font-heading text-[13px] font-extrabold leading-tight text-text no-underline hover:bg-text/7 hover:no-underline"
                      >
                        {t('dashboard.assign')}
                      </Link>
                    </li>
                  ))}
                </ul>
                {soonGaps.length > GAP_PREVIEW && (
                  <Link
                    to="/substitutions"
                    className="self-start text-sm font-extrabold text-accent no-underline hover:underline"
                  >
                    {t('dashboard.moreGaps')} →
                  </Link>
                )}
              </>
            )}
          </Section>

          <Section title={t('dashboard.recentlyFilled')}>
            {filled.length === 0 ? (
              <p className="text-sm text-neutral-700">{t('dashboard.recentlyFilledEmpty')}</p>
            ) : (
              <ul className="-mt-1 flex flex-col">
                {filled.map((item) => (
                  <li
                    key={item.id}
                    data-testid="filled-row"
                    className="flex justify-between gap-3 border-b border-divider py-2.5 text-[13.5px]"
                  >
                    <span>
                      {t('dashboard.covered', {
                        who: item.volunteer,
                        for: item.original,
                        date: formatDayMonth(item.sessionDate, language),
                      })}
                    </span>
                    <span className="whitespace-nowrap text-xs text-neutral-700">
                      {timeAgo(item.filledAt, language)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <div className="flex min-w-0 flex-col gap-[22px]">
          <Section title={t('dashboard.myNext')}>
            {next ? (
              <div className="flex flex-col gap-0.5" data-testid="my-next-session">
                <span className="font-heading text-xl font-extrabold">
                  {formatDayMonth(next.date, language)} · {next.startTime.slice(0, 5)}
                </span>
                <span className="text-[13.5px]">{hallName(next.locationId)}</span>
              </div>
            ) : (
              <p className="text-sm text-neutral-700">{t('dashboard.myNextEmpty')}</p>
            )}
          </Section>

          <Section title={t('dashboard.workload')}>
            {rows.length === 0 ? (
              <p className="text-sm text-neutral-700">{t('dashboard.workloadEmpty')}</p>
            ) : (
              <ul className="-mt-1 flex flex-col">
                {rows.map((row) => (
                  <li key={row.id} data-testid="workload-row">
                    <Link
                      to={`/trainers/${row.id}`}
                      aria-label={`${row.name}: ${t('dashboard.workloadRow', {
                        completed: row.completed,
                        upcoming: row.upcoming,
                      })}`}
                      className="grid grid-cols-[minmax(0,1fr)_120px_26px] items-center gap-2.5 border-b border-divider py-[7px] text-[13.5px] text-text no-underline hover:bg-neutral-100 hover:no-underline"
                    >
                      <span className="truncate">{row.name}</span>
                      <span aria-hidden="true" className="flex h-2 bg-neutral-200">
                        <span
                          className="bg-text"
                          style={{ width: `${(row.completed / maxLoad) * 100}%` }}
                        />
                        <span
                          className="bg-neutral-400"
                          style={{ width: `${(row.upcoming / maxLoad) * 100}%` }}
                        />
                      </span>
                      <span aria-hidden="true" className="text-right font-semibold tabular-nums">
                        {row.completed + row.upcoming}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
};
