import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';

export interface FilledGap {
  id: string;
  /** Name of the person who stepped in (empty when their account no longer exists) */
  volunteer: string;
  /** Name of the person who was out */
  original: string;
  sessionDate: string;
  filledAt: string;
}

interface Row {
  id: string;
  filled_at: string | null;
  session: { session_date: string } | null;
  original: { display_name: string | null } | null;
  volunteer: { display_name: string | null } | null;
}

/**
 * The latest substitution requests that were filled, newest first: who stepped in for whom.
 * Requests are created and filled from Sub-Phase 1.5 on; until then the list is empty.
 */
export function useRecentlyFilled(enabled: boolean, limit = 4) {
  const [filled, setFilled] = useState<FilledGap[]>([]);
  const [error, setError] = useState(false);

  const fetchFilled = useCallback(async () => {
    if (!enabled) {
      setFilled([]);
      return;
    }
    try {
      setError(false);
      const { data, error: fetchErr } = await supabase
        .from('substitution_requests')
        .select(
          'id, filled_at, session:sessions(session_date), original:profiles!original_trainer_id(display_name), volunteer:profiles!volunteer_id(display_name)',
        )
        .eq('status', 'filled')
        .not('filled_at', 'is', null)
        .order('filled_at', { ascending: false })
        .limit(limit);
      if (fetchErr) throw fetchErr;
      setFilled(
        ((data ?? []) as unknown as Row[])
          .filter((row) => row.filled_at && row.session)
          .map<FilledGap>((row) => ({
            id: row.id,
            volunteer: row.volunteer?.display_name ?? '',
            original: row.original?.display_name ?? '',
            sessionDate: row.session!.session_date,
            filledAt: row.filled_at!,
          })),
      );
    } catch (err) {
      console.error('Error loading recently filled gaps:', err);
      setError(true);
    }
  }, [enabled, limit]);

  useEffect(() => {
    void fetchFilled();
  }, [fetchFilled]);

  return { filled, error, refetch: fetchFilled };
}
