import { describe, it, expect } from 'vitest';
import {
  addDaysToDate,
  formatDate,
  formatTimeRange,
  isoWeekNumber,
  timeAgo,
  toLocalDateString,
  weekdayShort,
  weekRange,
  zurichToday,
} from '../lib/dates';

describe('toLocalDateString', () => {
  it('formats the local calendar date, not the UTC date, just after midnight', () => {
    expect(toLocalDateString(new Date(2026, 9, 12, 0, 30))).toBe('2026-10-12');
  });

  it('zero-pads month and day', () => {
    expect(toLocalDateString(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});

describe('Zurich dates and calendar weeks', () => {
  it('computes ISO calendar weeks, including year boundaries', () => {
    expect(isoWeekNumber('2026-10-05')).toBe(41); // matches the design: Mon 5 Oct 2026 is CW 41
    expect(isoWeekNumber('2026-10-11')).toBe(41);
    expect(isoWeekNumber('2026-10-12')).toBe(42);
    expect(isoWeekNumber('2021-01-01')).toBe(53); // belongs to the previous ISO year
    expect(isoWeekNumber('2024-12-30')).toBe(1); // belongs to the next ISO year
  });

  it('takes the date in Zurich, not in UTC', () => {
    // 23:30 UTC on 14 Oct is already 15 Oct in Zurich (UTC+2 in summer time)
    expect(zurichToday(new Date('2026-10-14T23:30:00Z'))).toBe('2026-10-15');
    expect(zurichToday(new Date('2026-10-14T10:00:00Z'))).toBe('2026-10-14');
  });

  it('formats weekdays, time ranges and dates in both languages', () => {
    expect(weekdayShort(2, 'en')).toBe('Tue');
    expect(weekdayShort(2, 'de')).toMatch(/^Di/);
    expect(formatTimeRange('17:30:00', '19:00:00')).toBe('17:30–19:00');
    expect(formatDate('2026-08-01', 'en')).toBe('1 Aug 2026');
    expect(formatDate('2026-08-01', 'de')).toMatch(/^1\. Aug/);
  });
});

describe('weekRange', () => {
  it('gives the Monday-to-Sunday range of the week containing the date', () => {
    expect(weekRange('2026-10-05', 'en')).toBe('5–11 Oct'); // CW 41 in the design
    expect(weekRange('2026-10-08', 'en')).toBe('5–11 Oct');
    expect(weekRange('2026-10-11', 'en')).toBe('5–11 Oct'); // a Sunday belongs to the week before
  });

  it('names both months when the week crosses a month boundary', () => {
    // the short name of September depends on the Intl data ("Sep" or "Sept")
    expect(weekRange('2026-09-30', 'en')).toMatch(/^28 Sept? – 4 Oct$/);
    expect(weekRange('2026-12-31', 'en')).toBe('28 Dec – 3 Jan');
  });

  it('writes German dates with a period after the day', () => {
    expect(weekRange('2026-10-07', 'de')).toMatch(/^5\.–11\. Okt/);
    expect(weekRange('2026-09-30', 'de')).toMatch(/^28\. Sep.* – 4\. Okt/);
  });
});

describe('timeAgo', () => {
  const now = new Date('2026-10-28T12:00:00Z');
  const ago = (ms: number) => new Date(now.getTime() - ms);

  it('says how long ago in English', () => {
    expect(timeAgo(ago(20_000), 'en', now)).toBe('now');
    expect(timeAgo(ago(5 * 60_000), 'en', now)).toBe('5 minutes ago');
    expect(timeAgo(ago(5 * 3_600_000), 'en', now)).toBe('5 hours ago');
    expect(timeAgo(ago(30 * 3_600_000), 'en', now)).toBe('yesterday');
    expect(timeAgo(ago(3 * 86_400_000), 'en', now)).toBe('3 days ago');
  });

  it('falls back to the date after a week, and speaks German', () => {
    expect(timeAgo(ago(10 * 86_400_000), 'en', now)).toBe('18 Oct');
    expect(timeAgo(ago(3 * 86_400_000), 'de', now)).toMatch(/^vor 3 Tagen$/);
    expect(timeAgo(ago(30 * 3_600_000), 'de', now)).toBe('gestern');
  });
});

describe('addDaysToDate', () => {
  it('adds and subtracts calendar days across month and year ends', () => {
    expect(addDaysToDate('2026-10-28', 13)).toBe('2026-11-10');
    expect(addDaysToDate('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysToDate('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDaysToDate('2026-10-28', 0)).toBe('2026-10-28');
  });
});
