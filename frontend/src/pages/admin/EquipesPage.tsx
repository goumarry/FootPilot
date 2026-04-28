import { useState, useEffect, useCallback } from 'react';
import { Shield, Plus, Pencil, Trash2, ChevronRight } from 'lucide-react';
import { getEquipes, createEquipe, updateEquipe, deleteEquipe } from '@/api/equipes';
import { getCategories } from '@/api/categories';
import type { Equipe, Categorie } from '@/types';
import AppLayout from '@/layouts/AppLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';

export default function EquipesPage() {
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Equipe | null>(null);
  const [form, setForm] = useState({ categorieId: '', nomEquipe: '', niveauChampionnat: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [e, c] = await Promise.all([getEquipes(), getCategories()]);
    setEquipes(e);
    setCategories(c);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditing(null);
    setForm({ categorieId: categories[0]?.id ?? '', nomEquipe: '', niveauChampionnat: '' });
    setError('');
    setShowModal(true);
  }

  function openEdit(eq: Equipe) {
    setEditing(eq);
    setForm({ categorieId: eq.categorieId, nomEquipe: eq.nomEquipe, niveauChampionnat: eq.niveauChampionnat ?? '' });
    setError('');
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.nomEquipe.trim() || !form.categorieId) {
      setError('Nom et catégorie sont requis.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editing) {
        const updated = await updateEquipe(editing.id, {
          nomEquipe: form.nomEquipe.trim(),
          niveauChampionnat: form.niveauChampionnat.trim() || undefined,
        });
        setEquipes((prev) => prev.map((e) => (e.id === editing.id ? { ...e, ...updated } : e)));
      } else {
        const created = await createEquipe({
          categorieId: form.categorieId,
          nomEquipe: form.nomEquipe.trim(),
          niveauChampionnat: form.niveauChampionnat.trim() || undefined,
        });
        setEquipes((prev) => [...prev, created]);
      }
      setShowModal(false);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Erreur lors de la sauvegarde.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(eq: Equipe) {
    if (!confirm(`Supprimer "${eq.nomEquipe}" ?`)) return;
    try {
      await deleteEquipe(eq.id);
      setEquipes((prev) => prev.filter((e) => e.id !== eq.id));
    } catch (err: unknown) {
      alert(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Impossible de supprimer cette équipe.'
      );
    }
  }

  const grouped = categories.map((cat) => ({
    cat,
    equipes: equipes.filter((e) => e.categorieId === cat.id),
  })).filter((g) => g.equipes.length > 0);

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs text-violet-400 font-semibold uppercase tracking-wider mb-1">Gestion</p>
            <h1 className="text-2xl font-extrabold text-slate-50">Équipes</h1>
          </div>
          <Button onClick={openCreate} disabled={categories.length === 0}>
            <Plus size={15} />
            <span>Nouvelle équipe</span>
          </Button>
        </div>

        {categories.length === 0 && !loading && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6 text-sm text-amber-300">
            Créez d'abord des catégories avant d'ajouter des équipes.
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 text-slate-500 text-sm">Chargement…</div>
        ) : equipes.length === 0 ? (
          <EmptyState
            icon={<Shield size={22} />}
            title="Aucune équipe"
            description="Créez vos équipes et assignez-leur des joueurs et entraîneurs."
            action={
              categories.length > 0 ? (
                <Button onClick={openCreate} variant="secondary">
                  <Plus size={15} /> Créer une équipe
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-6">
            {grouped.map(({ cat, equipes: eqs }) => (
              <div key={cat.id}>
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{cat.nom}</h2>
                <div className="space-y-2">
                  {eqs.map((eq) => (
                    <div
                      key={eq.id}
                      className="flex items-center gap-4 bg-slate-800/50 border border-slate-700/40 rounded-xl px-4 py-3.5"
                    >
                      <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                        <Shield size={16} className="text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-200">{eq.nomEquipe}</p>
                        <p className="text-xs text-slate-500">
                          {eq.niveauChampionnat ?? 'Niveau non renseigné'}
                          {eq._count && ` · ${eq._count.joueurs} joueur${eq._count.joueurs !== 1 ? 's' : ''}`}
                        </p>
                      </div>
                      <button
                        onClick={() => openEdit(eq)}
                        className="text-slate-500 hover:text-slate-300 transition-colors p-1"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(eq)}
                        className="text-slate-500 hover:text-red-400 transition-colors p-1"
                      >
                        <Trash2 size={15} />
                      </button>
                      <ChevronRight size={15} className="text-slate-600" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Modifier l\'équipe' : 'Nouvelle équipe'}
      >
        <Select
          label="Catégorie"
          value={form.categorieId}
          onChange={(e) => setForm((f) => ({ ...f, categorieId: e.target.value }))}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.nom}</option>
          ))}
        </Select>
        <Input
          label="Nom de l'équipe"
          placeholder="Ex : Équipe A, U17 B…"
          value={form.nomEquipe}
          onChange={(e) => setForm((f) => ({ ...f, nomEquipe: e.target.value }))}
        />
        <Input
          label="Niveau de championnat (optionnel)"
          placeholder="Ex : Régional 1, Départemental 2…"
          value={form.niveauChampionnat}
          onChange={(e) => setForm((f) => ({ ...f, niveauChampionnat: e.target.value }))}
        />
        {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
        <div className="flex gap-3 mt-2">
          <Button variant="secondary" full onClick={() => setShowModal(false)}>Annuler</Button>
          <Button full onClick={handleSave} loading={saving}>
            {editing ? 'Modifier' : 'Créer'}
          </Button>
        </div>
      </Modal>
    </AppLayout>
  );
}
