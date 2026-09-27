import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import type { Season, SeasonTemplate } from '@pocket-coach/shared-types';

export interface CreateSeasonSlotInput {
  day_of_week: number;
  default_start_time: string;
  default_end_time: string;
  location_id: string | null;
  player_group_names: string[];
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

  const createSeason = async (
    input: CreateSeasonInput,
  ): Promise<{ season: Season; generatedCount: number }> => {
    try {
      setError(null);

      // If making active, deactivate other seasons first
      if (input.is_active) {
        await supabase
          .from('seasons')
          .update({ is_active: false })
          .neq('id', '00000000-0000-0000-0000-000000000000');
      }

      // 1. Insert Season
      const { data: seasonData, error: seasonErr } = await supabase
        .from('seasons')
        .insert([
          {
            name: input.name.trim(),
            start_date: input.start_date,
            end_date: input.end_date,
            is_active: input.is_active ?? true,
          },
        ])
        .select()
        .single();

      if (seasonErr) throw seasonErr;
      const newSeason = seasonData as Season;

      // 2. Insert Player Groups
      const groupMap = new Map<string, string>(); // name -> inserted id
      if (input.player_groups.length > 0) {
        const groupsToInsert = input.player_groups.map((pg) => ({
          season_id: newSeason.id,
          name: pg.name,
          description: pg.description || null,
          sort_order: pg.sort_order,
        }));

        const { data: insertedGroups, error: groupErr } = await supabase
          .from('player_groups')
          .insert(groupsToInsert)
          .select();

        if (groupErr) throw groupErr;
        (insertedGroups || []).forEach((g: any) => groupMap.set(g.name, g.id));
      }

      // 3. Insert Training Days & link Player Groups
      for (const slot of input.slots) {
        const { data: tdData, error: tdErr } = await supabase
          .from('training_days')
          .insert([
            {
              season_id: newSeason.id,
              day_of_week: slot.day_of_week,
              default_start_time: slot.default_start_time,
              default_end_time: slot.default_end_time,
              location_id: slot.location_id,
            },
          ])
          .select()
          .single();

        if (tdErr) throw tdErr;

        // Link player groups for this slot
        const groupIdsToLink = slot.player_group_names
          .map((name) => groupMap.get(name))
          .filter((id): id is string => Boolean(id));

        if (groupIdsToLink.length > 0) {
          const links = groupIdsToLink.map((pgId) => ({
            training_day_id: tdData.id,
            player_group_id: pgId,
          }));

          const { error: linkErr } = await supabase
            .from('training_day_player_groups')
            .insert(links);
          if (linkErr) throw linkErr;
        }
      }

      // 4. Batch generate sessions via stored RPC procedure
      const generatedCount = await generateSessions(newSeason.id);

      await fetchSeasons();
      return { season: newSeason, generatedCount };
    } catch (err: any) {
      setError(err.message || 'Failed to create season');
      throw err;
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
