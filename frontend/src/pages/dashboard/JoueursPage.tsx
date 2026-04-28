import { useState, useEffect } from 'react';
import { User, Plus } from 'lucide-react';
import { getJoueurs, createJoueur } from '@/api/joueurs';
import type { Joueur, Poste } from '@/types';
import { POSTE_LABELS } from '@/types';
import AppLayout from '@/layouts/AppLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import Badge from '@/components/ui/Badge';

const POSTES: Poste[] = ['GB', 'DEF', 'MIL', 'ATT'];

export default function JoueursPageDashboard() {
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
      setError('Prénom, nom et date de naissance requis.');
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
          'Erreur lors de la création.'
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
            <p className="text-xs text-violet-400 font-semibold uppercase tracking-wider mb-1">Entraîneur</p>
            <h1 className="text-2xl font-extrabold text-slate-50">Mes joueurs</h1>
          </div>
          <Button onClick={() => setShowModal(true)}>
            <Plus size={15} />
            <span>Ajouter</span>
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-500 text-sm">Chargement…</div>
        ) : joueurs.length === 0 ? (
          <EmptyState
            icon={<User size={22} />}
            title="Aucun joueur"
            description="Ajoutez des joueurs à votre club."
            action={<Button onClick={() => setShowModal(true)} variant="secondary"><Plus size={15} /> Ajouter</Button>}
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
                  <p className="text-xs text-slate-500">{new Date(j.birthDate).toLocaleDateString('fr-FR')}</p>
                </div>
                {j.poste && (
                  <Badge variant="blue">{POSTE_LABELS[j.poste]}</Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nouveau joueur">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Prénom" value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} placeholder="Jean" />
          <Input label="Nom" value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} placeholder="Dupont" />
        </div>
        <Input label="Date de naissance" type="date" value={form.birthDate} onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))} />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Poste" value={form.poste} onChange={(e) => setForm((f) => ({ ...f, poste: e.target.value as Poste | '' }))}>
            <option value="">— Non défini —</option>
            {POSTES.map((p) => <option key={p} value={p}>{POSTE_LABELS[p]}</option>)}
          </Select>
          <Input label="N° maillot" type="number" min={1} max={99} value={form.numeroMaillot} onChange={(e) => setForm((f) => ({ ...f, numeroMaillot: e.target.value }))} placeholder="9" />
        </div>
        {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
        <div className="flex gap-3 mt-2">
          <Button variant="secondary" full onClick={() => setShowModal(false)}>Annuler</Button>
          <Button full onClick={handleCreate} loading={saving}>Créer</Button>
        </div>
      </Modal>
    </AppLayout>
  );
}
