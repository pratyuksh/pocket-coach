import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import type { EnrichedSession } from './useSessions';

const SELECT = `
  *,
  location:locations(*),
  session_player_groups(
    player_group:player_groups(*)
  ),
  assignments:session_assignments(
    *,
    profile:profiles!profile_id(*)
  )
`;

/** One session with its hall, groups and assignments (the detail page). */
export function useSession(sessionId: string | undefined) {
  const [session, setSession] = useState<EnrichedSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(false);

  const fetchSession = useCallback(async () => {
    if (!sessionId) {
      setSession(null);
      setNotFound(true);
      setLoading(false);
      return;
    }
    try {
      setError(false);
      const { data, error: fetchErr } = await supabase
        .from('sessions')
        .select(SELECT)
        .eq('id', sessionId)
        .maybeSingle();
      if (fetchErr) throw fetchErr;
      if (!data) {
        setSession(null);
        setNotFound(true);
        return;
      }
      setNotFound(false);
      const row = data as any;
      setSession({
        ...row,
        location: row.location || null,
        player_groups: (row.session_player_groups || [])
          .map((spg: any) => spg.player_group)
          .filter(Boolean),
        assignments: (row.assignments || []).map((a: any) => ({
          ...a,
          profile: a.profile || null,
        })),
      });
    } catch (err) {
      console.error('Error loading the session:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void fetchSession();
  }, [fetchSession]);

  /** Changes the time or the hall of this one session only (the weekly slot stays the same). */
  const updateOverride = async (updates: {
    start_time?: string;
    end_time?: string;
    location_id?: string | null;
  }) => {
    if (!sessionId) return;
    const { error: updateErr } = await supabase
      .from('sessions')
      .update({ ...updates, is_time_overridden: true })
      .eq('id', sessionId);
    if (updateErr) throw updateErr;
    await fetchSession();
  };

  /**
   * Changes how many trainers and 14/18 coaches this one session needs (its open slots). Only
   * this session changes; the weekly slot stays the same.
   */
  const updateRequirements = async (updates: {
    required_regular?: number;
    required_junior?: number;
  }) => {
    if (!sessionId) return;
    const { error: updateErr } = await supabase
      .from('sessions')
      .update(updates)
      .eq('id', sessionId);
    if (updateErr) throw updateErr;
    await fetchSession();
  };

  const deleteSession = async () => {
    if (!sessionId) return;
    const { error: delErr } = await supabase.from('sessions').delete().eq('id', sessionId);
    if (delErr) throw delErr;
  };

  return {
    session,
    loading,
    notFound,
    error,
    refetch: fetchSession,
    updateOverride,
    updateRequirements,
    deleteSession,
  };
}
