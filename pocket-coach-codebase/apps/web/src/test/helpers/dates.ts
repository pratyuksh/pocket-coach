import { zurichNow } from '../../lib/dates';

/** `YYYY-MM-DD` for today in Zurich plus a number of days (negative for the past). */
export const addDays = (days: number): string => {
  const [y, m, d] = zurichNow().date.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
};
