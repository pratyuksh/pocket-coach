import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { zurichNow } from '../../../lib/dates';

export interface UpcomingSession {
  id: string;
  date: string;
  startTime: string;
  locationId: string | null;
}

export interface LoggedSession {
  assignmentId: string;
  date: string;
  startTime: string;
  locationId: string | null;
  track: 'regular' | 'junior_coach';
  sessionRole: 'primary' | 'assistant_coach';
  isSubstitute: boolean;
}

interface UpcomingRow {
  id: string;
  session: {
    session_date: string;
    start_time: string;
    end_time: string;
    location_id: string | null;
  };
}

interface LogRow {
  assignment_id: string;
  session_date: string;
  start_time: string;
  location_id: string | null;
  track: 'regular' | 'junior_coach';
  session_role: 'primary' | 'assistant_coach';
  is_substitute: boolean;
}

const UPCOMING_LIMIT = 5;

/**
 * A person's next sessions (published, active, not yet ended in Zurich time; everyone may see
 * these) and, when `includeLog` is set, their completed sessions from the `session_log` view,
 * newest first. The database only returns the log to the person and to Head-trainers.
 */
export function usePersonSessions(profileId: string | undefined, includeLog: boolean) {
  const [upcoming, setUpcoming] = useState<UpcomingSession[]>([]);
  const [log, setLog] = useState<LoggedSession[]>([]);
  const [error, setError] = useState(false);

  const fetchSessions = useCallback(async () => {
    if (!profileId) return;
    try {
      setError(false);
      const now = zurichNow();
      const { data: upcomingRows, error: upErr } = await supabase
        .from('session_assignments')
        .select('id, session:sessions!inner(session_date, start_time, end_time, location_id)')
        .eq('profile_id', profileId)
        .eq('status', 'active')
        .not('session.published_at', 'is', null)
        .gte('session.session_date', now.date);
      if (upErr) throw upErr;

      const nowKey = `${now.date}T${now.time}`;
      setUpcoming(
        ((upcomingRows ?? []) as unknown as UpcomingRow[])
          .filter(
            (row) => `${row.session.session_date}T${row.session.end_time.slice(0, 5)}` > nowKey,
          )
          .map<UpcomingSession>((row) => ({
            id: row.id,
            date: row.session.session_date,
            startTime: row.session.start_time,
            locationId: row.session.location_id,
          }))
          .sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`))
          .slice(0, UPCOMING_LIMIT),
      );

      if (includeLog) {
        const { data: logRows, error: logErr } = await supabase
          .from('session_log')
          .select('*')
          .eq('profile_id', profileId)
          .order('session_date', { ascending: false })
          .order('start_time', { ascending: false });
        if (logErr) throw logErr;
        setLog(
          ((logRows ?? []) as LogRow[]).map<LoggedSession>((row) => ({
            assignmentId: row.assignment_id,
            date: row.session_date,
            startTime: row.start_time,
            locationId: row.location_id,
            track: row.track,
            sessionRole: row.session_role,
            isSubstitute: row.is_substitute,
          })),
        );
      } else {
        setLog([]);
      }
    } catch (err) {
      console.error('Error loading sessions of a person:', err);
      setError(true);
    }
  }, [profileId, includeLog]);

  useEffect(() => {
    void fetchSessions();
  }, [fetchSessions]);

  return { upcoming, log, error, refetch: fetchSessions };
}
