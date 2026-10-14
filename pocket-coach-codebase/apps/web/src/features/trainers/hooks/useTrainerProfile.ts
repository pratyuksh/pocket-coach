import { useCallback, useEffect, useState } from 'react';
import type { Profile, UserRole } from '@pocket-coach/shared-types';
import { supabase } from '../../../lib/supabase';

/** One person with their roles. `notFound` is set when no such (active) person exists. */
export function useTrainerProfile(profileId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!profileId) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const { data, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .eq('is_active', true)
        .maybeSingle();
      if (profErr) throw profErr;
      if (!data) {
        setProfile(null);
        setNotFound(true);
        return;
      }
      setNotFound(false);
      setProfile(data as Profile);

      const { data: roleRows, error: roleErr } = await supabase
        .from('user_roles')
        .select('role')
        .eq('profile_id', profileId);
      if (roleErr) throw roleErr;
      setRoles(
        (roleRows ?? []).length > 0
          ? (roleRows as { role: string }[]).map((r) => r.role as UserRole)
          : ['trainer'],
      );
    } catch (err) {
      console.error('Error loading profile:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  return { profile, roles, loading, notFound, error, refetch: fetchProfile };
}
