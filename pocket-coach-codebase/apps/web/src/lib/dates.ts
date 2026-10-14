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
