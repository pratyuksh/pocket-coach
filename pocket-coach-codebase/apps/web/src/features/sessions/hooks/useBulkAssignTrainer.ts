import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import type { BulkAssignParams } from '@pocket-coach/shared-types';

export function useBulkAssignTrainer() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const bulkAssign = async (params: BulkAssignParams): Promise<number> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcErr } = await supabase.rpc('bulk_assign_trainer', {
        p_season_id: params.season_id,
        p_profile_id: params.profile_id,
        p_day_of_week: params.day_of_week ?? null,
        p_location_id: params.location_id ?? null,
        p_track: params.track || 'regular',
        p_session_role: params.session_role || 'primary',
        p_assigned_by: params.assigned_by || null,
      });

      if (rpcErr) throw rpcErr;
      return (data as number) || 0;
    } catch (err: any) {
      setError(err.message || 'Failed to bulk assign trainer');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    bulkAssign,
    loading,
    error,
  };
}
