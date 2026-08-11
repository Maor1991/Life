import { useCallback, useEffect, useState } from 'react';
import { getProfile, saveProfile } from '../db/queries/profile';
import type { NewProfile, Profile } from '../types';

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const p = await getProfile();
    setProfile(p);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const save = useCallback(
    async (data: NewProfile) => {
      await saveProfile(data);
      await refresh();
    },
    [refresh]
  );

  return { profile, loading, refresh, save };
}
