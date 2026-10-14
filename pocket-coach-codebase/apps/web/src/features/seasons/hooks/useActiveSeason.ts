import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import type { Season } from '@pocket-coach/shared-types';

export interface SeasonSlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  hall: string | null;
  groups: string[];
}

interface SlotRow {
  id: string;
  day_of_week: number;
  default_start_time: string;
  default_end_time: string;
  locations: { name: string } | null;
  training_day_player_groups: { player_groups: { name: string; sort_order: number } | null }[];
}

/**
 * The current season (the active one, otherwise the most recent) and its weekly slots. Matches
 * the season the schedule view selects by default.
 */
export function useActiveSeason() {
  const [season, setSeason] = useState<Season | null>(null);
  const [slots, setSlots] = useState<SeasonSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSeason = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data: seasons, error: seasonErr } = await supabase
        .from('seasons')
        .select('*')
        .order('start_date', { ascending: false });
      if (seasonErr) throw seasonErr;

      const current = (seasons ?? []).find((s) => s.is_active) ?? seasons?.[0] ?? null;
      setSeason(current);
      if (!current) {
        setSlots([]);
        return;
      }

      const { data: rows, error: slotErr } = await supabase
        .from('training_days')
        .select(
          'id, day_of_week, default_start_time, default_end_time, locations(name), training_day_player_groups(player_groups(name, sort_order))',
        )
        .eq('season_id', current.id);
      if (slotErr) throw slotErr;

      const mapped = ((rows ?? []) as unknown as SlotRow[]).map<SeasonSlot>((row) => ({
        id: row.id,
        dayOfWeek: row.day_of_week,
        startTime: row.default_start_time,
        endTime: row.default_end_time,
        hall: row.locations?.name ?? null,
        groups: row.training_day_player_groups
          .map((link) => link.player_groups)
          .filter((g): g is { name: string; sort_order: number } => g !== null)
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((g) => g.name),
      }));
      // Monday first, then by start time
      mapped.sort(
        (a, b) =>
          ((a.dayOfWeek + 6) % 7) - ((b.dayOfWeek + 6) % 7) ||
          a.startTime.localeCompare(b.startTime),
      );
      setSlots(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSeason();
  }, [fetchSeason]);

  return { season, slots, loading, error, refetch: fetchSeason };
}
