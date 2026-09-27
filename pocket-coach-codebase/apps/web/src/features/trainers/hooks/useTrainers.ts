import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import type { Profile } from '@pocket-coach/shared-types';

export function useTrainers() {
  const [trainers, setTrainers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrainers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_active', true)
        .order('display_name', { ascending: true });

      if (fetchErr) throw fetchErr;
      setTrainers(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch trainers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrainers();
  }, [fetchTrainers]);

  return {
    trainers,
    loading,
    error,
    refetch: fetchTrainers,
  };
}
