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
