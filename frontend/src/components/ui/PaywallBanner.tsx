import { useState } from 'react';
import { Lock, Info } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { useAuth } from '@/contexts/AuthContext';
import { createSubscriptionCheckout } from '@/api/billing';
import Button from './Button';

interface PaywallBannerProps {
  feature: 'stats' | 'chat';
}

export default function PaywallBanner({ feature }: PaywallBannerProps) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  async function handleUpgrade() {
    setLoading(true);
    try {
      const { url } = await createSubscriptionCheckout();
      window.location.href = url;
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-violet-500/15 flex items-center justify-center">
        <Lock size={28} className="text-violet-400" />
      </div>
      <div className="max-w-sm">
        <h2 className="text-xl font-extrabold text-slate-50 mb-2">
          {t(`paywall.${feature}Title` as Parameters<typeof t>[0])}
        </h2>
        <p className="text-sm text-slate-400">
          {t(`paywall.${feature}Desc` as Parameters<typeof t>[0])}
        </p>
      </div>

      {user?.isOwner ? (
        <div className="flex flex-col gap-2 w-full max-w-xs">
          <Button full onClick={handleUpgrade} loading={loading}>
            {t('paywall.subscribeBtn')} — 4,99 €/mois
          </Button>
          <p className="text-xs text-slate-500">{t('paywall.noCommitment')}</p>
        </div>
      ) : (
        <div className="flex items-start gap-3 bg-slate-800/60 border border-slate-700/40 rounded-xl px-4 py-3 max-w-sm text-left">
          <Info size={16} className="text-violet-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-slate-400">{t('paywall.contactOwner')}</p>
        </div>
      )}
    </div>
  );
}
