import { useState, useEffect, useRef } from 'react';
import { Settings, Save, Camera, Shield, CreditCard, CheckCircle, AlertCircle, XCircle, Infinity as InfinityIcon, Info } from 'lucide-react';
import { getClub, updateClub } from '@/api/clubs';
import { uploadClubLogo } from '@/api/images';
import { createSubscriptionCheckout, createPaymentCheckout, createPortalSession } from '@/api/billing';
import type { Club } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { useBilling, EQUIPES_LIMIT, JOUEURS_LIMIT } from '@/contexts/BillingContext';
import AppLayout from '@/layouts/AppLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function ClubPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { billing, hasSubscription, hasUnlimitedCreation, refresh: refreshBilling } = useBilling();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [club, setClub] = useState<Club | null>(null);
  const [form, setForm] = useState({ nom: '', ville: '', description: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState('');
  const [billingActionLoading, setBillingActionLoading] = useState<string | null>(null);

  // Lecture du paramètre success après retour Stripe
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === '1') {
      refreshBilling();
      window.history.replaceState({}, '', '/admin/club?tab=abonnement');
    }
  }, [refreshBilling]);

  async function handleBillingAction(action: 'subscription' | 'payment' | 'portal') {
    setBillingActionLoading(action);
    try {
      let url: string;
      if (action === 'subscription') ({ url } = await createSubscriptionCheckout());
      else if (action === 'payment') ({ url } = await createPaymentCheckout());
      else ({ url } = await createPortalSession());
      window.location.href = url;
    } catch {
      setBillingActionLoading(null);
    }
  }

  useEffect(() => {
    if (!user?.clubId) return;
    getClub(user.clubId).then((c) => {
      setClub(c);
      setForm({ nom: c.nom, ville: c.ville, description: c.description ?? '' });
      setLoading(false);
    });
  }, [user?.clubId]);

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !club) return;
    setUploadingLogo(true);
    setError('');
    try {
      const { logoUrl } = await uploadClubLogo(club.id, file);
      setClub((prev) => prev ? { ...prev, logoUrl } : prev);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          t('club.uploadError'),
      );
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  }

  async function handleSave() {
    if (!club) return;
    if (!form.nom.trim() || !form.ville.trim()) {
      setError(t('club.nameRequired'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      const updated = await updateClub(club.id, {
        nom: form.nom.trim(),
        ville: form.ville.trim(),
        description: form.description.trim() || undefined,
      });
      setClub(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          t('club.saveError'),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center flex-shrink-0">
            <Settings size={18} className="text-violet-400" />
          </div>
          <div>
            <p className="text-xs text-violet-400 font-semibold uppercase tracking-wider mb-0.5">
              {t('club.subtitle')}
            </p>
            <h1 className="text-2xl font-extrabold text-slate-50">{t('club.title')}</h1>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-500 text-sm">{t('common.loading')}</div>
        ) : (
          <div className="space-y-1">
            {club?._count && (
              <div className="grid grid-cols-2 gap-3 mb-6">
                <Stat label={t('club.members')} value={club._count.users} />
                <Stat label={t('club.teams')} value={club._count.equipes} />
                <Stat label={t('club.players')} value={club._count.joueurs} />
                <Stat label={t('club.categories')} value={club._count.categories} />
              </div>
            )}

            <div className="mb-6">
              <p className="text-xs font-semibold text-slate-400 mb-2 tracking-wide uppercase">
                {t('club.logo')}
              </p>
              <div className="flex items-center gap-4">
                <div className="relative flex-shrink-0">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
                    {club?.logoUrl ? (
                      <img src={club.logoUrl} alt={t('club.logo')} className="w-full h-full object-cover" />
                    ) : (
                      <Shield size={24} className="text-violet-400" />
                    )}
                  </div>
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploadingLogo}
                    className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-lg bg-violet-600 flex items-center justify-center hover:bg-violet-500 transition-colors disabled:opacity-50"
                  >
                    <Camera size={11} className="text-white" />
                  </button>
                </div>
                <div>
                  <p className="text-sm text-slate-300">
                    {uploadingLogo ? t('club.uploading') : (club?.logoUrl ? t('club.logoSet') : t('club.noLogo'))}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{t('club.logoHint')}</p>
                </div>
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleLogoChange}
              />
            </div>

            <Input
              label={t('club.nameLabel')}
              placeholder="AS FootPilot FC"
              value={form.nom}
              onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
            />
            <Input
              label={t('club.cityLabel')}
              placeholder="Paris"
              value={form.ville}
              onChange={(e) => setForm((f) => ({ ...f, ville: e.target.value }))}
            />
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 tracking-wide uppercase">
                {t('club.descriptionLabel')}
              </label>
              <textarea
                className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl py-2.5 px-4 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/40 resize-none"
                rows={3}
                placeholder={t('club.descriptionPlaceholder')}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            {error && <p className="text-xs text-red-400 pt-1">{error}</p>}

            <div className="pt-4">
              <Button full onClick={handleSave} loading={saving}>
                <Save size={15} />
                {saved ? t('club.saved') : t('common.save')}
              </Button>
            </div>

            {/* ── Section Abonnement ── */}
            {billing && (
              <div className="mt-8 border-t border-slate-700/40 pt-6 space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard size={16} className="text-violet-400" />
                  <p className="text-sm font-bold text-slate-200">{t('paywall.subscribeTitle')}</p>
                </div>

                {billing.isFounder && (
                  <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3">
                    <InfinityIcon size={18} className="text-amber-400 flex-shrink-0" />
                    <p className="text-sm text-amber-300 font-semibold">{t('paywall.founder')}</p>
                  </div>
                )}

                {!billing.isFounder && (
                  <>
                    {/* Abonnement Premium */}
                    <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl px-4 py-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-200">{t('paywall.subscriptionLabel')}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{t('paywall.subscribeDesc')}</p>
                        </div>
                        <SubscriptionBadge status={billing.subscriptionStatus} t={t} />
                      </div>
                      {user?.isOwner ? (
                        hasSubscription ? (
                          <Button
                            variant="secondary"
                            onClick={() => handleBillingAction('portal')}
                            loading={billingActionLoading === 'portal'}
                          >
                            {t('paywall.manageBtn')}
                          </Button>
                        ) : (
                          <Button
                            full
                            onClick={() => handleBillingAction('subscription')}
                            loading={billingActionLoading === 'subscription'}
                          >
                            {t('paywall.subscribeBtn')} — 4,99 €/mois
                          </Button>
                        )
                      ) : !hasSubscription ? (
                        <div className="flex items-start gap-2 bg-slate-800/60 border border-slate-700/40 rounded-xl px-3 py-2.5">
                          <Info size={13} className="text-violet-400 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-slate-400">{t('paywall.contactOwner')}</p>
                        </div>
                      ) : null}
                    </div>

                    {/* Pack Illimité */}
                    <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl px-4 py-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-200">{t('paywall.scaleLabel')}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{t('paywall.scaleDesc')}</p>
                        </div>
                        {hasUnlimitedCreation ? (
                          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                            <CheckCircle size={11} /> {t('paywall.unlocked')}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">
                            {t('paywall.teamsLimit')
                              .replace('{current}', String(billing._count.equipes))
                              .replace('{limit}', String(EQUIPES_LIMIT))}
                            {' · '}
                            {t('paywall.playersLimit')
                              .replace('{current}', String(billing._count.joueurs))
                              .replace('{limit}', String(JOUEURS_LIMIT))}
                          </span>
                        )}
                      </div>
                      {!hasUnlimitedCreation && (
                        user?.isOwner ? (
                          <Button
                            full
                            onClick={() => handleBillingAction('payment')}
                            loading={billingActionLoading === 'payment'}
                          >
                            {t('paywall.unlockBtn')}
                          </Button>
                        ) : (
                          <div className="flex items-start gap-2 bg-slate-800/60 border border-slate-700/40 rounded-xl px-3 py-2.5">
                            <Info size={13} className="text-violet-400 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-slate-400">{t('paywall.contactOwner')}</p>
                          </div>
                        )
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl px-4 py-3">
      <p className="text-2xl font-extrabold text-slate-100">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

type TFn = (key: string) => string;

function SubscriptionBadge({ status, t }: { status: string; t: TFn }) {
  if (status === 'active') {
    return (
      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex-shrink-0">
        <CheckCircle size={11} /> {t('paywall.active')}
      </span>
    );
  }
  if (status === 'past_due') {
    return (
      <span className="flex items-center gap-1 text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full flex-shrink-0">
        <AlertCircle size={11} /> {t('paywall.past_due')}
      </span>
    );
  }
  if (status === 'canceled') {
    return (
      <span className="flex items-center gap-1 text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full flex-shrink-0">
        <XCircle size={11} /> {t('paywall.canceled')}
      </span>
    );
  }
  return (
    <span className="text-xs font-semibold text-slate-500 bg-slate-800/60 border border-slate-700/40 px-2 py-0.5 rounded-full flex-shrink-0">
      {t('paywall.free')}
    </span>
  );
}
