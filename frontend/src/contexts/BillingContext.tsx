import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { getBillingStatus, type BillingStatus } from '@/api/billing';

export const EQUIPES_LIMIT = 3;
export const JOUEURS_LIMIT = 30;

interface BillingContextValue {
  billing: BillingStatus | null;
  loading: boolean;
  hasSubscription: boolean;
  hasUnlimitedCreation: boolean;
  refresh: () => void;
}

const BillingContext = createContext<BillingContextValue | null>(null);

export function BillingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user?.clubId) return;
    setLoading(true);
    try {
      const data = await getBillingStatus();
      setBilling(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [user?.clubId]);

  useEffect(() => {
    if (user?.clubId) refresh();
    else setBilling(null);
  }, [user?.clubId, refresh]);

  const hasSubscription = !!billing && (billing.isFounder || billing.subscriptionStatus === 'active');
  const hasUnlimitedCreation = !!billing && (billing.isFounder || billing.hasUnlockedLimits);

  return (
    <BillingContext.Provider value={{ billing, loading, hasSubscription, hasUnlimitedCreation, refresh }}>
      {children}
    </BillingContext.Provider>
  );
}

export function useBilling() {
  const ctx = useContext(BillingContext);
  if (!ctx) throw new Error('useBilling must be used inside BillingProvider');
  return ctx;
}
