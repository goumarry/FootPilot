import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, X, Shield, User } from 'lucide-react';
import { getEquipe, assignJoueur, removeJoueur, assignEntraineur, removeEntraineur } from '@/api/equipes';
import { getJoueurs } from '@/api/joueurs';
import { getEntraineurs } from '@/api/entraineurs';
import type { EquipeDetail, Joueur, Entraineur } from '@/types';
import AppLayout from '@/layouts/AppLayout';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { POSTE_LABELS } from '@/types';

export default function EquipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [equipe, setEquipe] = useState<EquipeDetail | null>(null);
  const [allJoueurs, setAllJoueurs] = useState<Joueur[]>([]);
  const [allEntraineurs, setAllEntraineurs] = useState<Entraineur[]>([]);
  const [loading, setLoading] = useState(true);

  const [showJoueurModal, setShowJoueurModal] = useState(false);
  const [showEntraineurModal, setShowEntraineurModal] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [eq, joueurs, entraineurs] = await Promise.all([
      getEquipe(id),
      getJoueurs(),
      getEntraineurs(),
    ]);
    setEquipe(eq);
    setAllJoueurs(joueurs);
    setAllEntraineurs(entraineurs);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleAddJoueur(joueur: Joueur) {
    if (!equipe) return;
    setAssigning(joueur.id);
    try {
      const activeTeam = joueur.equipes?.[0];
      if (activeTeam) {
        await removeJoueur(activeTeam.equipe.id, joueur.id);
      }
      await assignJoueur(equipe.id, joueur.id);
      setShowJoueurModal(false);
      await load();
    } finally {
      setAssigning(null);
    }
  }

  async function handleRemoveJoueur(joueurId: string) {
    if (!equipe) return;
    setRemoving(joueurId);
    try {
      await removeJoueur(equipe.id, joueurId);
      setEquipe((prev) =>
        prev ? { ...prev, joueurs: prev.joueurs.filter((j) => j.joueurId !== joueurId) } : prev
      );
    } finally {
      setRemoving(null);
    }
  }

  async function handleAddEntraineur(entraineur: Entraineur) {
    if (!equipe) return;
    setAssigning(entraineur.id);
    try {
      await assignEntraineur(equipe.id, entraineur.id);
      setShowEntraineurModal(false);
      await load();
    } finally {
      setAssigning(null);
    }
  }

  async function handleRemoveEntraineur(entraineurId: string) {
    if (!equipe) return;
    setRemoving(entraineurId);
    try {
      await removeEntraineur(equipe.id, entraineurId);
      setEquipe((prev) =>
        prev
          ? { ...prev, entraineurs: prev.entraineurs.filter((e) => e.entraineurId !== entraineurId) }
          : prev
      );
    } finally {
      setRemoving(null);
    }
  }

  const currentJoueurIds = new Set(equipe?.joueurs.map((j) => j.joueurId) ?? []);
  const currentEntraineurIds = new Set(equipe?.entraineurs.map((e) => e.entraineurId) ?? []);

  const availableJoueurs = allJoueurs.filter((j) => !currentJoueurIds.has(j.id));
  const availableEntraineurs = allEntraineurs.filter((e) => !currentEntraineurIds.has(e.id));

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 text-center py-16 text-slate-500 text-sm">Chargement…</div>
      </AppLayout>
    );
  }

  if (!equipe) {
    return (
      <AppLayout>
        <div className="p-6 text-center py-16 text-slate-500 text-sm">Équipe introuvable.</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl">
        {/* Header */}
        <button
          onClick={() => navigate('/admin/equipes')}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors mb-5"
        >
          <ArrowLeft size={15} />
          Équipes
        </button>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
            <Shield size={18} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-50">{equipe.nomEquipe}</h1>
            {equipe.categorie && (
              <p className="text-xs text-slate-500 mt-0.5">{equipe.categorie.nom}</p>
            )}
          </div>
        </div>

        {/* Joueurs */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
              Joueurs ({equipe.joueurs.length})
            </h2>
            <Button size="sm" variant="secondary" onClick={() => setShowJoueurModal(true)}>
              <UserPlus size={13} />
              Ajouter
            </Button>
          </div>

          {equipe.joueurs.length === 0 ? (
            <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl px-4 py-6 text-center text-sm text-slate-500">
              Aucun joueur dans cette équipe
            </div>
          ) : (
            <div className="space-y-2">
              {equipe.joueurs.map(({ joueurId, joueur }) => (
                <div
                  key={joueurId}
                  className="flex items-center gap-3 bg-slate-800/50 border border-slate-700/40 rounded-xl px-4 py-3"
                >
                  <div className="w-8 h-8 rounded-full bg-violet-500/15 flex items-center justify-center flex-shrink-0">
                    <User size={14} className="text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-200">
                      {joueur.firstName} {joueur.lastName}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {joueur.poste && (
                        <span className="text-xs text-slate-500">{POSTE_LABELS[joueur.poste]}</span>
                      )}
                      {joueur.numeroMaillot && (
                        <span className="text-xs text-slate-600">#{joueur.numeroMaillot}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveJoueur(joueurId)}
                    disabled={removing === joueurId}
                    className="text-slate-600 hover:text-red-400 transition-colors p-1 disabled:opacity-40"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Entraîneurs */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
              Entraîneurs ({equipe.entraineurs.length})
            </h2>
            <Button size="sm" variant="secondary" onClick={() => setShowEntraineurModal(true)}>
              <UserPlus size={13} />
              Ajouter
            </Button>
          </div>

          {equipe.entraineurs.length === 0 ? (
            <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl px-4 py-6 text-center text-sm text-slate-500">
              Aucun entraîneur dans cette équipe
            </div>
          ) : (
            <div className="space-y-2">
              {equipe.entraineurs.map(({ entraineurId, entraineur }) => (
                <div
                  key={entraineurId}
                  className="flex items-center gap-3 bg-slate-800/50 border border-slate-700/40 rounded-xl px-4 py-3"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                    <User size={14} className="text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-200">
                      {entraineur.firstName} {entraineur.lastName}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemoveEntraineur(entraineurId)}
                    disabled={removing === entraineurId}
                    className="text-slate-600 hover:text-red-400 transition-colors p-1 disabled:opacity-40"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Modal ajout joueur */}
      <Modal
        open={showJoueurModal}
        onClose={() => setShowJoueurModal(false)}
        title="Ajouter un joueur"
      >
        {availableJoueurs.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">
            Tous les joueurs du club sont déjà dans cette équipe.
          </p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto -mx-1 px-1">
            {availableJoueurs.map((joueur) => {
              const currentTeam = joueur.equipes?.[0]?.equipe;
              return (
                <button
                  key={joueur.id}
                  onClick={() => handleAddJoueur(joueur)}
                  disabled={assigning === joueur.id}
                  className="w-full flex items-center gap-3 bg-slate-800/50 border border-slate-700/40 rounded-xl px-4 py-3 text-left hover:border-violet-500/40 hover:bg-slate-800/80 transition-colors disabled:opacity-50"
                >
                  <div className="w-8 h-8 rounded-full bg-violet-500/15 flex items-center justify-center flex-shrink-0">
                    <User size={14} className="text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-200">
                      {joueur.firstName} {joueur.lastName}
                    </p>
                    {currentTeam ? (
                      <p className="text-xs text-amber-400/80 mt-0.5">
                        Actuellement dans {currentTeam.nomEquipe} — sera déplacé
                      </p>
                    ) : joueur.poste ? (
                      <p className="text-xs text-slate-500 mt-0.5">{POSTE_LABELS[joueur.poste]}</p>
                    ) : null}
                  </div>
                  {assigning === joueur.id && (
                    <span className="text-xs text-slate-500">…</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
        <div className="mt-4">
          <Button variant="secondary" full onClick={() => setShowJoueurModal(false)}>
            Annuler
          </Button>
        </div>
      </Modal>

      {/* Modal ajout entraîneur */}
      <Modal
        open={showEntraineurModal}
        onClose={() => setShowEntraineurModal(false)}
        title="Ajouter un entraîneur"
      >
        {availableEntraineurs.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">
            Tous les entraîneurs du club sont déjà dans cette équipe.
          </p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto -mx-1 px-1">
            {availableEntraineurs.map((entraineur) => {
              const teams = entraineur.equipes ?? [];
              return (
                <button
                  key={entraineur.id}
                  onClick={() => handleAddEntraineur(entraineur)}
                  disabled={assigning === entraineur.id}
                  className="w-full flex items-center gap-3 bg-slate-800/50 border border-slate-700/40 rounded-xl px-4 py-3 text-left hover:border-violet-500/40 hover:bg-slate-800/80 transition-colors disabled:opacity-50"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                    <User size={14} className="text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-200">
                      {entraineur.user?.firstName} {entraineur.user?.lastName}
                    </p>
                    {teams.length > 0 && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        {teams.map((t) => t.equipe.nomEquipe).join(', ')}
                      </p>
                    )}
                  </div>
                  {assigning === entraineur.id && (
                    <span className="text-xs text-slate-500">…</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
        <div className="mt-4">
          <Button variant="secondary" full onClick={() => setShowEntraineurModal(false)}>
            Annuler
          </Button>
        </div>
      </Modal>
    </AppLayout>
  );
}
