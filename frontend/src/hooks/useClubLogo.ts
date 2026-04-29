import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getClub } from '@/api/clubs';

export function useClubLogo(): string | null {
  const { user } = useAuth();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.clubId) return;
    getClub(user.clubId).then((c) => setLogoUrl(c.logoUrl ?? null));
  }, [user?.clubId]);

  return logoUrl;
}
