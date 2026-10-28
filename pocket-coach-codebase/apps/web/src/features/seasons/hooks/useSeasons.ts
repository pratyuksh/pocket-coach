import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { describeDbError } from '../../../lib/dbErrors';
import type { Season, SeasonTemplate } from '@pocket-coach/shared-types';

export interface CreateSeasonSlotInput {
  day_of_week: number;
  default_start_time: string;
  default_end_time: string;
  location_id: string | null;
  player_group_names: string[];
  required_regular: number;
  required_junior: number;
}

export interface CreateSeasonInput {
  name: string;
  start_date: string;
  end_date: string;
  is_active?: boolean;
  player_groups: Array<{ name: string; description?: string; sort_order: number }>;
  slots: CreateSeasonSlotInput[];
}

export function useSeasons() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);
  const [templates, setTemplates] = useState<SeasonTemplate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSeasons = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: seasonsErr } = await supabase
        .from('seasons')
        .select('*')
        .order('start_date', { ascending: false });

      if (seasonsErr) throw seasonsErr;
      const allSeasons = data || [];
      setSeasons(allSeasons);
      setActiveSeason(allSeasons.find((s) => s.is_active) || allSeasons[0] || null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch seasons');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const { data, error: tplErr } = await supabase
        .from('season_templates')
        .select('*')
        .order('is_default', { ascending: false });

      if (tplErr) throw tplErr;
      setTemplates(data || []);
      return data || [];
    } catch (err: any) {
      console.error('Failed to fetch season templates', err);
      return [];
    }
  }, []);

  useEffect(() => {
    fetchSeasons();
    fetchTemplates();
  }, [fetchSeasons, fetchTemplates]);

  const generateSessions = async (seasonId: string): Promise<number> => {
    const { data, error: rpcErr } = await supabase.rpc('generate_season_sessions', {
      p_season_id: seasonId,
    });

    if (rpcErr) throw rpcErr;
    return (data as number) || 0;
  };

  /**
   * Creates the season, its player groups, training days (with hall and staffing targets) and all
   * sessions in one database call (`create_season`). Either everything is created, or nothing
   * changes, including which season is active.
   */
  const createSeason = async (
    input: CreateSeasonInput,
  ): Promise<{ season: Season; generatedCount: number }> => {
    try {
      setError(null);

      const { data, error: rpcErr } = await supabase.rpc('create_season', {
        p_name: input.name.trim(),
        p_start_date: input.start_date,
        p_end_date: input.end_date,
        p_is_active: input.is_active ?? true,
        p_groups: input.player_groups.map((g) => ({
          name: g.name,
          description: g.description ?? '',
          sort_order: g.sort_order,
        })),
        p_slots: input.slots.map((slot) => ({
          day_of_week: slot.day_of_week,
          default_start_time: slot.default_start_time,
          default_end_time: slot.default_end_time,
          location_id: slot.location_id,
          player_group_names: slot.player_group_names,
          required_regular: slot.required_regular,
          required_junior: slot.required_junior,
        })),
      });

      if (rpcErr) throw rpcErr;
      const { season_id, generated } = data as { season_id: string; generated: number };

      const { data: seasonData, error: fetchErr } = await supabase
        .from('seasons')
        .select('*')
        .eq('id', season_id)
        .single();
      if (fetchErr) throw fetchErr;

      await fetchSeasons();
      return { season: seasonData as Season, generatedCount: generated };
    } catch (err: unknown) {
      const message = describeDbError(err);
      setError(message);
      throw new Error(message);
    }
  };

  const deleteSeason = async (seasonId: string): Promise<void> => {
    try {
      setError(null);
      const { error: delErr } = await supabase.from('seasons').delete().eq('id', seasonId);
      if (delErr) throw delErr;
      await fetchSeasons();
    } catch (err: any) {
      setError(err.message || 'Failed to delete season');
      throw err;
    }
  };

  return {
    seasons,
    activeSeason,
    templates,
    loading,
    error,
    refetch: fetchSeasons,
    createSeason,
    deleteSeason,
    generateSessions,
  };
}
