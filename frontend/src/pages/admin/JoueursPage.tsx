import { useState, useEffect, useCallback } from 'react';
import { User, Plus, Pencil, Search, Lock, Info } from 'lucide-react';
import { getJoueurs, createJoueur, updateJoueur } from '@/api/joueurs';
import { getStatsJoueur } from '@/api/statistiques';
import { createPaymentCheckout, createSubscriptionCheckout } from '@/api/billing';
import type { Joueur, Poste } from '@/types';
import type { JoueurStatsData } from '@/components/ui/PlayerStatsView';
import { useI18n } from '@/contexts/I18nContext';
import { useBilling, JOUEURS_LIMIT } from '@/contexts/BillingContext';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/layouts/AppLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import Badge from '@/components/ui/Badge';
import { PlayerStatsView } from '@/components/ui/PlayerStatsView';

const POSTES: Poste[] = ['GB', 'DEF', 'MIL', 'ATT'];

const posteColors: Record<string, 'violet' | 'blue' | 'green' | 'yellow'> = {
  GB: 'yellow',
  DEF: 'blue',
  MIL: 'green',
  ATT: 'violet',
};

function JoueurStatsModal({ joueur, onClose }: { joueur: Joueur; onClose: () => void }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const { hasSubscription } = useBilling();
  const [stats, setStats] = useState<JoueurStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    if (!hasSubscription) { setLoading(false); return; }
    getStatsJoueur(joueur.id)
      .then(setStats)
      .catch((err: { response?: { status?: number } }) => {
        if (err?.response?.status !== 402) setError(t('stats.loadError'));
      })
      .finally(() => setLoading(false));
  }, [joueur.id, hasSubscription]);

  async function handleSubscribe() {
    setCheckoutLoading(true);
    try {
      const { url } = await createSubscriptionCheckout();
      window.location.href = url;
    } catch {
      setCheckoutLoading(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={`${joueur.firstName} ${joueur.lastName}`} size="lg">
      <div className="mb-3 flex items-center gap-2 flex-wrap">
        {joueur.poste && <Badge variant={posteColors[joueur.poste]}>{t(`postes.${joueur.poste}`)}</Badge>}
        {joueur.numeroMaillot && <span className="text-xs text-slate-500">#{joueur.numeroMaillot}</span>}
        <span className="text-xs text-slate-500">{new Date(joueur.birthDate).toLocaleDateString()}</span>
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-500 text-sm">{t('common.loading')}</div>
      ) : !hasSubscription ? (
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-violet-500/15 flex items-center justify-center">
            <Lock size={22} className="text-violet-400" />
          </div>
          <div className="max-w-xs">
            <p className="text-sm font-semibold text-slate-200 mb-1">{t('paywall.statsTitle')}</p>
            <p className="text-xs text-slate-400">{t('paywall.playerStatsDesc')}</p>
          </div>
          {user?.isOwner ? (
            <div className="w-full max-w-xs flex flex-col gap-2">
              <Button full onClick={handleSubscribe} loading={checkoutLoading}>
                {t('paywall.subscribeBtn')} — 4,99 €/mois
              </Button>
              <p className="text-xs text-slate-500">{t('paywall.noCommitment')}</p>
            </div>
          ) : (
            <div className="flex items-start gap-2 bg-slate-800/60 border border-slate-700/40 rounded-xl px-4 py-3 text-left max-w-xs">
              <Info size={14} className="text-violet-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-400">{t('paywall.contactOwner')}</p>
            </div>
          )}
        </div>
      ) : error ? (
        <div className="text-center py-10 text-slate-500 text-sm">{error}</div>
      ) : !stats ? (
        <div className="text-center py-10 text-slate-500 text-sm">{t('stats.noProfile')}</div>
      ) : (
        <PlayerStatsView stats={stats} />
      )}
    </Modal>
  );
}

export default function JoueursPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { hasUnlimitedCreation } = useBilling();
  const [joueurs, setJoueurs] = useState<Joueur[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitUpgradeLoading, setLimitUpgradeLoading] = useState(false);
  const [editing, setEditing] = useState<Joueur | null>(null);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    birthDate: '',
    poste: '' as Poste | '',
    numeroMaillot: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [statsJoueur, setStatsJoueur] = useState<Joueur | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setJoueurs(await getJoueurs());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleUpgradeLimit() {
    setLimitUpgradeLoading(true);
    try {
      const { url } = await createPaymentCheckout();
      window.location.href = url;
    } catch {
      setLimitUpgradeLoading(false);
    }
  }

  function openCreate() {
    if (!hasUnlimitedCreation && joueurs.length >= JOUEURS_LIMIT) {
      setShowLimitModal(true);
      return;
    }
    setEditing(null);
    setForm({ firstName: '', lastName: '', birthDate: '', poste: '', numeroMaillot: '' });
    setError('');
    setShowModal(true);
  }

  function openEdit(e: React.MouseEvent, j: Joueur) {
    e.stopPropagation();
    setEditing(j);
    setForm({
      firstName: j.firstName,
      lastName: j.lastName,
      birthDate: j.birthDate.slice(0, 10),
      poste: j.poste ?? '',
      numeroMaillot: j.numeroMaillot?.toString() ?? '',
    });
    setError('');
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.birthDate) {
      setError(t('players.required'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        birthDate: form.birthDate,
        poste: (form.poste || undefined) as Poste | undefined,
        numeroMaillot: form.numeroMaillot ? Number(form.numeroMaillot) : undefined,
      };
      if (editing) {
        const updated = await updateJoueur(editing.id, payload);
        setJoueurs((prev) => prev.map((j) => (j.id === editing.id ? { ...j, ...updated } : j)));
      } else {
        const created = await createJoueur(payload);
        setJoueurs((prev) => [...prev, created]);
      }
      setShowModal(false);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          t('players.createError'),
      );
    } finally {
      setSaving(false);
    }
  }

  const filtered = joueurs.filter((j) => {
    const q = search.toLowerCase();
    return !q || `${j.firstName} ${j.lastName}`.toLowerCase().includes(q);
  });

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs text-violet-400 font-semibold uppercase tracking-wider mb-1">{t('players.subtitle')}</p>
            <h1 className="text-2xl font-extrabold text-slate-50">{t('players.title')}</h1>
          </div>
          <div className="flex items-center gap-3">
            {!hasUnlimitedCreation && (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                joueurs.length >= JOUEURS_LIMIT
                  ? 'text-red-400 border-red-500/30 bg-red-500/10'
                  : 'text-slate-400 border-slate-600/40 bg-slate-800/50'
              }`}>
                {t('paywall.playersLimit')
                  .replace('{current}', String(joueurs.length))
                  .replace('{limit}', String(JOUEURS_LIMIT))}
              </span>
            )}
            <Button onClick={openCreate}>
              <Plus size={15} />
              <span>{t('common.add')}</span>
            </Button>
          </div>
        </div>

        <div className="relative mb-5">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder={t('players.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
          />
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-500 text-sm">{t('common.loading')}</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<User size={22} />}
            title={search ? t('common.noResults') : t('players.noPlayers')}
            description={search ? undefined : t('players.noPlayersDesc')}
            action={
              !search ? (
                <Button onClick={openCreate} variant="secondary">
                  <Plus size={15} /> {t('players.addPlayer')}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-2">
            {filtered.map((j) => (
              <button
                key={j.id}
                onClick={() => setStatsJoueur(j)}
                className="w-full text-left flex items-center gap-4 bg-slate-800/50 border border-slate-700/40 rounded-xl px-4 py-3.5 hover:border-slate-600/60 hover:bg-slate-800/70 transition-all"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-xs font-bold text-emerald-400 flex-shrink-0">
                  {j.numeroMaillot ?? j.firstName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-200">{j.firstName} {j.lastName}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(j.birthDate).toLocaleDateString()}
                    {j.equipes && j.equipes.length > 0 && (
                      <> · {j.equipes.map((e) => e.equipe.nomEquipe).join(', ')}</>
                    )}
                  </p>
                </div>
                {j.poste && (
                  <Badge variant={posteColors[j.poste]}>{t(`postes.${j.poste}`)}</Badge>
                )}
                <button
                  onClick={(e) => openEdit(e, j)}
                  className="text-slate-500 hover:text-slate-300 transition-colors p-1"
                >
                  <Pencil size={15} />
                </button>
              </button>
            ))}
          </div>
        )}
      </div>

      {statsJoueur && (
        <JoueurStatsModal joueur={statsJoueur} onClose={() => setStatsJoueur(null)} />
      )}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? t('players.editTitle') : t('players.createTitle')}
      >
        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t('players.firstName')}
            value={form.firstName}
            onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
            placeholder="Jean"
          />
          <Input
            label={t('players.lastName')}
            value={form.lastName}
            onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
            placeholder="Dupont"
          />
        </div>
        <Input
          label={t('players.birthDate')}
          type="date"
          value={form.birthDate}
          onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))}
        />
        <div className="grid grid-cols-2 gap-3">
          <Select
            label={t('players.positionOptional')}
            value={form.poste}
            onChange={(e) => setForm((f) => ({ ...f, poste: e.target.value as Poste | '' }))}
          >
            <option value="">{t('players.positionUndefined')}</option>
            {POSTES.map((p) => (
              <option key={p} value={p}>{t(`postes.${p}`)}</option>
            ))}
          </Select>
          <Input
            label={t('players.jerseyOptional')}
            type="number"
            min={1}
            max={99}
            value={form.numeroMaillot}
            onChange={(e) => setForm((f) => ({ ...f, numeroMaillot: e.target.value }))}
            placeholder="9"
          />
        </div>
        {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
        <div className="flex gap-3 mt-2">
          <Button variant="secondary" full onClick={() => setShowModal(false)}>{t('common.cancel')}</Button>
          <Button full onClick={handleSave} loading={saving}>
            {editing ? t('common.edit') : t('common.create')}
          </Button>
        </div>
      </Modal>

      {/* Modale limite joueurs */}
      <Modal
        open={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        title={t('paywall.limitsTitle')}
        size="sm"
      >
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 flex items-center justify-center">
            <Lock size={22} className="text-amber-400" />
          </div>
          <p className="text-sm text-slate-300">{t('paywall.scaleDesc')}</p>
          {user?.isOwner ? (
            <>
              <Button full onClick={handleUpgradeLimit} loading={limitUpgradeLoading}>
                {t('paywall.unlockBtn')}
              </Button>
              <button
                onClick={() => setShowLimitModal(false)}
                className="text-xs text-slate-500 hover:text-slate-400 transition-colors"
              >
                {t('common.cancel')}
              </button>
            </>
          ) : (
            <>
              <div className="flex items-start gap-2 bg-slate-800/60 border border-slate-700/40 rounded-xl px-4 py-3 text-left w-full">
                <Info size={14} className="text-violet-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-400">{t('paywall.contactOwner')}</p>
              </div>
              <button
                onClick={() => setShowLimitModal(false)}
                className="text-xs text-slate-500 hover:text-slate-400 transition-colors"
              >
                {t('common.cancel')}
              </button>
            </>
          )}
        </div>
      </Modal>
    </AppLayout>
  );
}
