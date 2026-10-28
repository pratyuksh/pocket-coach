import { describe, it, expect } from 'vitest';
import { coverableGaps } from '../features/home/coverable';
import type { CoverageGap, CoverageSession } from '../features/home/hooks/useCoverage';

const gap = (
  sessionId: string,
  track: CoverageGap['track'],
  date: string,
  startTime: string,
  endTime: string,
): CoverageGap => ({ sessionId, track, date, startTime, endTime, locationId: null, missing: 1 });

const session = (
  id: string,
  date: string,
  startTime: string,
  endTime: string,
  activeIds: string[] = [],
): CoverageSession => ({ id, date, startTime, endTime, activeIds });

describe('coverableGaps', () => {
  it('offers regular gaps to a trainer and junior gaps to a 14/18 coach', () => {
    const gaps = [
      gap('a', 'regular', '2026-11-02', '17:30:00', '19:00:00'),
      gap('b', 'junior_coach', '2026-11-03', '17:30:00', '19:00:00'),
    ];
    const sessions = [
      session('a', '2026-11-02', '17:30:00', '19:00:00'),
      session('b', '2026-11-03', '17:30:00', '19:00:00'),
    ];
    expect(coverableGaps({ gaps, sessions }, 'me', false).map((g) => g.sessionId)).toEqual(['a']);
    expect(coverableGaps({ gaps, sessions }, 'me', true).map((g) => g.sessionId)).toEqual(['b']);
  });

  it('leaves out sessions the person already works', () => {
    const gaps = [gap('a', 'regular', '2026-11-02', '17:30:00', '19:00:00')];
    const sessions = [session('a', '2026-11-02', '17:30:00', '19:00:00', ['me', 'other'])];
    expect(coverableGaps({ gaps, sessions }, 'me', false)).toEqual([]);
    expect(coverableGaps({ gaps, sessions }, 'other-person', false)).toHaveLength(1);
  });

  it('leaves out gaps that overlap another session of the person, in any hall', () => {
    const gaps = [
      gap('gap-overlap', 'regular', '2026-11-02', '18:00:00', '19:30:00'),
      gap('gap-next-to', 'regular', '2026-11-02', '19:00:00', '20:30:00'),
      gap('gap-other-day', 'regular', '2026-11-03', '17:30:00', '19:00:00'),
    ];
    const sessions = [
      session('mine', '2026-11-02', '17:30:00', '19:00:00', ['me']),
      session('gap-overlap', '2026-11-02', '18:00:00', '19:30:00'),
      session('gap-next-to', '2026-11-02', '19:00:00', '20:30:00'),
      session('gap-other-day', '2026-11-03', '17:30:00', '19:00:00'),
    ];
    expect(coverableGaps({ gaps, sessions }, 'me', false).map((g) => g.sessionId)).toEqual([
      'gap-next-to',
      'gap-other-day',
    ]);
  });
});
