import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { addDaysToDate, zurichNow } from '../../../lib/dates';

/** The Dashboard and the Gaps page cover today and the 13 days after it. */
export const GAP_WINDOW_DAYS = 14;

export type GapTrack = 'regular' | 'junior_coach';

/** One track of one session that has fewer active people than it needs. */
export interface CoverageGap {
  sessionId: string;
  track: GapTrack;
  date: string;
  startTime: string;
  endTime: string;
  locationId: string | null;
  missing: number;
}

/** An upcoming published session with the people on it, for checks such as "already on it". */
export interface CoverageSession {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  /** Profile ids with an active assignment */
  activeIds: string[];
}

export interface Coverage {
  /** Positions the published, upcoming sessions need */
  needed: number;
  /** Positions filled (extra people on a track do not count twice) */
  filled: number;
  gaps: CoverageGap[];
  sessions: CoverageSession[];
}

const EMPTY: Coverage = { needed: 0, filled: 0, gaps: [], sessions: [] };

interface SessionRow {
  id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  location_id: string | null;
  required_regular: number;
  required_junior: number;
  assignments: { track: GapTrack; status: string; profile_id: string | null }[];
}

/**
 * How well the published, upcoming sessions of one season (the active one) are staffed; gaps of
 * older seasons are stale and left out. A gap is a track with fewer
 * active assignments than the session requires (the rule in the plan for Sub-Phase 1.5; this
 * hook only reads, volunteering comes with that sub-phase). Sessions that have ended are left
 * out, drafts are not counted.
 */
export function useCoverage(seasonId: string | null | undefined, enabled: boolean) {
  const [coverage, setCoverage] = useState<Coverage>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchCoverage = useCallback(async () => {
    if (!enabled || !seasonId) {
      setCoverage(EMPTY);
      setLoading(false);
      return;
    }
    try {
      setError(false);
      const now = zurichNow();
      const { data, error: fetchErr } = await supabase
        .from('sessions')
        .select(
          'id, session_date, start_time, end_time, location_id, required_regular, required_junior, assignments:session_assignments(track, status, profile_id)',
        )
        .eq('season_id', seasonId)
        .not('published_at', 'is', null)
        .gte('session_date', now.date)
        .order('session_date', { ascending: true })
        .order('start_time', { ascending: true });
      if (fetchErr) throw fetchErr;

      const nowKey = `${now.date}T${now.time}`;
      let needed = 0;
      let filled = 0;
      const gaps: CoverageGap[] = [];
      const sessions: CoverageSession[] = [];
      for (const row of (data ?? []) as unknown as SessionRow[]) {
        if (`${row.session_date}T${row.end_time.slice(0, 5)}` <= nowKey) continue;
        sessions.push({
          id: row.id,
          date: row.session_date,
          startTime: row.start_time,
          endTime: row.end_time,
          activeIds: row.assignments
            .filter((a) => a.status === 'active' && a.profile_id)
            .map((a) => a.profile_id as string),
        });
        const tracks: [GapTrack, number][] = [
          ['regular', row.required_regular],
          ['junior_coach', row.required_junior],
        ];
        for (const [track, required] of tracks) {
          const active = row.assignments.filter(
            (a) => a.track === track && a.status === 'active',
          ).length;
          needed += required;
          filled += Math.min(active, required);
          if (active < required) {
            gaps.push({
              sessionId: row.id,
              track,
              date: row.session_date,
              startTime: row.start_time,
              endTime: row.end_time,
              locationId: row.location_id,
              missing: required - active,
            });
          }
        }
      }
      setCoverage({ needed, filled, gaps, sessions });
    } catch (err) {
      console.error('Error loading coverage:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [seasonId, enabled]);

  useEffect(() => {
    void fetchCoverage();
  }, [fetchCoverage]);

  return { coverage, loading, error, refetch: fetchCoverage };
}

/** The gaps of the next `days` days: today and the days after it. */
export function gapsWithin(
  gaps: CoverageGap[],
  today: string,
  days: number = GAP_WINDOW_DAYS,
): CoverageGap[] {
  const lastDay = addDaysToDate(today, days - 1);
  return gaps.filter((gap) => gap.date <= lastDay);
}
