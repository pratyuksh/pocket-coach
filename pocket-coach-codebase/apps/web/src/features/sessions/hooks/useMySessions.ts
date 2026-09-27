import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';
import type { EnrichedSession } from './useSessions';
import type { AssignmentTrack, SessionRole, AssignmentStatus } from '@pocket-coach/shared-types';

export interface MySessionItem {
  assignment_id: string;
  track: AssignmentTrack;
  session_role: SessionRole;
  status: AssignmentStatus;
  is_substitute: boolean;
  assigned_at: string;
  session: EnrichedSession;
}

export function useMySessions(profileIdOverride?: string) {
  const { user } = useAuth();
  const targetProfileId = profileIdOverride || user?.id;

  const [mySessions, setMySessions] = useState<MySessionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMySessions = useCallback(async () => {
    if (!targetProfileId) {
      setMySessions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchErr } = await supabase
        .from('session_assignments')
        .select(
          `
          id,
          track,
          session_role,
          status,
          is_substitute,
          assigned_at,
          session:sessions(
            *,
            location:locations(*),
            session_player_groups(
              player_group:player_groups(*)
            )
          )
        `,
        )
        .eq('profile_id', targetProfileId);

      if (fetchErr) throw fetchErr;

      const items: MySessionItem[] = (data || [])
        .filter((row: any) => Boolean(row.session))
        .map((row: any) => {
          const s = row.session;
          const enrichedSession: EnrichedSession = {
            ...s,
            location: s.location || null,
            player_groups: (s.session_player_groups || [])
              .map((spg: any) => spg.player_group)
              .filter(Boolean),
          };

          return {
            assignment_id: row.id,
            track: row.track,
            session_role: row.session_role,
            status: row.status,
            is_substitute: row.is_substitute,
            assigned_at: row.assigned_at,
            session: enrichedSession,
          };
        })
        .sort((a, b) => {
          const dateCompare = a.session.session_date.localeCompare(b.session.session_date);
          if (dateCompare !== 0) return dateCompare;
          return a.session.start_time.localeCompare(b.session.start_time);
        });

      setMySessions(items);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch personal sessions');
    } finally {
      setLoading(false);
    }
  }, [targetProfileId]);

  useEffect(() => {
    fetchMySessions();
  }, [fetchMySessions]);

  return {
    mySessions,
    loading,
    error,
    refetch: fetchMySessions,
  };
}
