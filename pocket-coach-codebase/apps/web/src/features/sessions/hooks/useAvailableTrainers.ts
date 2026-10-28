import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AssignmentTrack, Profile } from '@pocket-coach/shared-types';
import { supabase } from '../../../lib/supabase';
import { useTeamStats, EMPTY_STATS } from '../../trainers/hooks/useTeamStats';
import { useTrainers } from '../../trainers/hooks/useTrainers';
import type { EnrichedSession } from './useSessions';

export interface AvailableTrainer {
  profile: Profile;
  /** Sessions this season (completed and upcoming), the fewest come first */
  sessions: number;
}

interface BusyRow {
  profile_id: string | null;
  session: { start_time: string; end_time: string };
}

/**
 * The people who could fill an open slot of a session on a track: active, with the right 14/18
 * label for the track (the label means the junior track), not already working this session, and
 * with no other session at an overlapping time that day, in any hall. Availability surveys
 * arrive in Phase 2.1; until then "available" means free of conflicts. Sorted by fewest
 * sessions this season, then by name.
 */
export function useAvailableTrainers(
  session: EnrichedSession | null,
  track: AssignmentTrack,
  enabled: boolean,
) {
  const { trainers, loading: trainersLoading } = useTrainers();
  const { stats } = useTeamStats(session?.season_id, enabled);
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchBusy = useCallback(async () => {
    if (!enabled || !session) return;
    try {
      setLoading(true);
      setError(false);
      const { data, error: fetchErr } = await supabase
        .from('session_assignments')
        .select('profile_id, session:sessions!inner(start_time, end_time)')
        .eq('status', 'active')
        .eq('session.session_date', session.session_date)
        .neq('session_id', session.id);
      if (fetchErr) throw fetchErr;
      const overlapping = ((data ?? []) as unknown as BusyRow[]).filter(
        (row) =>
          row.profile_id &&
          row.session.start_time < session.end_time &&
          session.start_time < row.session.end_time,
      );
      setBusy(new Set(overlapping.map((row) => row.profile_id as string)));
    } catch (err) {
      console.error('Error loading conflicting sessions:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [enabled, session]);

  useEffect(() => {
    void fetchBusy();
  }, [fetchBusy]);

  const candidates = useMemo<AvailableTrainer[]>(() => {
    if (!session) return [];
    const onSession = new Set(
      (session.assignments ?? [])
        .filter((a) => a.status === 'active' && a.profile_id)
        .map((a) => a.profile_id as string),
    );
    return trainers
      .filter((p) => p.is_active && p.is_junior_coach === (track === 'junior_coach'))
      .filter((p) => !onSession.has(p.id) && !busy.has(p.id))
      .map((p) => {
        const s = stats[p.id] ?? EMPTY_STATS;
        return { profile: p, sessions: s.completed + s.upcoming };
      })
      .sort(
        (a, b) =>
          a.sessions - b.sessions || a.profile.display_name.localeCompare(b.profile.display_name),
      );
  }, [session, trainers, busy, stats, track]);

  return { candidates, loading: loading || trainersLoading, error };
}
