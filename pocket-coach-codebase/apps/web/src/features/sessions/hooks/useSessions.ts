import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import type { Session, Location, PlayerGroup } from '@pocket-coach/shared-types';

export interface EnrichedSession extends Session {
  location?: Location | null;
  player_groups?: PlayerGroup[];
}

export interface SessionFilterOptions {
  seasonId?: string;
  locationId?: string;
  dayOfWeek?: number;
  month?: string; // YYYY-MM format
}

export function useSessions(initialFilters?: SessionFilterOptions) {
  const [sessions, setSessions] = useState<EnrichedSession[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SessionFilterOptions>(initialFilters || {});

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('sessions')
        .select(
          `
          *,
          location:locations(*),
          session_player_groups(
            player_group:player_groups(*)
          )
        `,
        )
        .order('session_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (filters.seasonId) {
        query = query.eq('season_id', filters.seasonId);
      }

      if (filters.locationId) {
        query = query.eq('location_id', filters.locationId);
      }

      if (filters.dayOfWeek !== undefined && filters.dayOfWeek !== null) {
        query = query.eq('day_of_week', filters.dayOfWeek);
      }

      if (filters.month) {
        // e.g. "2026-02"
        const [yearStr, monthStr] = filters.month.split('-');
        const year = parseInt(yearStr, 10);
        const monthNum = parseInt(monthStr, 10);
        const lastDay = new Date(year, monthNum, 0).getDate();
        const startDate = `${filters.month}-01`;
        const endDate = `${filters.month}-${lastDay.toString().padStart(2, '0')}`;
        query = query.gte('session_date', startDate).lte('session_date', endDate);
      }

      const { data, error: fetchErr } = await query;
      if (fetchErr) throw fetchErr;

      const enriched: EnrichedSession[] = (data || []).map((s: any) => ({
        ...s,
        location: s.location || null,
        player_groups: (s.session_player_groups || [])
          .map((spg: any) => spg.player_group)
          .filter(Boolean),
      }));

      setSessions(enriched);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch training sessions');
    } finally {
      setLoading(false);
    }
  }, [filters.seasonId, filters.locationId, filters.dayOfWeek, filters.month]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const updateSessionOverride = async (
    sessionId: string,
    updates: { start_time?: string; end_time?: string; location_id?: string | null },
  ) => {
    try {
      setError(null);
      const { data, error: updateErr } = await supabase
        .from('sessions')
        .update({
          ...updates,
          is_time_overridden: true,
        })
        .eq('id', sessionId)
        .select(
          `
          *,
          location:locations(*),
          session_player_groups(
            player_group:player_groups(*)
          )
        `,
        )
        .single();

      if (updateErr) throw updateErr;

      const updatedEnriched: EnrichedSession = {
        ...data,
        location: data.location || null,
        player_groups: (data.session_player_groups || [])
          .map((spg: any) => spg.player_group)
          .filter(Boolean),
      };

      setSessions((prev) => prev.map((s) => (s.id === sessionId ? updatedEnriched : s)));
      return updatedEnriched;
    } catch (err: any) {
      setError(err.message || 'Failed to override session details');
      throw err;
    }
  };

  const deleteSession = async (sessionId: string): Promise<void> => {
    try {
      setError(null);
      const { error: delErr } = await supabase.from('sessions').delete().eq('id', sessionId);
      if (delErr) throw delErr;
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err: any) {
      setError(err.message || 'Failed to delete session');
      throw err;
    }
  };

  return {
    sessions,
    loading,
    error,
    filters,
    setFilters,
    refetch: fetchSessions,
    updateSessionOverride,
    deleteSession,
  };
}

