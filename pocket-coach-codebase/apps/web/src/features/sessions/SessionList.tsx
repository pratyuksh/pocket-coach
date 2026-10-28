import React, { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Season } from '@pocket-coach/shared-types';
import { Button, Notice, Section, Tag } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import {
  addDaysToDate,
  formatDayMonth,
  formatTimeRange,
  isoWeekNumber,
  weekRange,
  weekStart,
  zurichToday,
} from '../../lib/dates';
import { AuthError } from '../auth/AuthLayout';
import { useLocations } from '../locations/hooks/useLocations';
import { useActiveSeason } from '../seasons/hooks/useActiveSeason';
import { BulkAssignModal } from './components/BulkAssignModal';
import { PublishSessionsModal } from './components/PublishSessionsModal';
import { isAssigned, sessionCoverage } from './coverage';
import { useSessions, type EnrichedSession } from './hooks/useSessions';
import { SessionCalendar } from './SessionCalendar';

/** The week chips show this week and the next four. */
const WINDOW_WEEKS = 5;

const monthIndex = (date: string) => Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7)) - 1;

const CoverageFigure: React.FC<{ filled: number; required: number; label: string }> = ({
  filled,
  required,
  label,
}) => (
  <span className="flex flex-col items-end">
    <span
      className={`font-heading text-[15px] font-extrabold tabular-nums ${
        filled < required ? 'text-accent-700' : ''
      }`}
    >
      {filled}/{required}
    </span>
    {label}
  </span>
);

const SessionRow: React.FC<{
  session: EnrichedSession;
  mine: boolean;
  hall: string;
  language: string;
}> = ({ session, mine, hall, language }) => {
  const { t } = useTranslation();
  const coverage = sessionCoverage(session);
  const groups = (session.player_groups ?? []).map((g) => g.name).join(' · ');
  return (
    <li>
      <Link
        to={`/sessions/${session.id}`}
        data-testid="session-row"
        data-session-id={session.id}
        data-session-date={session.session_date}
        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-divider py-[11px] text-text no-underline hover:bg-neutral-100 hover:no-underline"
      >
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="flex flex-wrap items-baseline gap-2">
            <span className="text-[14.5px] font-semibold">
              {formatDayMonth(session.session_date, language)}
            </span>
            <span className="text-[13px] tabular-nums">
              {formatTimeRange(session.start_time, session.end_time)}
            </span>
            {mine && <Tag className="!px-1.5 !py-0">{t('sessions.you')}</Tag>}
            {session.is_time_overridden && (
              <Tag variant="outline" className="!px-1.5 !py-0">
                {t('sessions.changed')}
              </Tag>
            )}
            {!session.published_at && (
              <Tag variant="accent-2" className="!px-1.5 !py-0">
                {t('sessions.draft')}
              </Tag>
            )}
          </span>
          <span className="truncate text-[12.5px] text-neutral-700">
            {[hall || t('sessions.noHall'), groups || t('sessions.allGroups')].join(' · ')}
          </span>
        </span>
        <span className="flex gap-3.5 text-xs text-neutral-700">
          <CoverageFigure
            filled={coverage.regular.filled}
            required={coverage.regular.required}
            label={t('sessions.regulars')}
          />
          <CoverageFigure
            filled={coverage.junior.filled}
            required={coverage.junior.required}
            label={t('sessions.coaches')}
          />
        </span>
      </Link>
    </li>
  );
};

/**
 * The sessions of the current season: hall filter, "only mine", five week chips (this week and
 * the next four, with arrows to page on) beside a month calendar that reaches every session of
 * the season, and the sessions of the selected week. Older seasons are not shown (they will be
 * archived). Head-trainers also see drafts and can publish and bulk assign.
 * A row opens the session.
 */
const SessionListBody: React.FC<{ season: Season }> = ({ season }) => {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? 'de';
  const { user } = useAuth();
  const { canManageSeasons } = usePermissions();
  const { locations } = useLocations();
  const { sessions, loading, error, refetch, publishRange, unpublishRange } = useSessions({
    seasonId: season.id,
  });
  const today = zurichToday();

  const [hall, setHall] = useState('all');
  const [mine, setMine] = useState(false);
  const [pickedWeek, setPickedWeek] = useState<string | null>(null);
  const [windowOverride, setWindowOverride] = useState<string | null>(null);
  const [monthOverride, setMonthOverride] = useState<number | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const closeNotice = useCallback(() => setNotice(null), []);

  // The week chips start at this calendar week; the calendar reaches every session of the
  // season, so earlier weeks are one click away there
  const currentWeek = weekStart(today);
  const sessionWeeks = useMemo(
    () => [...new Set(sessions.map((s) => weekStart(s.session_date)))].sort(),
    [sessions],
  );
  const firstWeek = sessionWeeks[0] ?? currentWeek;
  const lastWeek = sessionWeeks[sessionWeeks.length - 1] ?? currentWeek;

  // The chips show five consecutive weeks from the window start; the arrows move it by five.
  // Picking an earlier week in the calendar moves the window there, and the left arrow can then
  // go back as far as the first week of the season; from the current week it cannot go back.
  const windowStart = windowOverride ?? currentWeek;
  const windowWeeks = Array.from({ length: WINDOW_WEEKS }, (_, i) =>
    addDaysToDate(windowStart, i * 7),
  );
  const weeksWithSessions = new Set(sessionWeeks);
  const selectedWeek =
    pickedWeek && windowWeeks.includes(pickedWeek)
      ? pickedWeek
      : (windowWeeks.find((w) => weeksWithSessions.has(w)) ?? windowWeeks[0]);
  const earliestWindow = windowStart < currentWeek ? firstWeek : currentWeek;
  const canPage = {
    prev: windowStart > earliestWindow,
    next: addDaysToDate(windowStart, WINDOW_WEEKS * 7) <= lastWeek,
  };
  const pageWindow = (direction: -1 | 1) => {
    let next = addDaysToDate(windowStart, direction * WINDOW_WEEKS * 7);
    if (direction < 0 && next < earliestWindow) next = earliestWindow;
    setWindowOverride(next === currentWeek ? null : next);
    setPickedWeek(null);
    setMonthOverride(null);
  };

  const halls = locations.filter((l) => sessions.some((s) => s.location_id === l.id));
  const hallName = (s: EnrichedSession) => s.location?.name ?? '';
  const draftCount = sessions.filter((s) => !s.published_at).length;

  const visible = sessions
    .filter((s) => weekStart(s.session_date) === selectedWeek)
    .filter((s) => hall === 'all' || s.location_id === hall)
    .filter((s) => !mine || isAssigned(s, user?.id))
    .sort(
      (a, b) =>
        a.session_date.localeCompare(b.session_date) || a.start_time.localeCompare(b.start_time),
    );

  const minMonth = Math.min(monthIndex(today), monthIndex(firstWeek));
  const maxMonth = Math.max(minMonth, monthIndex(lastWeek));
  const month = Math.min(maxMonth, Math.max(minMonth, monthOverride ?? monthIndex(selectedWeek)));

  const selectWeek = (week: string) => {
    setPickedWeek(week);
    setMonthOverride(null);
    // A week outside the five shown (picked in the calendar) moves the window to it
    if (!windowWeeks.includes(week)) setWindowOverride(week);
  };

  const hallOptions = [
    { value: 'all', label: t('sessions.allHalls') },
    ...halls.map((h) => ({ value: h.id, label: h.name })),
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-divider pb-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-accent-700">
            {t('sessions.kickerCurrent')}
          </span>
          <span className="font-heading text-[22px] font-extrabold">{season.name}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canManageSeasons && (
            <>
              <Button variant="secondary" size="sm" onClick={() => setBulkOpen(true)}>
                {t('sessions.bulkButton')}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setPublishOpen(true)}>
                {draftCount > 0
                  ? t('sessions.publishDrafts', { count: draftCount })
                  : t('sessions.publishButton')}
              </Button>
            </>
          )}
        </div>
      </div>
      <p className="-mt-2 text-[12.5px] text-neutral-700">
        {canManageSeasons ? t('sessions.subHead') : t('sessions.subTrainer')}
      </p>

      {error && <AuthError message={t('sessions.loadError')} />}

      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {halls.length > 0 && (
          <div
            role="radiogroup"
            aria-label={t('sessions.hallFilter')}
            className="flex flex-wrap border border-divider"
          >
            {hallOptions.map((option, index) => {
              const on = hall === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setHall(option.value)}
                  className={`cursor-pointer px-3 py-1.5 text-[13px] font-semibold ${
                    index > 0 ? 'border-l border-divider' : ''
                  } ${on ? 'bg-text text-bg' : 'bg-transparent text-text hover:bg-text/7'}`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        )}
        <button
          type="button"
          role="checkbox"
          aria-checked={mine}
          onClick={() => setMine((v) => !v)}
          className="flex cursor-pointer items-center gap-2 bg-transparent p-0 text-[13px] font-semibold text-text"
        >
          <span
            aria-hidden="true"
            className={`grid size-4 place-items-center border-[1.5px] border-text text-[11px] text-bg ${
              mine ? 'bg-text' : 'bg-transparent'
            }`}
          >
            {mine ? '✓' : ''}
          </span>
          {t('sessions.onlyMine')}
        </button>
      </div>

      <div
        className="flex w-fit max-w-full self-start border border-divider"
        role="group"
        aria-label={t('sessions.weeks')}
      >
        <button
          type="button"
          aria-label={t('sessions.weeksPrev')}
          disabled={!canPage.prev}
          onClick={() => pageWindow(-1)}
          className="grid w-8 flex-none cursor-pointer place-items-center border-r border-divider bg-transparent text-[17px] text-text hover:bg-text/7 disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent"
        >
          ←
        </button>
        <div className="flex min-w-0">
          {windowWeeks.map((week, index) => {
            const on = week === selectedWeek;
            const has = weeksWithSessions.has(week);
            const short = sessions.some(
              (s) => weekStart(s.session_date) === week && sessionCoverage(s).short,
            );
            return (
              <button
                key={week}
                type="button"
                aria-pressed={on}
                data-week={week}
                onClick={() => selectWeek(week)}
                className={`flex min-w-0 flex-none cursor-pointer flex-col items-start gap-0.5 px-2 pb-1 pt-1 text-[12px] font-semibold sm:px-2.5 ${
                  index > 0 ? 'border-l border-divider' : ''
                } ${on ? 'bg-text text-bg' : 'bg-transparent text-text hover:bg-text/7'}`}
              >
                <span className="whitespace-nowrap">
                  {t('shell.calendarWeek', { week: isoWeekNumber(week) })}
                </span>
                <span className="hidden whitespace-nowrap text-[10px] font-semibold opacity-75 sm:block">
                  {weekRange(week, language)}
                </span>
                <span
                  className={`h-[3px] w-full ${
                    !has ? 'bg-transparent' : short ? 'bg-accent' : 'bg-text'
                  }`}
                />
              </button>
            );
          })}
        </div>
        <button
          type="button"
          aria-label={t('sessions.weeksNext')}
          disabled={!canPage.next}
          onClick={() => pageWindow(1)}
          className="grid w-8 flex-none cursor-pointer place-items-center border-l border-divider bg-transparent text-[17px] text-text hover:bg-text/7 disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent"
        >
          →
        </button>
      </div>

      <div className="flex flex-wrap items-start gap-8">
        <div className="order-1 flex min-w-0 flex-1 basis-80 flex-col gap-4">
          {loading ? (
            <p role="status" className="text-sm text-neutral-700">
              {t('sessions.loading')}
            </p>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-neutral-700">{t('sessions.emptySeason')}</p>
          ) : visible.length === 0 ? (
            <p className="text-sm text-neutral-700">
              {weeksWithSessions.has(selectedWeek) ? t('sessions.empty') : t('sessions.emptyWeek')}
            </p>
          ) : (
            <Section
              title={`${t('shell.calendarWeek', { week: isoWeekNumber(selectedWeek) })} · ${weekRange(selectedWeek, language)}`}
            >
              <ul className="-mt-1 flex flex-col">
                {visible.map((s) => (
                  <SessionRow
                    key={s.id}
                    session={s}
                    mine={isAssigned(s, user?.id)}
                    hall={hallName(s)}
                    language={language}
                  />
                ))}
              </ul>
            </Section>
          )}
        </div>

        {sessions.length > 0 && (
          <div className="order-2 flex-[0_1_400px]">
            <SessionCalendar
              sessions={sessions}
              selectedWeek={selectedWeek}
              onSelectWeek={selectWeek}
              month={month}
              onMonthChange={setMonthOverride}
              minMonth={minMonth}
              maxMonth={maxMonth}
              today={today}
              language={language}
            />
          </div>
        )}
      </div>

      {canManageSeasons && (
        <>
          <PublishSessionsModal
            isOpen={publishOpen}
            onClose={() => setPublishOpen(false)}
            sessions={sessions}
            onPublish={(from, to) => publishRange(season.id, from, to)}
            onUnpublish={(from, to) => unpublishRange(season.id, from, to)}
          />
          <BulkAssignModal
            isOpen={bulkOpen}
            onClose={() => setBulkOpen(false)}
            seasonId={season.id}
            sessions={sessions}
            onSuccess={async (assigned, name) => {
              await refetch();
              setNotice(
                assigned > 0
                  ? t('sessions.bulk.done', { count: assigned, name })
                  : t('sessions.bulk.doneNone'),
              );
            }}
          />
        </>
      )}
      {notice && <Notice message={notice} onClose={closeNotice} />}
    </div>
  );
};

export const SessionList: React.FC = () => {
  const { t } = useTranslation();
  const { canManageSeasons } = usePermissions();
  // Only the current season (the active one) is shown; older seasons will be archived
  const { season, loading } = useActiveSeason();

  if (loading) {
    return (
      <p role="status" className="text-sm text-neutral-700">
        {t('sessions.loading')}
      </p>
    );
  }

  if (!season) {
    return (
      <div className="flex flex-col gap-1">
        <p className="text-sm text-neutral-700">{t('sessions.noSeason')}</p>
        {canManageSeasons && (
          <Link
            to="/settings"
            className="text-sm font-extrabold text-accent no-underline hover:underline"
          >
            {t('sessions.noSeasonHead')}
          </Link>
        )}
      </div>
    );
  }

  return <SessionListBody season={season} />;
};
