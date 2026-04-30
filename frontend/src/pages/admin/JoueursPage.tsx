import { useState, useEffect, useCallback } from 'react';
import { User, Plus, Pencil, Trash2, Search } from 'lucide-react';
import { getJoueurs, createJoueur, updateJoueur, deleteJoueur } from '@/api/joueurs';
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

export default function JoueursPage() {
  const { t } = useI18n();
  const [joueurs, setJoueurs] = useState<Joueur[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
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

  const load = useCallback(async () => {
    setLoading(true);
    setJoueurs(await getJoueurs());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditing(null);
    setForm({ firstName: '', lastName: '', birthDate: '', poste: '', numeroMaillot: '' });
    setError('');
    setShowModal(true);
  }

  function openEdit(j: Joueur) {
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
          t('players.createError')
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(j: Joueur) {
    if (!confirm(t('players.deleteConfirm').replace('{name}', `${j.firstName} ${j.lastName}`))) return;
    await deleteJoueur(j.id);
    setJoueurs((prev) => prev.filter((jj) => jj.id !== j.id));
  }

  const filtered = joueurs.filter((j) => {
    const q = search.toLowerCase();
    return !q || `${j.firstName} ${j.lastName}`.toLowerCase().includes(q);
  });

  const posteColors: Record<string, 'violet' | 'blue' | 'green' | 'yellow'> = {
    GB: 'yellow',
    DEF: 'blue',
    MIL: 'green',
    ATT: 'violet',
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs text-violet-400 font-semibold uppercase tracking-wider mb-1">{t('players.subtitle')}</p>
            <h1 className="text-2xl font-extrabold text-slate-50">{t('players.title')}</h1>
          </div>
          <Button onClick={openCreate}>
            <Plus size={15} />
            <span>{t('common.add')}</span>
          </Button>
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
              <div
                key={j.id}
                className="flex items-center gap-4 bg-slate-800/50 border border-slate-700/40 rounded-xl px-4 py-3.5"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-xs font-bold text-emerald-400 flex-shrink-0">
                  {j.numeroMaillot ?? j.firstName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-200">
                    {j.firstName} {j.lastName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(j.birthDate).toLocaleDateString()}
                    {j.equipes && j.equipes.length > 0 && (
                      <> · {j.equipes.map((e) => e.equipe.nomEquipe).join(', ')}</>
                    )}
                  </p>
                </div>
                {j.poste && (
                  <Badge variant={posteColors[j.poste]}>
                    {t(`postes.${j.poste}`)}
                  </Badge>
                )}
                <button
                  onClick={() => openEdit(j)}
                  className="text-slate-500 hover:text-slate-300 transition-colors p-1"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => handleDelete(j)}
                  className="text-slate-500 hover:text-red-400 transition-colors p-1"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

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
    </AppLayout>
  );
}
