import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, FolderOpen, Plus, Pencil, Trash2, ChevronRight, AlertCircle, Lock, Info } from 'lucide-react';
import { getEquipes, createEquipe, updateEquipe, deleteEquipe } from '@/api/equipes';
import { getCategories, createCategorie, updateCategorie, deleteCategorie } from '@/api/categories';
import { createPaymentCheckout } from '@/api/billing';
import type { Equipe, Categorie } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { useBilling, EQUIPES_LIMIT } from '@/contexts/BillingContext';
import AppLayout from '@/layouts/AppLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Dialog, { type DialogConfig } from '@/components/ui/Dialog';
import EmptyState from '@/components/ui/EmptyState';

export default function EquipesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();
  const { hasUnlimitedCreation } = useBilling();
  const isGestionnaire = user?.role === 'GESTIONNAIRE';
  const isCoach = user?.role === 'ENTRAINEUR';

  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<DialogConfig | null>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitUpgradeLoading, setLimitUpgradeLoading] = useState(false);

  // Category modal state
  const [showCatModal, setShowCatModal] = useState(false);
  const [editingCat, setEditingCat] = useState<Categorie | null>(null);
  const [catNom, setCatNom] = useState('');
  const [catError, setCatError] = useState('');
  const [catSaving, setCatSaving] = useState(false);

  // Team modal state
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Equipe | null>(null);
  const [teamCategorieId, setTeamCategorieId] = useState('');
  const [teamForm, setTeamForm] = useState({ nomEquipe: '', niveauChampionnat: '' });
  const [teamError, setTeamError] = useState('');
  const [teamSaving, setTeamSaving] = useState(false);

  // Drag & drop state (GESTIONNAIRE only)
  const [draggedEquipeId, setDraggedEquipeId] = useState<string | null>(null);
  const [dropTargetCatId, setDropTargetCatId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [e, c] = await Promise.all([getEquipes(), getCategories()]);
    setEquipes(e);
    setCategories(c);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Category CRUD ──────────────────────────────────────────────────────────

  function openCreateCat() {
    setEditingCat(null);
    setCatNom('');
    setCatError('');
    setShowCatModal(true);
  }

  function openEditCat(e: React.MouseEvent, cat: Categorie) {
    e.stopPropagation();
    setEditingCat(cat);
    setCatNom(cat.nom);
    setCatError('');
    setShowCatModal(true);
  }

  async function handleSaveCat() {
    if (!catNom.trim()) { setCatError(t('categories.nameRequired')); return; }
    setCatSaving(true);
    setCatError('');
    try {
      if (editingCat) {
        const updated = await updateCategorie(editingCat.id, catNom.trim());
        setCategories((prev) => prev.map((c) => (c.id === editingCat.id ? updated : c)));
      } else {
        const created = await createCategorie(catNom.trim());
        setCategories((prev) => [...prev, created]);
      }
      setShowCatModal(false);
    } catch (err: unknown) {
      setCatError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          t('common.saveError')
      );
    } finally {
      setCatSaving(false);
    }
  }

  function confirmDeleteCat(e: React.MouseEvent, cat: Categorie) {
    e.stopPropagation();
    setDialog({
      title: t('categories.deleteConfirm').replace('{name}', cat.nom),
      message: '',
      variant: 'danger',
      confirmLabel: t('common.delete'),
      onConfirm: async () => {
        setDialog(null);
        try {
          await deleteCategorie(cat.id);
          setCategories((prev) => prev.filter((c) => c.id !== cat.id));
        } catch (err: unknown) {
          setDialog({
            message:
              (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
                t('categories.deleteError'),
            variant: 'warning',
          });
        }
      },
    });
  }

  // ── Team CRUD ──────────────────────────────────────────────────────────────

  async function handleUpgradeLimit() {
    setLimitUpgradeLoading(true);
    try {
      const { url } = await createPaymentCheckout();
      window.location.href = url;
    } catch {
      setLimitUpgradeLoading(false);
    }
  }

  function openCreateTeam(categorieId: string) {
    if (!hasUnlimitedCreation && equipes.length >= EQUIPES_LIMIT) {
      setShowLimitModal(true);
      return;
    }
    setEditingTeam(null);
    setTeamCategorieId(categorieId);
    setTeamForm({ nomEquipe: '', niveauChampionnat: '' });
    setTeamError('');
    setShowTeamModal(true);
  }

  function openEditTeam(e: React.MouseEvent, eq: Equipe) {
    e.stopPropagation();
    setEditingTeam(eq);
    setTeamCategorieId(eq.categorieId);
    setTeamForm({ nomEquipe: eq.nomEquipe, niveauChampionnat: eq.niveauChampionnat ?? '' });
    setTeamError('');
    setShowTeamModal(true);
  }

  async function handleSaveTeam() {
    if (!teamForm.nomEquipe.trim()) { setTeamError(t('teams.nameRequired')); return; }
    setTeamSaving(true);
    setTeamError('');
    try {
      if (editingTeam) {
        const updated = await updateEquipe(editingTeam.id, {
          nomEquipe: teamForm.nomEquipe.trim(),
          niveauChampionnat: teamForm.niveauChampionnat.trim() || undefined,
        });
        setEquipes((prev) => prev.map((e) => (e.id === editingTeam.id ? { ...e, ...updated } : e)));
      } else {
        const created = await createEquipe({
          categorieId: teamCategorieId,
          nomEquipe: teamForm.nomEquipe.trim(),
          niveauChampionnat: teamForm.niveauChampionnat.trim() || undefined,
        });
        setEquipes((prev) => [...prev, created]);
      }
      setShowTeamModal(false);
    } catch (err: unknown) {
      setTeamError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          t('common.saveError')
      );
    } finally {
      setTeamSaving(false);
    }
  }

  function confirmDeleteTeam(e: React.MouseEvent, eq: Equipe) {
    e.stopPropagation();
    setDialog({
      title: t('teams.deleteConfirm').replace('{name}', eq.nomEquipe),
      message: '',
      variant: 'danger',
      confirmLabel: t('common.delete'),
      onConfirm: async () => {
        setDialog(null);
        try {
          await deleteEquipe(eq.id);
          setEquipes((prev) => prev.filter((e) => e.id !== eq.id));
        } catch (err: unknown) {
          setDialog({
            message:
              (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
                t('teams.deleteError'),
            variant: 'warning',
          });
        }
      },
    });
  }

  // ── Drag & Drop ───────────────────────────────────────────────────────────
  // GESTIONNAIRE : toutes les équipes. ENTRAINEUR : ses équipes uniquement.

  async function handleDrop(newCategorieId: string) {
    if (!draggedEquipeId) return;
    const eq = equipes.find((e) => e.id === draggedEquipeId);
    setDraggedEquipeId(null);
    setDropTargetCatId(null);
    if (!eq || eq.categorieId === newCategorieId) return;

    setEquipes((prev) =>
      prev.map((e) => (e.id === draggedEquipeId ? { ...e, categorieId: newCategorieId } : e))
    );
    try {
      await updateEquipe(draggedEquipeId, { categorieId: newCategorieId });
    } catch {
      await load();
    }
  }

  const grouped = categories.map((cat) => ({
    cat,
    equipes: equipes.filter((e) => e.categorieId === cat.id),
  }));

  return (
    <AppLayout>
      <div className="p-3 sm:p-6 max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <p className="text-xs text-violet-400 font-semibold uppercase tracking-wider mb-1">
              {t('teams.subtitle')}
            </p>
            <h1 className="text-2xl font-extrabold text-slate-50">{t('teams.title')}</h1>
          </div>
          <div className="flex items-center gap-3">
            {!hasUnlimitedCreation && (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                equipes.length >= EQUIPES_LIMIT
                  ? 'text-red-400 border-red-500/30 bg-red-500/10'
                  : 'text-slate-400 border-slate-600/40 bg-slate-800/50'
              }`}>
                {t('paywall.teamsLimit')
                  .replace('{current}', String(equipes.length))
                  .replace('{limit}', String(EQUIPES_LIMIT))}
              </span>
            )}
            {isGestionnaire && (
              <Button onClick={openCreateCat}>
                <Plus size={15} />
                <span>{t('categories.createCategory')}</span>
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-500 text-sm">{t('common.loading')}</div>
        ) : categories.length === 0 ? (
          <EmptyState
            icon={<FolderOpen size={22} />}
            title={t('categories.noCategories')}
            description={t('categories.noCategoriesDesc')}
            action={
              isGestionnaire ? (
                <Button onClick={openCreateCat} variant="secondary">
                  <Plus size={15} /> {t('categories.createCategory')}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-4">
            {grouped.map(({ cat, equipes: eqs }) => (
              <div
                key={cat.id}
                onDragOver={(e) => { e.preventDefault(); setDropTargetCatId(cat.id); }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDropTargetCatId(null);
                  }
                }}
                onDrop={() => handleDrop(cat.id)}
                className={`rounded-2xl border p-3 sm:p-4 transition-all ${
                  dropTargetCatId === cat.id
                    ? 'border-violet-500/60 bg-violet-500/5'
                    : 'border-slate-700/40 bg-slate-800/30'
                }`}
              >
                {/* Category header */}
                <div className="flex items-center gap-2 sm:gap-3 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                    <FolderOpen size={15} className="text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-200 truncate">{cat.nom}</p>
                    <p className="text-xs text-slate-500">
                      {eqs.length === 1
                        ? t('categories.teamCount').replace('{n}', String(eqs.length))
                        : t('categories.teamCountPlural').replace('{n}', String(eqs.length))}
                    </p>
                  </div>
                  {/* Add team button — all roles can create teams */}
                  <button
                    onClick={() => openCreateTeam(cat.id)}
                    title={t('teams.createTeam')}
                    className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/20 transition-colors flex-shrink-0"
                  >
                    <Plus size={13} />
                  </button>
                  {isGestionnaire && (
                    <>
                      <button
                        onClick={(e) => openEditCat(e, cat)}
                        className="text-slate-500 hover:text-slate-300 transition-colors p-1 flex-shrink-0"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={(e) => confirmDeleteCat(e, cat)}
                        className="text-slate-500 hover:text-red-400 transition-colors p-1 flex-shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>

                {/* Teams list */}
                {eqs.length === 0 ? (
                  <div className="ml-3 sm:ml-5 border border-dashed border-slate-700/30 rounded-xl px-4 py-3 text-center text-xs text-slate-600">
                    {t('teams.noTeams')}
                  </div>
                ) : (
                  <div className="ml-3 sm:ml-5 space-y-2">
                    {eqs.map((eq) => {
                      const isMyTeam =
                        (isCoach || isGestionnaire) &&
                        (eq.entraineurs?.some((e) => e.entraineur.userId === user?.id) ?? false);
                      const canEdit = isMyTeam;
                      const canDrag = isGestionnaire || (isCoach && isMyTeam);

                      return (
                        <div
                          key={eq.id}
                          draggable={canDrag}
                          onDragStart={(e) => {
                            e.dataTransfer.setData('equipeId', eq.id);
                            setDraggedEquipeId(eq.id);
                          }}
                          onDragEnd={() => {
                            setDraggedEquipeId(null);
                            setDropTargetCatId(null);
                          }}
                          onClick={() => navigate(`/admin/equipes/${eq.id}`)}
                          className={`flex items-center gap-2 sm:gap-3 border rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 transition-all select-none touch-manipulation ${
                            draggedEquipeId === eq.id
                              ? 'opacity-40'
                              : isMyTeam
                              ? 'bg-emerald-500/5 border-emerald-500/25 hover:border-emerald-500/50'
                              : !isCoach
                              ? 'bg-slate-800/50 border-slate-700/40 hover:border-slate-600/60 hover:bg-slate-800/70'
                              : 'bg-slate-800/25 border-slate-700/20 hover:border-slate-600/30 hover:bg-slate-800/40'
                          } ${canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
                        >
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                              isMyTeam
                                ? 'bg-emerald-500/15'
                                : !isCoach
                                ? 'bg-blue-500/10'
                                : 'bg-slate-700/20'
                            }`}
                          >
                            <Shield
                              size={14}
                              className={
                                isMyTeam
                                  ? 'text-emerald-400'
                                  : !isCoach
                                  ? 'text-blue-400'
                                  : 'text-slate-600'
                              }
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm font-semibold truncate ${
                                isMyTeam || !isCoach ? 'text-slate-200' : 'text-slate-500'
                              }`}
                            >
                              {eq.nomEquipe}
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                              {eq.niveauChampionnat ?? t('teams.levelUnset')}
                              {eq._count &&
                                ` · ${
                                  eq._count.joueurs === 1
                                    ? t('teams.playerCount').replace(
                                        '{n}',
                                        String(eq._count.joueurs)
                                      )
                                    : t('teams.playerCountPlural').replace(
                                        '{n}',
                                        String(eq._count.joueurs)
                                      )
                                }`}
                            </p>
                          </div>
                          {isMyTeam && (
                            <span className="hidden sm:inline text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex-shrink-0">
                              {t('teams.yourTeam')}
                            </span>
                          )}
                          <button
                            disabled={!canEdit}
                            onClick={(e) => openEditTeam(e, eq)}
                            className={`p-1 transition-colors flex-shrink-0 ${
                              canEdit
                                ? 'text-slate-500 hover:text-slate-300 cursor-pointer'
                                : 'text-slate-700 cursor-not-allowed'
                            }`}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            disabled={!canEdit}
                            onClick={(e) => confirmDeleteTeam(e, eq)}
                            className={`p-1 transition-colors flex-shrink-0 ${
                              canEdit
                                ? 'text-slate-500 hover:text-red-400 cursor-pointer'
                                : 'text-slate-700 cursor-not-allowed'
                            }`}
                          >
                            <Trash2 size={14} />
                          </button>
                          <ChevronRight size={14} className="text-slate-600 flex-shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Category create/edit modal */}
      <Modal
        open={showCatModal}
        onClose={() => setShowCatModal(false)}
        title={editingCat ? t('categories.editTitle') : t('categories.createTitle')}
        size="sm"
      >
        <Input
          label={t('categories.nameLabel')}
          placeholder={t('categories.namePlaceholder')}
          value={catNom}
          onChange={(e) => setCatNom(e.target.value)}
          autoFocus
          onKeyDown={(e) => { if (e.key === 'Enter') handleSaveCat(); }}
        />
        {catError && (
          <div className="flex items-center gap-2 mb-3 text-xs text-red-400">
            <AlertCircle size={13} />
            <span>{catError}</span>
          </div>
        )}
        <div className="flex gap-3 mt-2">
          <Button variant="secondary" full onClick={() => setShowCatModal(false)}>
            {t('common.cancel')}
          </Button>
          <Button full onClick={handleSaveCat} loading={catSaving}>
            {editingCat ? t('common.edit') : t('common.create')}
          </Button>
        </div>
      </Modal>

      {/* Team create/edit modal */}
      <Modal
        open={showTeamModal}
        onClose={() => setShowTeamModal(false)}
        title={editingTeam ? t('teams.editTitle') : t('teams.createTitle')}
      >
        <Input
          label={t('teams.nameLabel')}
          placeholder={t('teams.namePlaceholder')}
          value={teamForm.nomEquipe}
          onChange={(e) => setTeamForm((f) => ({ ...f, nomEquipe: e.target.value }))}
          autoFocus
        />
        <Input
          label={t('teams.levelLabel')}
          placeholder={t('teams.levelPlaceholder')}
          value={teamForm.niveauChampionnat}
          onChange={(e) => setTeamForm((f) => ({ ...f, niveauChampionnat: e.target.value }))}
        />
        {teamError && <p className="text-xs text-red-400 mb-3">{teamError}</p>}
        <div className="flex gap-3 mt-2">
          <Button variant="secondary" full onClick={() => setShowTeamModal(false)}>
            {t('common.cancel')}
          </Button>
          <Button full onClick={handleSaveTeam} loading={teamSaving}>
            {editingTeam ? t('common.edit') : t('common.create')}
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

      {/* Modale limite équipes */}
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
