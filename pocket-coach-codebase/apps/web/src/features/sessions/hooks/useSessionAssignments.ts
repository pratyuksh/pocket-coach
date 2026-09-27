import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import type { EnrichedSessionAssignment } from '@pocket-coach/shared-types';

export function useSessionAssignments(sessionId?: string) {
  const [assignments, setAssignments] = useState<EnrichedSessionAssignment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
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
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  return {
    assignments,
    loading,
    error,
    refetch: fetchAssignments,
  };
}
