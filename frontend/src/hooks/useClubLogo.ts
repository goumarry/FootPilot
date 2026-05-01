import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getClub } from '@/api/clubs';
import type { Club } from '@/types';

export function useClub(): Club | null {
  const { user } = useAuth();
  const [club, setClub] = useState<Club | null>(null);

  useEffect(() => {
    if (!user?.clubId) return;
    getClub(user.clubId).then(setClub);
  }, [user?.clubId]);

  return club;
}

export function useClubLogo(): string | null {
  const club = useClub();
  return club?.logoUrl ?? null;
}
