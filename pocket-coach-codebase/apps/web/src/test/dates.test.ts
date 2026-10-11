import { describe, it, expect } from 'vitest';
import { toLocalDateString } from '../lib/dates';

describe('toLocalDateString', () => {
  it('formats the local calendar date, not the UTC date, just after midnight', () => {
    expect(toLocalDateString(new Date(2026, 9, 12, 0, 30))).toBe('2026-10-12');
  });

  it('zero-pads month and day', () => {
    expect(toLocalDateString(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});
