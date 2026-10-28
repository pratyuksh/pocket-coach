import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { zurichNow } from '../../../lib/dates';

/** How the person works in a session: the label the design shows next to the hall. */
export type MyRole = 'trainer' | 'assistant' | 'junior';

export interface MyUpcomingSession {
  assignmentId: string;
  sessionId: string;
  date: string;
  startTime: string;
  endTime: string;
  locationId: string | null;
  role: MyRole;
  isSubstitute: boolean;
  /** Player group names, in the club's order */
  groups: string[];
  /** Display names of the others working the same session */
  coTrainers: string[];
}

interface AssignmentRow {
  id: string;
  track: 'regular' | 'junior_coach';
  session_role: 'primary' | 'assistant_coach';
  is_substitute: boolean;
  session: {
    id: string;
    session_date: string;
    start_time: string;
    end_time: string;
    location_id: string | null;
    session_player_groups: { player_group: { name: string; sort_order: number } | null }[];
  };
}

interface CoTrainerRow {
  session_id: string;
  profile: { display_name: string | null } | null;
}

const roleOf = (row: AssignmentRow): MyRole =>
  row.track === 'junior_coach'
    ? 'junior'
    : row.session_role === 'assistant_coach'
      ? 'assistant'
      : 'trainer';

/**
 * A person's next sessions (published, active, not yet ended in Zurich time), soonest first,
 * each with the others working it. `limit` caps the list.
 */
export function useMyUpcoming(profileId: string | undefined, limit = 6) {
  const [sessions, setSessions] = useState<MyUpcomingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchSessions = useCallback(async () => {
    if (!profileId) {
      setSessions([]);
      setLoading(false);
      return;
    }
    try {
      setError(false);
      const now = zurichNow();
      const { data, error: fetchErr } = await supabase
        .from('session_assignments')
        .select(
          'id, track, session_role, is_substitute, session:sessions!inner(id, session_date, start_time, end_time, location_id, session_player_groups(player_group:player_groups(name, sort_order)))',
        )
        .eq('profile_id', profileId)
        .eq('status', 'active')
        .not('session.published_at', 'is', null)
        .gte('session.session_date', now.date);
      if (fetchErr) throw fetchErr;

      const nowKey = `${now.date}T${now.time}`;
      const mine = ((data ?? []) as unknown as AssignmentRow[])
        .filter((row) => `${row.session.session_date}T${row.session.end_time.slice(0, 5)}` > nowKey)
        .sort((a, b) =>
          `${a.session.session_date}T${a.session.start_time}`.localeCompare(
            `${b.session.session_date}T${b.session.start_time}`,
          ),
        )
        .slice(0, limit);

      const others = new Map<string, string[]>();
      if (mine.length > 0) {
        const { data: coRows, error: coErr } = await supabase
          .from('session_assignments')
          .select('session_id, profile:profiles!profile_id(display_name)')
          .in(
            'session_id',
            mine.map((row) => row.session.id),
          )
          .eq('status', 'active')
          .neq('profile_id', profileId);
        if (coErr) throw coErr;
        for (const row of (coRows ?? []) as unknown as CoTrainerRow[]) {
          const name = row.profile?.display_name;
          if (name) others.set(row.session_id, [...(others.get(row.session_id) ?? []), name]);
        }
      }

      setSessions(
        mine.map<MyUpcomingSession>((row) => ({
          assignmentId: row.id,
          sessionId: row.session.id,
          date: row.session.session_date,
          startTime: row.session.start_time,
          endTime: row.session.end_time,
          locationId: row.session.location_id,
          role: roleOf(row),
          isSubstitute: row.is_substitute,
          groups: row.session.session_player_groups
            .map((spg) => spg.player_group)
            .filter((group): group is { name: string; sort_order: number } => group !== null)
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((group) => group.name),
          coTrainers: others.get(row.session.id) ?? [],
        })),
      );
    } catch (err) {
      console.error('Error loading upcoming sessions:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [profileId, limit]);

  useEffect(() => {
    void fetchSessions();
  }, [fetchSessions]);

  return { sessions, loading, error, refetch: fetchSessions };
}
