import React from 'react';
import { useTranslation } from 'react-i18next';
import { addDaysToDate, isoWeekNumber, monthTitle, weekdayShort } from '../../lib/dates';
import { sessionCoverage } from './coverage';
import type { EnrichedSession } from './hooks/useSessions';

interface SessionCalendarProps {
  sessions: EnrichedSession[];
  /** Monday of the selected week, `YYYY-MM-DD` */
  selectedWeek: string | null;
  onSelectWeek: (weekStart: string) => void;
  /** Month shown, as `year * 12 + month` (month 0-11) */
  month: number;
  onMonthChange: (month: number) => void;
  minMonth: number;
  maxMonth: number;
  today: string;
  language: string;
}

interface Cell {
  date: string;
  day: number;
  inMonth: boolean;
}

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0];

/** The weeks (Monday first) that cover a month; `month` is 0-11. */
const weeksOf = (year: number, month: number): Cell[][] => {
  const first = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const dow = new Date(Date.UTC(year, month, 1)).getUTCDay() || 7;
  const start = addDaysToDate(first, 1 - dow);
  const weeks: Cell[][] = [];
  for (let w = 0; w < 6; w++) {
    const week = Array.from({ length: 7 }, (_, k) => {
      const date = addDaysToDate(start, w * 7 + k);
      return { date, day: Number(date.slice(8)), inMonth: Number(date.slice(5, 7)) === month + 1 };
    });
    if (w > 0 && !week[0].inMonth) break;
    weeks.push(week);
  }
  return weeks;
};

/**
 * Month calendar of a season's sessions, with the calendar week of each row. A day with a
 * session has a black square, or a red one when a session that day is short of people. Clicking
 * a week with sessions selects it; the selected week has a red edge.
 */
export const SessionCalendar: React.FC<SessionCalendarProps> = ({
  sessions,
  selectedWeek,
  onSelectWeek,
  month,
  onMonthChange,
  minMonth,
  maxMonth,
  today,
  language,
}) => {
  const { t } = useTranslation();
  const year = Math.floor(month / 12);
  const m = month % 12;

  const byDate = new Map<string, { short: boolean }>();
  for (const s of sessions) {
    const prev = byDate.get(s.session_date);
    byDate.set(s.session_date, { short: (prev?.short ?? false) || sessionCoverage(s).short });
  }
  const weeksWithSessions = new Set<string>();
  for (const date of byDate.keys()) {
    const dow = new Date(`${date}T12:00:00Z`).getUTCDay() || 7;
    weeksWithSessions.add(addDaysToDate(date, 1 - dow));
  }

  const arrow =
    'grid h-7 w-[30px] place-items-center border border-divider bg-transparent text-text cursor-pointer hover:bg-neutral-100 disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent';

  return (
    <div className="flex min-w-[280px] flex-col gap-2.5" data-testid="session-calendar">
      <div className="flex items-center justify-between">
        <button
          type="button"
          className={arrow}
          aria-label={t('sessions.calendar.prev')}
          disabled={month <= minMonth}
          onClick={() => onMonthChange(month - 1)}
        >
          ←
        </button>
        <span aria-live="polite" className="font-heading text-[15px] font-extrabold">
          {monthTitle(year, m, language)}
        </span>
        <button
          type="button"
          className={arrow}
          aria-label={t('sessions.calendar.next')}
          disabled={month >= maxMonth}
          onClick={() => onMonthChange(month + 1)}
        >
          →
        </button>
      </div>

      <table
        aria-label={t('sessions.calendar.label')}
        className="w-full table-fixed border-collapse"
      >
        <thead>
          <tr className="border-b-2 border-text">
            <th scope="col" className="w-9 py-1 text-[10.5px] font-semibold text-neutral-700">
              {t('sessions.calendar.week')}
            </th>
            {WEEKDAYS.map((d) => (
              <th key={d} scope="col" className="py-1 text-[10.5px] font-semibold text-neutral-700">
                {weekdayShort(d, language).slice(0, 2)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeksOf(year, m).map((week) => {
            const start = week[0].date;
            const has = weeksWithSessions.has(start);
            const on = start === selectedWeek;
            const cw = isoWeekNumber(start);
            return (
              <tr
                key={start}
                data-week={start}
                data-selected={on || undefined}
                onClick={has ? () => onSelectWeek(start) : undefined}
                className={`border-b border-divider ${has ? 'cursor-pointer' : ''} ${
                  on ? 'bg-accent-100 shadow-[inset_3px_0_0_var(--color-accent)]' : ''
                }`}
              >
                <th scope="row" className="p-0 font-heading text-[11px] font-extrabold">
                  {has ? (
                    <button
                      type="button"
                      aria-label={t('sessions.calendar.selectWeek', { week: cw })}
                      aria-pressed={on}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectWeek(start);
                      }}
                      className="h-[42px] w-full cursor-pointer bg-transparent text-accent-700"
                    >
                      {cw}
                    </button>
                  ) : (
                    <span className="text-accent-700">{cw}</span>
                  )}
                </th>
                {week.map((cell) => {
                  const info = byDate.get(cell.date);
                  const isToday = cell.date === today;
                  return (
                    <td
                      key={cell.date}
                      data-date={cell.date}
                      data-state={info ? (info.short ? 'short' : 'full') : undefined}
                      className={`h-[42px] p-0 text-center align-middle text-[12.5px] ${
                        cell.inMonth ? '' : 'text-neutral-500'
                      } ${isToday || info ? 'font-extrabold' : 'font-medium'} ${
                        isToday ? 'text-accent-700 underline' : ''
                      }`}
                    >
                      <span className="flex flex-col items-center justify-center gap-[3px]">
                        {cell.day}
                        <span
                          aria-hidden="true"
                          className={`size-2 ${
                            info ? (info.short ? 'bg-accent' : 'bg-text') : 'bg-transparent'
                          }`}
                        />
                      </span>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

      <ul className="flex flex-wrap gap-3 text-[11px] text-neutral-700">
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2 bg-text" />
          {t('sessions.calendar.legendFull')}
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2 bg-accent" />
          {t('sessions.calendar.legendShort')}
        </li>
      </ul>
    </div>
  );
};
