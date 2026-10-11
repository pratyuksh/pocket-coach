import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import type { EnrichedSessionAssignment } from '@pocket-coach/shared-types';

export function useSessionAssignments(sessionId?: string) {
  const [assignments, setAssignments] = useState<EnrichedSessionAssignment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  // The session whose assignments were last loaded (or failed to load)
  const [loadedFor, setLoadedFor] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const fetchAssignments = useCallback(async () => {
    if (!sessionId) {
      setAssignments([]);
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
          *,
          profile:profiles!profile_id(*)
        `,
        )
        .eq('session_id', sessionId)
        .order('assigned_at', { ascending: true });

      if (fetchErr) throw fetchErr;

      const result: EnrichedSessionAssignment[] = (data || []).map((row: any) => ({
        ...row,
        profile: row.profile || null,
      }));

      setAssignments(result);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch session assignments');
    } finally {
      setLoadedFor(sessionId);
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  return {
    assignments,
    // True from the very first render for a new session, before the fetch effect has even run.
    // Otherwise a form built on these assignments is shown and editable for one render, and the
    // user's early choices are overwritten when the data arrives.
    loading: loading || (Boolean(sessionId) && loadedFor !== sessionId),
    error,
    refetch: fetchAssignments,
  };
}
