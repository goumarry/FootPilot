import { useState } from 'react';
import { MessageSquare, Lock } from 'lucide-react';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { useBilling } from '@/contexts/BillingContext';
import { useI18n } from '@/contexts/I18nContext';
import { createSubscriptionCheckout } from '@/api/billing';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

export default function ChatFab() {
  const { user } = useAuth();
  const { openChat, totalUnread, isOpen } = useChat();
  const { hasSubscription } = useBilling();
  const { t } = useI18n();
  const [showPaywall, setShowPaywall] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  if (!user?.clubId) return null;

  async function handleClick() {
    if (hasSubscription) {
      openChat();
    } else {
      setShowPaywall(true);
    }
  }

  async function handleUpgrade() {
    setCheckoutLoading(true);
    try {
      const { url } = await createSubscriptionCheckout();
      window.location.href = url;
    } catch {
      setCheckoutLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={handleClick}
        aria-label="Ouvrir la messagerie"
        className={`
          fixed z-[59] bottom-20 right-4 lg:bottom-6 lg:right-6
          w-12 h-12 rounded-full shadow-lg
          flex items-center justify-center
          transition-all duration-200
          ${isOpen
            ? 'bg-violet-700 text-white scale-95'
            : 'bg-violet-600 hover:bg-violet-500 text-white hover:scale-105 active:scale-95'}
        `}
      >
        {hasSubscription ? (
          <MessageSquare size={20} strokeWidth={2} />
        ) : (
          <Lock size={18} strokeWidth={2} />
        )}
        {totalUnread > 0 && !isOpen && hasSubscription && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow">
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        )}
      </button>

      <Modal open={showPaywall} onClose={() => setShowPaywall(false)} title={t('paywall.chatTitle')} size="sm">
        <p className="text-sm text-slate-400 mb-5">{t('paywall.chatDesc')}</p>
        {user?.isOwner ? (
          <>
            <Button full onClick={handleUpgrade} loading={checkoutLoading}>
              {t('paywall.subscribeBtn')} — 4,99 €/mois
            </Button>
            <p className="text-center text-xs text-slate-500 mt-2">{t('paywall.noCommitment')}</p>
          </>
        ) : (
          <div className="flex items-start gap-3 bg-slate-800/60 border border-slate-700/40 rounded-xl px-4 py-3 text-left">
            <span className="text-violet-400 flex-shrink-0 mt-0.5">ℹ</span>
            <p className="text-sm text-slate-400">{t('paywall.contactOwner')}</p>
          </div>
        )}
      </Modal>
    </>
  );
}
