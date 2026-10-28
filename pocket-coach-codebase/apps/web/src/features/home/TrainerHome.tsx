import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Section, Tag } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import { formatDayMonth, formatTimeRange, zurichToday } from '../../lib/dates';
import { AuthError } from '../auth/AuthLayout';
import { useLocations } from '../locations/hooks/useLocations';
import { useActiveSeason } from '../seasons/hooks/useActiveSeason';
import { usePersonStats } from '../trainers/hooks/useTeamStats';
import { coverableGaps } from './coverable';
import { useCoverage } from './hooks/useCoverage';
import { useMyUpcoming, type MyUpcomingSession } from './hooks/useMyUpcoming';
import { hallNameFrom, roleLabel } from './shared';

const LIST_SIZE = 5;
const GAP_CARD_SIZE = 3;

const link = 'text-sm font-extrabold text-accent no-underline hover:underline';

const NextSession: React.FC<{
  session: MyUpcomingSession;
  hall: string;
  language: string;
}> = ({ session, hall, language }) => {
  const { t } = useTranslation();
  return (
    <div
      className="flex flex-col gap-0.5"
      data-testid="next-session"
      data-session-date={session.date}
    >
      <div className="flex items-baseline justify-between gap-2.5">
        <span className="font-heading text-2xl font-extrabold">
          {formatDayMonth(session.date, language)}
        </span>
        <span className="font-semibold tabular-nums">
          {formatTimeRange(session.startTime, session.endTime)}
        </span>
      </div>
      <span className="text-sm">
        {[hall, session.groups.join(' · ')].filter(Boolean).join(' · ')}
      </span>
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <Tag>{roleLabel(session.role, t)}</Tag>
        {session.isSubstitute && <Tag variant="accent">{t('profile.log.substitute')}</Tag>}
      </div>
      {session.coTrainers.length > 0 && (
        <span className="mt-1.5 text-[13px] text-neutral-700">
          {t('home.with', { names: session.coTrainers.join(', ') })}
        </span>
      )}
    </div>
  );
};

/**
 * Home for a trainer (from the design): the next session with the people working it, the
 * sessions after it, the season's counts and the calendar link. The open-gap card, "Can't make
 * it" and "Add to calendar" arrive with Sub-Phases 1.5 and 1.6b; the survey card with 2.1.
 */
export const TrainerHome: React.FC = () => {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? 'de';
  const { user, profile } = useAuth();
  const { season, loading: seasonLoading } = useActiveSeason();
  const { locations } = useLocations();
  const { sessions, loading, error } = useMyUpcoming(user?.id, LIST_SIZE + 1);
  const { coverage } = useCoverage(season?.id, true);
  const { stats, error: statsError } = usePersonStats(season?.id, user?.id, true);

  const hallName = useMemo(() => hallNameFrom(locations), [locations]);
  const [next, ...later] = sessions;
  const openGaps = useMemo(
    () => (user ? coverableGaps(coverage, user.id, profile?.is_junior_coach ?? false) : []),
    [coverage, user, profile?.is_junior_coach],
  );
  const isJunior = profile?.is_junior_coach ?? false;
  const secondary = isJunior
    ? [{ key: 'junior', label: t('profile.stats.junior'), value: stats.asJunior }]
    : [
        { key: 'trainer', label: t('profile.stats.trainer'), value: stats.asTrainer },
        { key: 'assistant', label: t('profile.stats.assistant'), value: stats.asAssistant },
      ];

  if (loading || seasonLoading) {
    return (
      <p role="status" className="text-sm text-neutral-700">
        {t('status.loading')}…
      </p>
    );
  }

  return (
    <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] md:gap-9">
      <div className="flex min-w-0 flex-col gap-[22px]">
        {error && <AuthError message={t('home.loadError')} />}

        {openGaps.length > 0 && (
          <section
            data-testid="coverable-gaps"
            className="flex flex-col gap-1 border-t-2 border-accent bg-accent-100 px-4 py-3.5"
          >
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-accent-700">
              {t('home.gapsYouCan')}
            </h2>
            <ul className="flex flex-col">
              {openGaps.slice(0, GAP_CARD_SIZE).map((gap) => (
                <li
                  key={`${gap.sessionId}-${gap.track}`}
                  data-testid="coverable-gap"
                  data-session-date={gap.date}
                  data-session-id={gap.sessionId}
                  className="flex flex-col gap-0.5 border-b border-accent/20 py-2.5 last:border-b-0"
                >
                  <span className="font-heading text-lg font-extrabold leading-tight">
                    {formatDayMonth(gap.date, language)} · {gap.startTime.slice(0, 5)}
                  </span>
                  <span className="text-[13px] text-neutral-800">
                    {[hallName(gap.locationId), formatTimeRange(gap.startTime, gap.endTime)]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                  <span className="text-[12.5px] font-semibold text-accent-700">
                    {t(
                      gap.track === 'junior_coach'
                        ? 'dashboard.needJunior'
                        : 'dashboard.needRegular',
                      { count: gap.missing },
                    )}
                  </span>
                </li>
              ))}
            </ul>
            {openGaps.length > GAP_CARD_SIZE && (
              <p className="text-[12.5px] text-neutral-700">
                {t('home.moreGapsYouCan', { count: openGaps.length - GAP_CARD_SIZE })}
              </p>
            )}
          </section>
        )}

        <Section title={t('home.next')}>
          {next ? (
            <NextSession session={next} hall={hallName(next.locationId)} language={language} />
          ) : (
            <p className="text-sm text-neutral-700">{t('home.nothingYet')}</p>
          )}
        </Section>

        <Section title={t('home.upcoming')}>
          {later.length > 0 ? (
            <ul className="-mt-1 flex flex-col">
              {later.slice(0, LIST_SIZE).map((s) => (
                <li
                  key={s.assignmentId}
                  data-testid="upcoming-session"
                  data-session-date={s.date}
                  className="grid grid-cols-[96px_minmax(0,1fr)_auto] items-baseline gap-2.5 border-b border-divider py-[11px] text-sm"
                >
                  <span className="font-semibold">{formatDayMonth(s.date, language)}</span>
                  <span className="truncate">
                    {hallName(s.locationId)}
                    <span className="text-neutral-700"> · {roleLabel(s.role, t)}</span>
                  </span>
                  <span className="text-[13px] tabular-nums text-neutral-700">
                    {s.startTime.slice(0, 5)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-neutral-700">{t('home.noMoreUpcoming')}</p>
          )}
        </Section>
      </div>

      <div className="flex min-w-0 flex-col gap-[22px]">
        <Section
          title={
            season ? t('profile.completedHeading', { season: season.name }) : t('home.noSeason')
          }
          action={
            <span className="text-xs text-neutral-700">
              {t('profile.asOf', { date: formatDayMonth(zurichToday(), language) })}
            </span>
          }
        >
          {statsError && <AuthError message={t('team.statsError')} />}
          <dl
            aria-label={t('team.strip.label')}
            style={{
              gridTemplateColumns: `minmax(0,1.2fr) repeat(${secondary.length}, minmax(0,1fr))`,
            }}
            className="-mt-1 grid border-b-2 border-divider"
          >
            <div className="flex flex-col pb-3 pt-1.5">
              <dd
                data-testid="stat-completed"
                className="font-heading text-[40px] font-extrabold leading-[1.05] tabular-nums"
              >
                {stats.completed}
              </dd>
              <dt className="text-xs text-neutral-700">{t('profile.stats.completed')}</dt>
            </div>
            {secondary.map((item) => (
              <div
                key={item.key}
                className="flex flex-col justify-end border-l border-divider pb-3 pl-2.5 pt-1.5"
              >
                <dd
                  data-testid={`stat-${item.key}`}
                  className="font-heading text-[22px] font-extrabold tabular-nums"
                >
                  {item.value}
                </dd>
                <dt className="text-xs text-neutral-700">{item.label}</dt>
              </div>
            ))}
          </dl>
          <div className="flex items-center justify-between gap-2.5 text-[12.5px] text-neutral-700">
            <span data-testid="stat-upcoming">
              {t('home.upcomingLine', { count: stats.upcoming })}
            </span>
            {user && (
              <Link to={`/trainers/${user.id}`} className={link}>
                {t('home.viewLog')} →
              </Link>
            )}
          </div>
        </Section>

        <Section title={t('home.calendar')}>
          <p className="text-sm text-neutral-800">{t('home.calendarBody')}</p>
          <Link to="/settings" className={`${link} self-start`}>
            {t('home.calendarSetUp')} →
          </Link>
        </Section>
      </div>
    </div>
  );
};
