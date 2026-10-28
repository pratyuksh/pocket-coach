/**
 * Formats a date as `YYYY-MM-DD` in the user's local time zone, matching the
 * `session_date` column format. `toISOString()` would use UTC and roll over to the
 * wrong day around midnight in Central European time.
 */
export function toLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const ZURICH = 'Europe/Zurich';

/** Today's date in Europe/Zurich as `YYYY-MM-DD`, whatever the device's time zone is. */
export function zurichToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ZURICH,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** ISO 8601 calendar week number (weeks start on Monday; week 1 contains the first Thursday). */
export function isoWeekNumber(dateString: string): number {
  const [y, m, d] = dateString.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dayOfWeek = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayOfWeek);
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
  return Math.ceil(((date.getTime() - yearStart) / 86_400_000 + 1) / 7);
}

/** Date formats follow Swiss usage: day first, in English or German. */
const localeFor = (language: string) => (language.startsWith('de') ? 'de-CH' : 'en-GB');

/** Short weekday name for a day-of-week number (0 = Sunday), in the given language. */
export function weekdayShort(dayOfWeek: number, language: string): string {
  // 2024-01-07 was a Sunday.
  const date = new Date(Date.UTC(2024, 0, 7 + dayOfWeek));
  return new Intl.DateTimeFormat(localeFor(language), { weekday: 'short', timeZone: 'UTC' }).format(
    date,
  );
}

/** `17:30:00` and `19:00:00` become `17:30–19:00`. */
export function formatTimeRange(start: string, end: string): string {
  return `${start.slice(0, 5)}–${end.slice(0, 5)}`;
}

/** `2026-08-01` as a readable date in the given language, for example `1 Aug 2026`. */
export function formatDate(dateString: string, language: string): string {
  const [y, m, d] = dateString.split('-').map(Number);
  return new Intl.DateTimeFormat(localeFor(language), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** The current date (`YYYY-MM-DD`) and time (`HH:MM`) in Europe/Zurich. */
export function zurichNow(now: Date = new Date()): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZURICH,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`,
  };
}

/** `2026-10-09` as a short weekday and date, for example `Fri 9 Oct` (no year). */
export function formatDayMonth(dateString: string, language: string): string {
  const [y, m, d] = dateString.split('-').map(Number);
  return new Intl.DateTimeFormat(localeFor(language), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/**
 * The Monday-to-Sunday week containing a date, as a short range: `5–11 Oct` or, across a month
 * boundary, `28 Sep – 4 Oct`.
 */
export function weekRange(dateString: string, language: string): string {
  const [y, m, d] = dateString.split('-').map(Number);
  const monday = new Date(
    Date.UTC(y, m - 1, d - ((new Date(Date.UTC(y, m - 1, d)).getUTCDay() || 7) - 1)),
  );
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const month = (date: Date) =>
    new Intl.DateTimeFormat(localeFor(language), { month: 'short', timeZone: 'UTC' }).format(date);
  const de = language.startsWith('de');
  const dayOf = (date: Date) => `${date.getUTCDate()}${de ? '.' : ''}`;
  if (monday.getUTCMonth() === sunday.getUTCMonth()) {
    return `${dayOf(monday)}–${dayOf(sunday)} ${month(sunday)}`;
  }
  return `${dayOf(monday)} ${month(monday)} – ${dayOf(sunday)} ${month(sunday)}`;
}

/**
 * How long ago a moment was, for example `just now`, `5 hours ago`, `yesterday`, `3 days ago`;
 * a week or more ago it becomes the date.
 */
export function timeAgo(then: string | Date, language: string, now: Date = new Date()): string {
  const minutes = Math.floor((now.getTime() - new Date(then).getTime()) / 60_000);
  const rtf = new Intl.RelativeTimeFormat(localeFor(language), { numeric: 'auto' });
  if (minutes < 1) return rtf.format(0, 'second');
  if (minutes < 60) return rtf.format(-minutes, 'minute');
  if (minutes < 60 * 24) return rtf.format(-Math.floor(minutes / 60), 'hour');
  const days = Math.floor(minutes / (60 * 24));
  if (days < 7) return rtf.format(-days, 'day');
  return new Intl.DateTimeFormat(localeFor(language), {
    day: 'numeric',
    month: 'short',
    timeZone: ZURICH,
  }).format(new Date(then));
}

/** `YYYY-MM-DD` plus a number of days (negative for earlier), calendar arithmetic only. */
export function addDaysToDate(dateString: string, days: number): string {
  const [y, m, d] = dateString.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** The Monday of the week containing a date, `YYYY-MM-DD`. */
export function weekStart(dateString: string): string {
  const [y, m, d] = dateString.split('-').map(Number);
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay() || 7;
  return addDaysToDate(dateString, 1 - day);
}

/** A month and year as a heading, for example `October 2026` or `Oktober 2026` (month is 0-11). */
export function monthTitle(year: number, month: number, language: string): string {
  return new Intl.DateTimeFormat(localeFor(language), {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month, 1)));
}
