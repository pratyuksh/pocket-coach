import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import type { Location } from '@pocket-coach/shared-types';

export function useLocations() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLocations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchErr } = await supabase
        .from('locations')
        .select('*')
        .order('name', { ascending: true });

      if (fetchErr) throw fetchErr;
      setLocations(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch sports hall locations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const addLocation = async (name: string, districtArea?: string) => {
    try {
      setError(null);
      const { data, error: insertErr } = await supabase
        .from('locations')
        .insert([{ name: name.trim(), district_area: districtArea?.trim() || null }])
        .select()
        .single();

      if (insertErr) throw insertErr;
      setLocations((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      return data as Location;
    } catch (err: any) {
      setError(err.message || 'Failed to add location');
      throw err;
    }
  };

  const updateLocation = async (id: string, updates: Partial<Location>) => {
    try {
      setError(null);
      const { data, error: updateErr } = await supabase
        .from('locations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateErr) throw updateErr;
      setLocations((prev) => prev.map((loc) => (loc.id === id ? data : loc)));
      return data as Location;
    } catch (err: any) {
      setError(err.message || 'Failed to update location');
      throw err;
    }
  };

  return {
    locations,
    loading,
    error,
    refetch: fetchLocations,
    addLocation,
    updateLocation,
  };
}
