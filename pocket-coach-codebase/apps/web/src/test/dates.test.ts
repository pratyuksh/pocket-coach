import { describe, it, expect } from 'vitest';
import {
  formatDate,
  formatTimeRange,
  isoWeekNumber,
  toLocalDateString,
  weekdayShort,
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
