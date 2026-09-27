import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';
import type { PersonalStats } from '@pocket-coach/shared-types';

export function usePersonalStats(profileIdOverride?: string) {
  const { user } = useAuth();
  const targetProfileId = profileIdOverride || user?.id;

  const [stats, setStats] = useState<PersonalStats>({
    completed_sessions: 0,
    total_assigned_sessions: 0,
    primary_role_count: 0,
    assistant_role_count: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!targetProfileId) {
      setStats({
        completed_sessions: 0,
        total_assigned_sessions: 0,
        primary_role_count: 0,
        assistant_role_count: 0,
      });
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
          session_role,
          status,
          session:sessions(session_date)
        `,
        )
        .eq('profile_id', targetProfileId);

      if (fetchErr) throw fetchErr;

      const today = new Date().toISOString().slice(0, 10);
      let completedCount = 0;
      let primaryCount = 0;
      let assistantCount = 0;
      const totalCount = (data || []).length;

      (data || []).forEach((item: any) => {
        if (item.session_role === 'primary') {
          primaryCount++;
        } else if (item.session_role === 'assistant_coach') {
          assistantCount++;
        }

        if (item.session && item.session.session_date < today) {
          completedCount++;
        }
      });

      setStats({
        completed_sessions: completedCount,
        total_assigned_sessions: totalCount,
        primary_role_count: primaryCount,
        assistant_role_count: assistantCount,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to calculate personal stats');
    } finally {
      setLoading(false);
    }
  }, [targetProfileId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  };
}
