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
  /** Existing assignment to update; omit to create a new one */
  assignment_id?: string;
}

export function useAssignTrainer() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const assignTrainer = async (input: AssignTrainerInput): Promise<EnrichedSessionAssignment> => {
    try {
      setLoading(true);
      setError(null);

      // A session holds several trainers per track (2–3 regular, 1–2 14/18 coaches), so an
      // existing row is identified by its own id, never looked up by session & track.
      // Status is left untouched so substitution states are not silently reset.
      const query = input.assignment_id
        ? supabase
            .from('session_assignments')
            .update({
              profile_id: input.profile_id,
              track: input.track,
              session_role: input.session_role,
              assigned_at: new Date().toISOString(),
              assigned_by: input.assigned_by || null,
            })
            .eq('id', input.assignment_id)
        : supabase.from('session_assignments').insert([
            {
              session_id: input.session_id,
              profile_id: input.profile_id,
              track: input.track,
              session_role: input.session_role,
              status: 'active',
              assigned_by: input.assigned_by || null,
            },
          ]);

      const { data, error: writeErr } = await query
        .select('*, profile:profiles!profile_id(*)')
        .single();

      if (writeErr) {
        // 23505: uq_session_assignments_active_profile (trainer already active on this session)
        if (writeErr.code === '23505') {
          throw new Error('This trainer is already assigned to this session');
        }
        throw writeErr;
      }

      return {
        ...data,
        profile: data.profile || null,
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
