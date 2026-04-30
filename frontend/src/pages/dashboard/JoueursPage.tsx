import { useState, useEffect } from 'react';
import { User, Plus } from 'lucide-react';
import { getJoueurs, createJoueur } from '@/api/joueurs';
import type { Joueur, Poste } from '@/types';
import { useI18n } from '@/contexts/I18nContext';
import AppLayout from '@/layouts/AppLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import Badge from '@/components/ui/Badge';

const POSTES: Poste[] = ['GB', 'DEF', 'MIL', 'ATT'];

export default function JoueursPageDashboard() {
  const { t } = useI18n();
  const [joueurs, setJoueurs] = useState<Joueur[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', birthDate: '', poste: '' as Poste | '', numeroMaillot: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getJoueurs().then(setJoueurs).finally(() => setLoading(false));
  }, []);

  async function handleCreate() {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.birthDate) {
      setError(t('players.required'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      const j = await createJoueur({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        birthDate: form.birthDate,
        poste: (form.poste || undefined) as Poste | undefined,
        numeroMaillot: form.numeroMaillot ? Number(form.numeroMaillot) : undefined,
      });
      setJoueurs((prev) => [...prev, j]);
      setShowModal(false);
      setForm({ firstName: '', lastName: '', birthDate: '', poste: '', numeroMaillot: '' });
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          t('players.createError')
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs text-violet-400 font-semibold uppercase tracking-wider mb-1">{t('roles.ENTRAINEUR')}</p>
            <h1 className="text-2xl font-extrabold text-slate-50">{t('players.myPlayers')}</h1>
          </div>
          <Button onClick={() => setShowModal(true)}>
            <Plus size={15} />
            <span>{t('common.add')}</span>
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-500 text-sm">{t('common.loading')}</div>
        ) : joueurs.length === 0 ? (
          <EmptyState
            icon={<User size={22} />}
            title={t('players.noPlayers')}
            description={t('players.noPlayersCoachDesc')}
            action={<Button onClick={() => setShowModal(true)} variant="secondary"><Plus size={15} /> {t('common.add')}</Button>}
          />
        ) : (
          <div className="space-y-2">
            {joueurs.map((j) => (
              <div key={j.id} className="flex items-center gap-4 bg-slate-800/50 border border-slate-700/40 rounded-xl px-4 py-3.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-xs font-bold text-emerald-400 flex-shrink-0">
                  {j.numeroMaillot ?? j.firstName[0]}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-200">{j.firstName} {j.lastName}</p>
                  <p className="text-xs text-slate-500">{new Date(j.birthDate).toLocaleDateString()}</p>
                </div>
                {j.poste && (
                  <Badge variant="blue">{t(`postes.${j.poste}`)}</Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={t('players.createTitle')}>
        <div className="grid grid-cols-2 gap-3">
          <Input label={t('players.firstName')} value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} placeholder="Jean" />
          <Input label={t('players.lastName')} value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} placeholder="Dupont" />
        </div>
        <Input label={t('players.birthDate')} type="date" value={form.birthDate} onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))} />
        <div className="grid grid-cols-2 gap-3">
          <Select label={t('players.positionOptional')} value={form.poste} onChange={(e) => setForm((f) => ({ ...f, poste: e.target.value as Poste | '' }))}>
            <option value="">{t('players.positionUndefined')}</option>
            {POSTES.map((p) => <option key={p} value={p}>{t(`postes.${p}`)}</option>)}
          </Select>
          <Input label={t('players.jerseyOptional')} type="number" min={1} max={99} value={form.numeroMaillot} onChange={(e) => setForm((f) => ({ ...f, numeroMaillot: e.target.value }))} placeholder="9" />
        </div>
        {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
        <div className="flex gap-3 mt-2">
          <Button variant="secondary" full onClick={() => setShowModal(false)}>{t('common.cancel')}</Button>
          <Button full onClick={handleCreate} loading={saving}>{t('common.create')}</Button>
        </div>
      </Modal>
    </AppLayout>
  );
}
