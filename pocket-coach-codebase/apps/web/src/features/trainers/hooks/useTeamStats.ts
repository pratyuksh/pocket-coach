import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';

export interface MemberStats {
  asTrainer: number;
  asAssistant: number;
  asJunior: number;
  completed: number;
  upcoming: number;
  asSubstitute: number;
}

export const EMPTY_STATS: MemberStats = {
  asTrainer: 0,
  asAssistant: 0,
  asJunior: 0,
  completed: 0,
  upcoming: 0,
  asSubstitute: 0,
};

interface StatsRow {
  profile_id: string;
  as_trainer: number;
  as_assistant: number;
  as_junior: number;
  completed: number;
  upcoming: number;
  as_substitute: number;
}

/**
 * Session counts per person for one season (Head-trainer and above only: the database refuses
 * everyone else). "Completed" is the shared definition in the `session_log` view. People
 * without assignments have no row, so look them up with `EMPTY_STATS` as the default.
 */
export function useTeamStats(seasonId: string | null | undefined, enabled: boolean) {
  const [stats, setStats] = useState<Record<string, MemberStats>>({});
  const [error, setError] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!enabled || !seasonId) {
      setStats({});
      setError(false);
      return;
    }
    try {
      const { data, error: rpcErr } = await supabase.rpc('team_session_stats', {
        p_season_id: seasonId,
      });
      if (rpcErr) throw rpcErr;
      const next: Record<string, MemberStats> = {};
      for (const row of (data ?? []) as StatsRow[]) {
        next[row.profile_id] = {
          asTrainer: row.as_trainer,
          asAssistant: row.as_assistant,
          asJunior: row.as_junior,
          completed: row.completed,
          upcoming: row.upcoming,
          asSubstitute: row.as_substitute,
        };
      }
      setStats(next);
      setError(false);
    } catch (err) {
      console.error('Error loading team stats:', err);
      setError(true);
    }
  }, [seasonId, enabled]);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  return { stats, error, refetch: fetchStats };
}

/** Counts for one person: Head-trainers for anyone, a trainer for themselves (database rule). */
export function usePersonStats(
  seasonId: string | null | undefined,
  profileId: string | undefined,
  enabled: boolean,
) {
  const [stats, setStats] = useState<MemberStats>(EMPTY_STATS);
  const [error, setError] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!enabled || !seasonId || !profileId) {
      setStats(EMPTY_STATS);
      setError(false);
      return;
    }
    try {
      const { data, error: rpcErr } = await supabase.rpc('team_session_stats', {
        p_season_id: seasonId,
        p_profile_id: profileId,
      });
      if (rpcErr) throw rpcErr;
      const row = ((data ?? []) as StatsRow[])[0];
      setStats(
        row
          ? {
              asTrainer: row.as_trainer,
              asAssistant: row.as_assistant,
              asJunior: row.as_junior,
              completed: row.completed,
              upcoming: row.upcoming,
              asSubstitute: row.as_substitute,
            }
          : EMPTY_STATS,
      );
      setError(false);
    } catch (err) {
      console.error('Error loading person stats:', err);
      setError(true);
    }
  }, [seasonId, profileId, enabled]);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  return { stats, error, refetch: fetchStats };
}
