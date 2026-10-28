import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { describeDbError } from '../../../lib/dbErrors';
import type { AssignmentTrack, SessionRole } from '@pocket-coach/shared-types';

/** One trainer row of the session assignee editor. */
export interface SessionAssignmentRow {
  profile_id: string;
  track: AssignmentTrack;
  session_role: SessionRole;
}

export function useAssignTrainer() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Saves the complete set of active assignments for a session in one database call
   * (`set_session_assignments`): trainers not listed are removed, listed trainers are added or
   * updated, and the database enforces the track limits and the 14/18 track rule. Returns the
   * number of active assignments after saving.
   */
  const saveAssignments = async (
    sessionId: string,
    rows: SessionAssignmentRow[],
  ): Promise<number> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcErr } = await supabase.rpc('set_session_assignments', {
        p_session_id: sessionId,
        p_rows: rows,
      });

      if (rpcErr) throw rpcErr;
      return (data as number) ?? rows.length;
    } catch (err: unknown) {
      const message = describeDbError(err);
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  return {
    saveAssignments,
    loading,
    error,
  };
}
