import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import type {
  AssignmentTrack,
  SessionRole,
  EnrichedSessionAssignment,
} from '@pocket-coach/shared-types';

export interface AssignTrainerInput {
  session_id: string;
  profile_id: string;
  track: AssignmentTrack;
  session_role: SessionRole;
  assigned_by?: string | null;
}

export function useAssignTrainer() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const assignTrainer = async (input: AssignTrainerInput): Promise<EnrichedSessionAssignment> => {
    try {
      setLoading(true);
      setError(null);

      // 1. Check if an assignment already exists for this session and track
      const { data: existing } = await supabase
        .from('session_assignments')
        .select('id')
        .eq('session_id', input.session_id)
        .eq('track', input.track)
        .maybeSingle();

      let result: any;

      if (existing) {
        // Update existing assignment
        const { data, error: updateErr } = await supabase
          .from('session_assignments')
          .update({
            profile_id: input.profile_id,
            session_role: input.session_role,
            status: 'active',
            assigned_at: new Date().toISOString(),
            assigned_by: input.assigned_by || null,
          })
          .eq('id', existing.id)
          .select('*, profile:profiles!profile_id(*)')
          .single();

        if (updateErr) throw updateErr;
        result = data;
      } else {
        // Insert new assignment
        const { data, error: insertErr } = await supabase
          .from('session_assignments')
          .insert([
            {
              session_id: input.session_id,
              profile_id: input.profile_id,
              track: input.track,
              session_role: input.session_role,
              status: 'active',
              assigned_by: input.assigned_by || null,
            },
          ])
          .select('*, profile:profiles!profile_id(*)')
          .single();

        if (insertErr) throw insertErr;
        result = data;
      }

      return {
        ...result,
        profile: result.profile || null,
      };
    } catch (err: any) {
      setError(err.message || 'Failed to assign trainer');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const removeAssignment = async (assignmentId: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const { error: delErr } = await supabase
        .from('session_assignments')
        .delete()
        .eq('id', assignmentId);

      if (delErr) throw delErr;
    } catch (err: any) {
      setError(err.message || 'Failed to remove trainer assignment');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    assignTrainer,
    removeAssignment,
    loading,
    error,
  };
}
