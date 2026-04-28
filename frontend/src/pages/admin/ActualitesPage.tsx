import { useState, useEffect, useCallback } from 'react';
import { Newspaper, Plus, Trash2, User } from 'lucide-react';
import { getActualites, createActualite, deleteActualite } from '@/api/actualites';
import type { Actualite } from '@/types';
import AppLayout from '@/layouts/AppLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import { useAuth } from '@/contexts/AuthContext';

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h}h`;
  const d = Math.floor(h / 24);
  return `il y a ${d} jour${d > 1 ? 's' : ''}`;
}

export default function ActualitesPage() {
  const { user } = useAuth();
  const [actualites, setActualites] = useState<Actualite[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ titre: '', contenu: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    const res = await getActualites(p);
    setActualites(res.data);
    setTotalPages(res.totalPages);
    setPage(res.page);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate() {
    if (!form.titre.trim() || !form.contenu.trim()) {
      setError('Titre et contenu sont requis.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const created = await createActualite({ titre: form.titre, contenu: form.contenu });
      setActualites((prev) => [created, ...prev]);
      setShowModal(false);
      setForm({ titre: '', contenu: '' });
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Erreur lors de la publication.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette actualité ?')) return;
    await deleteActualite(id);
    setActualites((prev) => prev.filter((a) => a.id !== id));
  }

  const canPublish = user?.role === 'GESTIONNAIRE' || user?.role === 'ADMIN' || user?.role === 'ENTRAINEUR';

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs text-violet-400 font-semibold uppercase tracking-wider mb-1">Communication</p>
            <h1 className="text-2xl font-extrabold text-slate-50">Actualités</h1>
          </div>
          {canPublish && (
            <Button onClick={() => setShowModal(true)}>
              <Plus size={15} />
              <span>Publier</span>
            </Button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-500 text-sm">Chargement…</div>
        ) : actualites.length === 0 ? (
          <EmptyState
            icon={<Newspaper size={22} />}
            title="Aucune actualité"
            description="Publiez des informations pour tous les membres du club."
            action={
              canPublish ? (
                <Button onClick={() => setShowModal(true)} variant="secondary">
                  <Plus size={15} /> Première publication
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-4">
            {actualites.map((actu) => (
              <div
                key={actu.id}
                className="bg-slate-800/50 border border-slate-700/40 rounded-2xl p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-slate-100 mb-2">{actu.titre}</h3>
                    <p className="text-sm text-slate-400 whitespace-pre-line leading-relaxed">
                      {actu.contenu}
                    </p>
                  </div>
                  {canPublish && (
                    <button
                      onClick={() => handleDelete(actu.id)}
                      className="text-slate-600 hover:text-red-400 transition-colors flex-shrink-0 mt-0.5"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-700/30">
                  <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center">
                    <User size={12} className="text-violet-400" />
                  </div>
                  <span className="text-xs text-slate-500">
                    {actu.auteur
                      ? `${actu.auteur.firstName} ${actu.auteur.lastName}`
                      : 'Auteur inconnu'}
                  </span>
                  <span className="text-slate-700">·</span>
                  <span className="text-xs text-slate-600">{timeAgo(actu.createdAt)}</span>
                  {actu.equipe && (
                    <>
                      <span className="text-slate-700">·</span>
                      <span className="text-xs text-violet-400">{actu.equipe.nomEquipe}</span>
                    </>
                  )}
                </div>
              </div>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 pt-4">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => load(page - 1)}
                  disabled={page <= 1}
                >
                  Précédent
                </Button>
                <span className="flex items-center text-xs text-slate-500 px-2">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => load(page + 1)}
                  disabled={page >= totalPages}
                >
                  Suivant
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nouvelle actualité">
        <Input
          label="Titre"
          placeholder="Ex : Résultats du week-end, Convocation…"
          value={form.titre}
          onChange={(e) => setForm((f) => ({ ...f, titre: e.target.value }))}
        />
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 tracking-wide uppercase">
            Contenu
          </label>
          <textarea
            className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl py-2.5 px-4 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/40 resize-none"
            rows={5}
            placeholder="Contenu de votre actualité…"
            value={form.contenu}
            onChange={(e) => setForm((f) => ({ ...f, contenu: e.target.value }))}
          />
        </div>
        {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
        <p className="text-xs text-slate-500 mb-4">
          Une notification email sera envoyée à tous les membres du club.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" full onClick={() => setShowModal(false)}>Annuler</Button>
          <Button full onClick={handleCreate} loading={saving}>Publier</Button>
        </div>
      </Modal>
    </AppLayout>
  );
}
