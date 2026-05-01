import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, X, Shield, User, Lock, Search } from 'lucide-react';
import { getEquipe, assignJoueur, removeJoueur, assignEntraineur, removeEntraineur } from '@/api/equipes';
import { getJoueurs } from '@/api/joueurs';
import { getEntraineurs } from '@/api/entraineurs';
import type { EquipeDetail, Joueur, Entraineur } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import AppLayout from '@/layouts/AppLayout';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Dialog, { type DialogConfig } from '@/components/ui/Dialog';

export default function EquipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();

  const [equipe, setEquipe] = useState<EquipeDetail | null>(null);
  const [allJoueurs, setAllJoueurs] = useState<Joueur[]>([]);
  const [allEntraineurs, setAllEntraineurs] = useState<Entraineur[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<DialogConfig | null>(null);

  const [showJoueurModal, setShowJoueurModal] = useState(false);
  const [showEntraineurModal, setShowEntraineurModal] = useState(false);
  const [joueurSearch, setJoueurSearch] = useState('');
  const [entraineurSearch, setEntraineurSearch] = useState('');
  const [assigning, setAssigning] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [selfAssigning, setSelfAssigning] = useState(false);

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

  const isCoachRole = user?.role === 'ENTRAINEUR';
  const isGestionnaire = user?.role === 'GESTIONNAIRE';
  const isMyTeam = equipe?.entraineurs.some((ee) => ee.entraineur.userId === user?.id) ?? false;
  const canManage = isGestionnaire || isMyTeam;
  const myEntraineur = allEntraineurs.find((e) => e.userId === user?.id) ?? null;
  const teamHasCoaches = (equipe?.entraineurs.length ?? 0) > 0;

  // ENTRAINEUR: can only self-assign if team has no coaches yet
  // GESTIONNAIRE: can always self-assign if they have an Entraineur record and aren't already in team
  const canSelfAssign =
    !isMyTeam &&
    myEntraineur !== null &&
    (isGestionnaire || (isCoachRole && !teamHasCoaches));

  async function handleAddJoueur(joueur: Joueur) {
    if (!equipe) return;
    setAssigning(joueur.id);
    try {
      const activeTeam = joueur.equipes?.[0];
      if (activeTeam) {
        await removeJoueur(activeTeam.equipe.id, joueur.id);
      }
      await assignJoueur(equipe.id, joueur.id);
      // Modal stays open — refresh data
      await load();
    } catch (err) {
      setDialog({
        message:
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            t('common.saveError'),
        variant: 'warning',
      });
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
      // Modal stays open — refresh data
      await load();
    } catch (err) {
      setDialog({
        message:
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            t('common.saveError'),
        variant: 'warning',
      });
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

  async function handleSelfAssign() {
    if (!myEntraineur || !equipe) return;
    setSelfAssigning(true);
    try {
      await assignEntraineur(equipe.id, myEntraineur.id);
      await load();
    } catch (err) {
      setDialog({
        message:
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            t('common.saveError'),
        variant: 'warning',
      });
    } finally {
      setSelfAssigning(false);
    }
  }

  function handleLockedJoinClick() {
    setDialog({
      title: t('teams.joinAsCoach'),
      message: t('teams.contactCoachesHint'),
      variant: 'warning',
    });
  }

  const currentJoueurIds = new Set(equipe?.joueurs.map((j) => j.joueurId) ?? []);
  const currentEntraineurIds = new Set(equipe?.entraineurs.map((e) => e.entraineurId) ?? []);

  const availableJoueurs = allJoueurs
    .filter((j) => !currentJoueurIds.has(j.id))
    .filter((j) => {
      const q = joueurSearch.toLowerCase();
      return !q || `${j.firstName} ${j.lastName}`.toLowerCase().includes(q);
    });

  const availableEntraineurs = allEntraineurs
    .filter((e) => !currentEntraineurIds.has(e.id))
    .filter((e) => {
      const q = entraineurSearch.toLowerCase();
      return !q || `${e.user?.firstName ?? ''} ${e.user?.lastName ?? ''}`.toLowerCase().includes(q);
    });

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 text-center py-16 text-slate-500 text-sm">{t('common.loading')}</div>
      </AppLayout>
    );
  }

  if (!equipe) {
    return (
      <AppLayout>
        <div className="p-6 text-center py-16 text-slate-500 text-sm">{t('teams.notFound')}</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl">
        <button
          onClick={() => navigate('/admin/equipes')}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors mb-5"
        >
          <ArrowLeft size={15} />
          {t('teams.backToTeams')}
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isMyTeam ? 'bg-emerald-500/15' : 'bg-blue-500/10'
            }`}
          >
            <Shield size={18} className={isMyTeam ? 'text-emerald-400' : 'text-blue-400'} />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-extrabold text-slate-50">{equipe.nomEquipe}</h1>
            {equipe.categorie && (
              <p className="text-xs text-slate-500 mt-0.5">{equipe.categorie.nom}</p>
            )}
          </div>
          {isMyTeam && (
            <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
              {t('teams.yourTeam')}
            </span>
          )}
        </div>

        {/* Warning banner for ENTRAINEUR not on this team */}
        {isCoachRole && !isMyTeam && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Lock size={14} className="text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-300 mb-1">
                  {t('teams.notCoachHint')}
                </p>
                {canSelfAssign ? (
                  <Button size="sm" className="mt-1" onClick={handleSelfAssign} loading={selfAssigning}>
                    {t('teams.joinAsCoach')}
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      onClick={handleLockedJoinClick}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-slate-800/50 border border-slate-700/40 px-3 py-1.5 rounded-lg hover:border-slate-600/60 transition-colors cursor-pointer"
                    >
                      <Lock size={11} />
                      {t('teams.joinAsCoach')}
                    </button>
                    <span className="text-xs text-amber-400/60">{t('teams.contactCoachesHint')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Players section */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
              {t('teams.players')} ({equipe.joueurs.length})
            </h2>
            {canManage && (
              <Button size="sm" variant="secondary" onClick={() => { setJoueurSearch(''); setShowJoueurModal(true); }}>
                <UserPlus size={13} />
                {t('common.add')}
              </Button>
            )}
          </div>

          {equipe.joueurs.length === 0 ? (
            <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl px-4 py-6 text-center text-sm text-slate-500">
              {t('teams.noPlayersInTeam')}
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
                        <span className="text-xs text-slate-500">{t(`postes.${joueur.poste}`)}</span>
                      )}
                      {joueur.numeroMaillot && (
                        <span className="text-xs text-slate-600">#{joueur.numeroMaillot}</span>
                      )}
                    </div>
                  </div>
                  {canManage && (
                    <button
                      onClick={() => handleRemoveJoueur(joueurId)}
                      disabled={removing === joueurId}
                      className="text-slate-600 hover:text-red-400 transition-colors p-1 disabled:opacity-40"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Coaches section */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
              {t('teams.coaches')} ({equipe.entraineurs.length})
            </h2>
            <div className="flex items-center gap-2">
              {/* GESTIONNAIRE quick self-assign button */}
              {isGestionnaire && canSelfAssign && (
                <Button size="sm" variant="secondary" onClick={handleSelfAssign} loading={selfAssigning}>
                  {t('teams.joinAsCoach')}
                </Button>
              )}
              {canManage && (
                <Button size="sm" variant="secondary" onClick={() => { setEntraineurSearch(''); setShowEntraineurModal(true); }}>
                  <UserPlus size={13} />
                  {t('common.add')}
                </Button>
              )}
            </div>
          </div>

          {equipe.entraineurs.length === 0 ? (
            <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl px-4 py-6 text-center text-sm text-slate-500">
              {t('teams.noCoachesInTeam')}
            </div>
          ) : (
            <div className="space-y-2">
              {equipe.entraineurs.map(({ entraineurId, entraineur }) => (
                <div
                  key={entraineurId}
                  className={`flex items-center gap-3 border rounded-xl px-4 py-3 ${
                    entraineur.userId === user?.id
                      ? 'bg-emerald-500/5 border-emerald-500/25'
                      : 'bg-slate-800/50 border-slate-700/40'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      entraineur.userId === user?.id ? 'bg-emerald-500/15' : 'bg-blue-500/15'
                    }`}
                  >
                    <User
                      size={14}
                      className={entraineur.userId === user?.id ? 'text-emerald-400' : 'text-blue-400'}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-200">
                      {entraineur.firstName} {entraineur.lastName}
                    </p>
                  </div>
                  {canManage && (
                    <button
                      onClick={() => handleRemoveEntraineur(entraineurId)}
                      disabled={removing === entraineurId}
                      className="text-slate-600 hover:text-red-400 transition-colors p-1 disabled:opacity-40"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Add player modal — stays open after each addition */}
      <Modal
        open={showJoueurModal}
        onClose={() => setShowJoueurModal(false)}
        title={t('teams.addPlayerModal')}
      >
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder={t('teams.searchPlayer')}
            value={joueurSearch}
            onChange={(e) => setJoueurSearch(e.target.value)}
            className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl py-2 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
          />
        </div>
        {availableJoueurs.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">
            {joueurSearch ? t('common.noResults') : t('teams.allPlayersInTeam')}
          </p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto -mx-1 px-1">
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
                        {t('teams.movedFrom').replace('{team}', currentTeam.nomEquipe)}
                      </p>
                    ) : joueur.poste ? (
                      <p className="text-xs text-slate-500 mt-0.5">{t(`postes.${joueur.poste}`)}</p>
                    ) : null}
                  </div>
                  {assigning === joueur.id && <span className="text-xs text-slate-500">…</span>}
                </button>
              );
            })}
          </div>
        )}
        <div className="mt-4">
          <Button variant="secondary" full onClick={() => setShowJoueurModal(false)}>
            {t('common.cancel')}
          </Button>
        </div>
      </Modal>

      {/* Add coach modal — stays open after each addition */}
      <Modal
        open={showEntraineurModal}
        onClose={() => setShowEntraineurModal(false)}
        title={t('teams.addCoachModal')}
      >
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder={t('teams.searchCoach')}
            value={entraineurSearch}
            onChange={(e) => setEntraineurSearch(e.target.value)}
            className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl py-2 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
          />
        </div>
        {availableEntraineurs.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">
            {entraineurSearch ? t('common.noResults') : t('teams.allCoachesInTeam')}
          </p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto -mx-1 px-1">
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
                        {teams.map((tt) => tt.equipe.nomEquipe).join(', ')}
                      </p>
                    )}
                  </div>
                  {assigning === entraineur.id && <span className="text-xs text-slate-500">…</span>}
                </button>
              );
            })}
          </div>
        )}
        <div className="mt-4">
          <Button variant="secondary" full onClick={() => setShowEntraineurModal(false)}>
            {t('common.cancel')}
          </Button>
        </div>
      </Modal>

      <Dialog
        open={!!dialog}
        title={dialog?.title}
        message={dialog?.message ?? ''}
        variant={dialog?.variant}
        confirmLabel={dialog?.confirmLabel}
        onConfirm={dialog?.onConfirm}
        onClose={() => setDialog(null)}
      />
    </AppLayout>
  );
}
