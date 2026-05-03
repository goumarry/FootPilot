import { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar, MapPin, ExternalLink, Pencil, Ban, Trash2, ClipboardList, Trophy, Star } from 'lucide-react';
import {
  getEvenements, createEvenement, updateEvenement, deleteEvenement,
  saisirScore, saisirAppel, getAppel,
} from '@/api/evenements';
import { getEquipes } from '@/api/equipes';
import type { Evenement, Equipe, StatutEvenement, StatutPresence, Presence } from '@/types';
import { STATUT_PRESENCE_LABELS } from '@/types';
import { useI18n } from '@/contexts/I18nContext';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/layouts/AppLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import Dialog, { type DialogConfig } from '@/components/ui/Dialog';
import Badge from '@/components/ui/Badge';
import PlacesInput from '@/components/ui/PlacesInput';
import {
  getStatut, formatDate, formatDuree, toDatetimeLocal, nowDatetimeLocal,
  mapsLink, osmEmbed, teamLabel, startOfWeek, addDays, isSameDay,
  DUREE_OPTIONS, DAY_LABELS_FR, DAY_LETTERS_FR,
} from '@/lib/planning';

const ALL_STATUTS: StatutPresence[] = ['PRESENT', 'ABSENT_NON_JUSTIFIE', 'BLESSE', 'RETARD', 'ABSENT_JUSTIFIE'];
const STATUT_COLORS: Record<StatutPresence, string> = {
  PRESENT: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  ABSENT_NON_JUSTIFIE: 'bg-red-500/10 text-red-400 border-red-500/20',
  ABSENT_JUSTIFIE: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  RETARD: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  BLESSE: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

function StatutBadge({ statut, t }: { statut: StatutEvenement; t: (k: string) => string }) {
  const cfg: Record<StatutEvenement, { label: string; cls: string }> = {
    AVENIR:   { label: t('planning.statusAvenir'),  cls: 'bg-slate-700/60 text-slate-400 border-slate-600/40' },
    EN_COURS: { label: t('planning.statusEnCours'), cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
    TERMINE:  { label: t('planning.statusTermine'), cls: 'bg-slate-800/60 text-slate-500 border-slate-700/30' },
    ANNULE:   { label: t('planning.statusAnnule'),  cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
  };
  const { label, cls } = cfg[statut];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      {statut === 'EN_COURS' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
      {label}
    </span>
  );
}

function PresenceBadge({ statut }: { statut: StatutPresence }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUT_COLORS[statut]}`}>
      {STATUT_PRESENCE_LABELS[statut]}
    </span>
  );
}

function StarRating({ value, onChange, readonly }: { value: number | null; onChange?: (v: number) => void; readonly?: boolean }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" disabled={readonly} onClick={() => onChange?.(i)} className={`p-0.5 transition-colors ${readonly ? 'cursor-default' : 'hover:scale-110'}`}>
          <Star size={13} className={i <= (value ?? 0) ? 'text-amber-400 fill-amber-400' : 'text-slate-600'} />
        </button>
      ))}
    </div>
  );
}

type AttendancePlayer = { id: string; firstName: string; lastName: string };
type PresenceDraft = { statut: StatutPresence; note: number | null; buts: number | null };

function AttendancePanel({ ev, canEdit, statut, t }: {
  ev: Evenement; canEdit: boolean; statut: StatutEvenement; t: (k: string) => string;
}) {
  const isMatch = ev.type === 'MATCH';
  const isActive = statut === 'EN_COURS' || statut === 'TERMINE';

  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<AttendancePlayer[]>([]);
  const [draft, setDraft] = useState<Record<string, PresenceDraft>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isActive) return;
    let cancelled = false;
    async function load() {
      setLoading(true); setError('');
      try {
        const records = await getAppel(ev.id);
        if (cancelled) return;

        const newPlayers: AttendancePlayer[] = [];
        const newDraft: Record<string, PresenceDraft> = {};
        (records as Presence[]).forEach((r) => {
          if (!r.joueur) return;
          newPlayers.push({ id: r.joueurId, firstName: r.joueur.firstName!, lastName: r.joueur.lastName! });
          newDraft[r.joueurId] = { statut: r.statut, note: r.note ?? null, buts: r.buts ?? null };
        });

        setPlayers(newPlayers);
        setDraft(newDraft);
      } catch {
        if (!cancelled) setError(t('planning.attendanceError'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [ev.id, isActive]); // eslint-disable-line

  function setPlayerDraft(id: string, patch: Partial<PresenceDraft>) {
    setDraft((d) => ({ ...d, [id]: { ...d[id], ...patch } }));
  }

  async function handleSave() {
    setSaving(true); setError(''); setSaved(false);
    try {
      const presences = players.map((p) => ({
        joueurId: p.id,
        statut: draft[p.id]?.statut ?? 'ABSENT_NON_JUSTIFIE',
        note: draft[p.id]?.note ?? null,
        buts: draft[p.id]?.buts ?? null,
      }));
      await saisirAppel(ev.id, presences);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError(t('planning.attendanceError'));
    } finally {
      setSaving(false);
    }
  }

  if (!isActive) return null;
  if (loading) return <p className="text-xs text-slate-500 italic py-2">{t('common.loading')}</p>;
  if (players.length === 0) {
    return <p className="text-xs text-slate-500 italic py-2">{t('planning.attendanceEmpty')}</p>;
  }

  return (
    <div className="space-y-1">
      <div className={`flex items-center gap-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 ${isMatch ? 'grid grid-cols-[1fr_auto_auto_auto]' : 'grid grid-cols-[1fr_auto_auto]'}`}>
        <span>{t('common.player')}</span>
        <span className="w-28 text-center">{t('planning.attendanceStatut')}</span>
        <span className="w-20 text-center">{t('planning.attendanceNote')}</span>
        {isMatch && <span className="w-14 text-center">{t('planning.attendanceButs')}</span>}
      </div>

      {players.map((p) => {
        const d = draft[p.id] ?? { statut: 'ABSENT_NON_JUSTIFIE' as StatutPresence, note: null, buts: null };
        return (
          <div key={p.id} className={`py-1.5 px-3 rounded-lg bg-slate-800/40 gap-2 ${isMatch ? 'grid grid-cols-[1fr_auto_auto_auto]' : 'grid grid-cols-[1fr_auto_auto]'} items-center`}>
            <span className="text-sm text-slate-200 font-medium truncate">{p.firstName} {p.lastName}</span>
            {canEdit ? (
              <select
                value={d.statut}
                onChange={(e) => setPlayerDraft(p.id, { statut: e.target.value as StatutPresence })}
                className="w-28 text-xs rounded-lg bg-slate-700/60 border border-slate-600/40 text-slate-200 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-violet-500"
              >
                {ALL_STATUTS.map((s) => <option key={s} value={s}>{STATUT_PRESENCE_LABELS[s]}</option>)}
              </select>
            ) : (
              <div className="w-28 flex justify-center">
                {d.statut ? <PresenceBadge statut={d.statut} /> : <span className="text-xs text-slate-600">—</span>}
              </div>
            )}
            <div className="w-20 flex justify-center">
              <StarRating value={d.note} readonly={!canEdit} onChange={(v) => setPlayerDraft(p.id, { note: v })} />
            </div>
            {isMatch && (
              <div className="w-14 flex justify-center">
                {canEdit ? (
                  <input
                    type="number" min={0} max={20}
                    value={d.buts ?? 0}
                    onChange={(e) => setPlayerDraft(p.id, { buts: Math.max(0, Number(e.target.value)) || null })}
                    className="w-12 text-center text-xs rounded-lg bg-slate-700/60 border border-slate-600/40 text-slate-200 px-1 py-1 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                ) : (
                  <span className="text-sm font-bold text-slate-300">{d.buts ?? '—'}</span>
                )}
              </div>
            )}
          </div>
        );
      })}

      {canEdit && (
        <div className="pt-2 flex items-center gap-3">
          <Button full onClick={handleSave} loading={saving} size="sm">{t('planning.attendanceSave')}</Button>
          {saved && <span className="text-xs text-emerald-400">{t('common.save')} ✓</span>}
        </div>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${active ? 'bg-violet-600 text-white' : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'}`}
    >
      {label}
    </button>
  );
}

export default function PlanningPage() {
  const { locale, t } = useI18n();
  const { user } = useAuth();
  const canManage = user?.role === 'GESTIONNAIRE' || user?.role === 'ENTRAINEUR';
  const isCoachLike = user?.role === 'ENTRAINEUR' || user?.role === 'GESTIONNAIRE';

  const [evenements, setEvenements] = useState<Evenement[]>([]);
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<string>(() => isCoachLike ? 'mine' : 'all');
  const [dialog, setDialog] = useState<DialogConfig | null>(null);
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [daysCount, setDaysCount] = useState<7 | 28>(() => window.innerWidth < 768 ? 7 : 28);

  useEffect(() => {
    function onResize() { setDaysCount(window.innerWidth < 768 ? 7 : 28); }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState('');
  const [form, setForm] = useState({
    type: 'ENTRAINEMENT' as 'MATCH' | 'ENTRAINEMENT',
    equipeId: '', adversaire: '', dateHeure: '', duree: 120,
    lieu: '', latitude: undefined as number | undefined, longitude: undefined as number | undefined, description: '',
  });

  const [selected, setSelected] = useState<Evenement | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [editForm, setEditForm] = useState({
    dateHeure: '', duree: 120, lieu: '',
    latitude: undefined as number | undefined, longitude: undefined as number | undefined, description: '',
  });

  const [scoreEdit, setScoreEdit] = useState(false);
  const [scoreDom, setScoreDom] = useState(0);
  const [scoreExt, setScoreExt] = useState(0);
  const [scoreSaving, setScoreSaving] = useState(false);
  const [scoreError, setScoreError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [ev, eq] = await Promise.all([getEvenements(), getEquipes()]);
    setEvenements(ev);
    setEquipes(eq);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const myTeamIds = useMemo(
    () => equipes.filter((eq) => eq.entraineurs?.some((e) => e.entraineur.userId === user?.id)).map((eq) => eq.id),
    [equipes, user]
  );

  const createEquipes = useMemo(
    () => equipes.filter((eq) => myTeamIds.includes(eq.id)),
    [equipes, myTeamIds]
  );

  const filterEquipes = useMemo(
    () => equipes.filter((eq) => myTeamIds.includes(eq.id)),
    [equipes, myTeamIds]
  );

  function canEditEvent(ev: Evenement): boolean {
    if (!canManage) return false;
    return myTeamIds.includes(ev.equipeId);
  }

  useEffect(() => {
    if (createEquipes.length > 0) {
      setForm((f) => ({
        ...f,
        equipeId: f.equipeId && createEquipes.some((e) => e.id === f.equipeId) ? f.equipeId : createEquipes[0].id,
      }));
    }
  }, [createEquipes]); // eslint-disable-line

  const filtered = useMemo(() => {
    if (filterMode === 'all') return evenements;
    if (filterMode === 'mine') return evenements.filter((e) => myTeamIds.includes(e.equipeId));
    return evenements.filter((e) => e.equipeId === filterMode);
  }, [evenements, filterMode, myTeamIds]);

  const days = useMemo(() => Array.from({ length: daysCount }, (_, i) => addDays(weekStart, i)), [weekStart, daysCount]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, Evenement[]>();
    for (const ev of filtered) {
      const key = new Date(ev.dateHeure).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    return map;
  }, [filtered]);

  const windowEnd = addDays(weekStart, daysCount);
  const windowLabel = (() => {
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
    const loc = locale === 'fr' ? 'fr-FR' : 'en-GB';
    return `${weekStart.toLocaleDateString(loc, opts)} — ${addDays(weekStart, daysCount - 1).toLocaleDateString(loc, { ...opts, year: 'numeric' })}`;
  })();

  const today = new Date();

  async function handleCreate() {
    if (!form.equipeId || !form.dateHeure) { setCreateError(t('planning.errorRequired')); return; }
    if (form.type === 'MATCH' && !form.adversaire.trim()) { setCreateError(t('planning.errorAdversaire')); return; }
    setSaving(true); setCreateError('');
    try {
      const payload: Record<string, unknown> = {
        type: form.type, equipeId: form.equipeId,
        dateHeure: new Date(form.dateHeure).toISOString(),
        duree: form.duree, lieu: form.lieu || undefined,
        latitude: form.latitude, longitude: form.longitude,
        description: form.description || undefined,
      };
      if (form.type === 'MATCH') payload.adversaire = form.adversaire.trim();
      const ev = await createEvenement(payload);
      setEvenements((prev) => [...prev, ev].sort((a, b) => new Date(a.dateHeure).getTime() - new Date(b.dateHeure).getTime()));
      setShowCreate(false);
      setForm((f) => ({ ...f, dateHeure: '', lieu: '', latitude: undefined, longitude: undefined, description: '', duree: 120, adversaire: '' }));
    } catch (err: unknown) {
      setCreateError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? t('planning.errorCreate'));
    } finally { setSaving(false); }
  }

  function openDetail(ev: Evenement) {
    setSelected(ev); setEditMode(false); setEditError(''); setScoreEdit(false); setScoreError('');
  }

  function openEdit() {
    if (!selected) return;
    setEditForm({
      dateHeure: toDatetimeLocal(selected.dateHeure), duree: selected.duree ?? 120, lieu: selected.lieu ?? '',
      latitude: selected.latitude ?? undefined, longitude: selected.longitude ?? undefined, description: selected.description ?? '',
    });
    setEditMode(true); setEditError('');
  }

  async function handleUpdate() {
    if (!selected || !editForm.dateHeure) return;
    setEditSaving(true); setEditError('');
    try {
      const updated = await updateEvenement(selected.id, {
        dateHeure: new Date(editForm.dateHeure).toISOString(), duree: editForm.duree,
        lieu: editForm.lieu || null, latitude: editForm.latitude ?? null,
        longitude: editForm.longitude ?? null, description: editForm.description || null,
      });
      setEvenements((prev) => prev.map((e) => (e.id === selected.id ? { ...e, ...updated } : e)).sort((a, b) => new Date(a.dateHeure).getTime() - new Date(b.dateHeure).getTime()));
      setSelected((prev) => (prev ? { ...prev, ...updated } : null));
      setEditMode(false);
    } catch (err: unknown) {
      setEditError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? t('planning.errorUpdate'));
    } finally { setEditSaving(false); }
  }

  async function handleSaveScore() {
    if (!selected) return;
    setScoreSaving(true); setScoreError('');
    try {
      await saisirScore(selected.id, { scoreDom, scoreExt });
      setSelected((s) => s ? { ...s, scoreDom, scoreExt, statutMatch: 'TERMINE' } : null);
      setEvenements((evs) => evs.map((e) => e.id === selected.id ? { ...e, scoreDom, scoreExt, statutMatch: 'TERMINE' } : e));
      setScoreEdit(false);
    } catch { setScoreError(t('planning.scoreError')); }
    finally { setScoreSaving(false); }
  }

  function confirmCancel() {
    setDialog({
      title: t('planning.cancelEvent'), message: t('planning.cancelEventConfirm'), variant: 'warning',
      confirmLabel: t('planning.cancelEvent'),
      onConfirm: async () => {
        if (!selected) return;
        setDialog(null);
        const updated = await updateEvenement(selected.id, { annule: true });
        setEvenements((prev) => prev.map((e) => (e.id === selected.id ? { ...e, ...updated } : e)));
        setSelected((prev) => (prev ? { ...prev, annule: true } : null));
      },
    });
  }

  function confirmDelete() {
    setDialog({
      title: t('planning.deleteConfirmTitle'), message: t('planning.deleteConfirm'), variant: 'danger',
      confirmLabel: t('common.delete'),
      onConfirm: async () => {
        if (!selected) return;
        setDialog(null);
        try {
          await deleteEvenement(selected.id);
          setEvenements((prev) => prev.filter((e) => e.id !== selected.id));
          setSelected(null);
        } catch (err: unknown) {
          setDialog({ message: (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? t('planning.errorDelete'), variant: 'warning' });
        }
      },
    });
  }

  const selectedStatut = selected ? getStatut(selected) : null;
  const selectedEditable = selected ? (selectedStatut === 'AVENIR' || selectedStatut === 'EN_COURS') : false;
  const selectedCanEdit = selected ? canEditEvent(selected) : false;
  const canEditAppel = canManage && !!selected && myTeamIds.includes(selected.equipeId);

  return (
    <AppLayout>
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div>
            <p className="text-xs text-violet-400 font-semibold uppercase tracking-wider mb-0.5">{t('planning.subtitle')}</p>
            <h1 className="text-xl md:text-2xl font-extrabold text-slate-50">{t('planning.calendarTitle')}</h1>
          </div>
          {canManage && createEquipes.length > 0 && (
            <Button onClick={() => setShowCreate(true)} size="sm">
              <Plus size={14} /><span className="hidden sm:inline">{t('planning.add')}</span>
            </Button>
          )}
        </div>

        <div className="flex gap-2 flex-wrap mb-4 overflow-x-auto pb-1">
          {isCoachLike && <FilterChip active={filterMode === 'mine'} onClick={() => setFilterMode('mine')} label={t('planning.myTeams')} />}
          <FilterChip active={filterMode === 'all'} onClick={() => setFilterMode('all')} label={t('planning.allTeams')} />
          {filterEquipes.map((eq) => (
            <FilterChip key={eq.id} active={filterMode === eq.id} onClick={() => setFilterMode(eq.id)} label={teamLabel(eq)} />
          ))}
        </div>

        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => setWeekStart((d) => addDays(d, -daysCount))} className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-slate-400 hover:text-slate-200 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-slate-300 flex-1 text-center">{windowLabel}</span>
          <button onClick={() => setWeekStart((d) => addDays(d, daysCount))} className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-slate-400 hover:text-slate-200 transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-500 text-sm">{t('planning.loading')}</div>
        ) : daysCount === 7 ? (
          // Mobile : vue verticale (jours empilés)
          <div className="space-y-1.5">
            {days.map((day) => {
              const key = day.toDateString();
              const dayEvents = eventsByDay.get(key) ?? [];
              const isToday = isSameDay(day, today);
              const isPastDay = day < new Date(today.toDateString());
              const dayIndex = (day.getDay() + 6) % 7;
              return (
                <div
                  key={key}
                  className={`flex gap-3 rounded-xl border px-3 py-2.5 ${
                    isToday ? 'border-violet-500/50 bg-violet-500/8'
                    : isPastDay ? 'border-slate-700/20 bg-slate-800/20 opacity-70'
                    : 'border-slate-700/30 bg-slate-800/30'
                  }`}
                >
                  <div className="w-10 flex-shrink-0 text-center pt-0.5">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">{DAY_LABELS_FR[dayIndex]}</p>
                    <p className={`text-xl font-extrabold leading-none mt-0.5 ${isToday ? 'text-violet-400' : isPastDay ? 'text-slate-600' : 'text-slate-300'}`}>
                      {day.getDate()}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0 space-y-1 py-0.5">
                    {dayEvents.map((ev) => {
                      const evStatut = getStatut(ev);
                      const isMatch = ev.type === 'MATCH';
                      return (
                        <button
                          key={ev.id}
                          onClick={() => openDetail(ev)}
                          className={`w-full text-left flex items-center gap-2 rounded-lg px-2.5 py-1.5 transition-opacity hover:opacity-80 ${
                            ev.annule ? 'bg-red-500/10 opacity-60'
                            : evStatut === 'EN_COURS' ? (isMatch ? 'bg-violet-500/25' : 'bg-emerald-500/20')
                            : isMatch ? 'bg-violet-500/10' : 'bg-emerald-500/8'
                          }`}
                        >
                          <span className={`text-[9px] font-bold w-4 flex-shrink-0 ${ev.annule ? 'text-red-400/60' : isMatch ? 'text-violet-400' : 'text-emerald-400'}`}>
                            {isMatch ? 'M' : 'E'}
                          </span>
                          <span className={`text-xs truncate ${ev.annule ? 'text-slate-500 line-through' : isMatch ? 'text-violet-200' : 'text-emerald-300'}`}>
                            {new Date(ev.dateHeure).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            {ev.equipe && ` · ${ev.equipe.nomEquipe}`}
                            {isMatch && ev.adversaire && ` vs ${ev.adversaire}`}
                          </span>
                        </button>
                      );
                    })}
                    {canManage && !isPastDay && createEquipes.length > 0 && (
                      <button
                        onClick={() => {
                          const d = new Date(day); d.setHours(10, 0, 0, 0);
                          setForm((f) => ({ ...f, dateHeure: toDatetimeLocal(d.toISOString()) }));
                          setShowCreate(true);
                        }}
                        className="text-[10px] text-slate-600 hover:text-violet-400 transition-colors py-0.5"
                      >
                        + {t('planning.add')}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Desktop : grille 7 colonnes
          <>
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DAY_LABELS_FR.map((d, i) => (
                <div key={i} className="text-center py-1">
                  <span className="hidden sm:inline text-xs font-bold text-slate-500">{d}</span>
                  <span className="sm:hidden text-[10px] font-bold text-slate-500">{DAY_LETTERS_FR[i]}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {days.map((day) => {
                const key = day.toDateString();
                const dayEvents = eventsByDay.get(key) ?? [];
                const isToday = isSameDay(day, today);
                const isPastDay = day < new Date(today.toDateString());
                const isOutsideWindow = day >= windowEnd;
                if (isOutsideWindow) return null;
                return (
                  <div
                    key={key}
                    onClick={() => {
                      if (canManage && !isPastDay && createEquipes.length > 0) {
                        const d = new Date(day); d.setHours(10, 0, 0, 0);
                        setForm((f) => ({ ...f, dateHeure: toDatetimeLocal(d.toISOString()) }));
                        setShowCreate(true);
                      }
                    }}
                    className={`min-h-[72px] sm:min-h-[90px] md:min-h-[100px] rounded-xl p-1 sm:p-1.5 border cursor-pointer transition-colors ${
                      isToday ? 'border-violet-500/50 bg-violet-500/8'
                      : isPastDay ? 'border-slate-700/20 bg-slate-800/20 cursor-default opacity-70'
                      : 'border-slate-700/30 bg-slate-800/30 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className={`text-[11px] sm:text-xs font-bold mb-1 ${isToday ? 'text-violet-400' : isPastDay ? 'text-slate-600' : 'text-slate-400'}`}>
                      {day.getDate()}
                    </div>
                    {dayEvents.slice(0, 3).map((ev) => {
                      const evStatut = getStatut(ev);
                      const isMatch = ev.type === 'MATCH';
                      return (
                        <button
                          key={ev.id}
                          onClick={(e) => { e.stopPropagation(); openDetail(ev); }}
                          className={`w-full text-left mb-0.5 px-1 py-0.5 rounded-md truncate transition-opacity hover:opacity-80 ${
                            ev.annule ? 'bg-red-500/10 text-red-400/60'
                            : evStatut === 'EN_COURS' ? (isMatch ? 'bg-violet-500/30 text-violet-200' : 'bg-emerald-500/25 text-emerald-200')
                            : isMatch ? 'bg-violet-500/15 text-violet-300' : 'bg-emerald-500/10 text-emerald-400'
                          }`}
                        >
                          <span className="hidden md:inline text-[10px] font-semibold">
                            {new Date(ev.dateHeure).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}{' '}
                          </span>
                          <span className="text-[9px] sm:text-[10px] font-bold">{isMatch ? 'M' : 'E'}</span>
                          <span className="hidden lg:inline text-[10px]"> {ev.equipe?.nomEquipe}</span>
                        </button>
                      );
                    })}
                    {dayEvents.length > 3 && <p className="text-[9px] text-slate-500 pl-1">+{dayEvents.length - 3}</p>}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-700/30">
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-violet-500/20 inline-block" /><span className="text-[10px] text-slate-500">{t('planning.match')}</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500/15 inline-block" /><span className="text-[10px] text-slate-500">{t('planning.training')}</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-violet-500/8 border border-violet-500/50 inline-block" /><span className="text-[10px] text-slate-500">{t('planning.statusEnCours')}</span></div>
            </div>
          </>
        )}
      </div>

      {/* Modal création */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title={t('planning.newEvent')}>
        <Select label={t('planning.type')} value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as 'MATCH' | 'ENTRAINEMENT' }))}>
          <option value="ENTRAINEMENT">{t('planning.training')}</option>
          <option value="MATCH">{t('planning.match')}</option>
        </Select>
        <Select
          label={form.type === 'MATCH' ? t('planning.homeTeam') : t('planning.team')}
          value={form.equipeId}
          onChange={(e) => setForm((f) => ({ ...f, equipeId: e.target.value }))}
        >
          {createEquipes.map((eq) => <option key={eq.id} value={eq.id}>{teamLabel(eq)}</option>)}
        </Select>
        {form.type === 'MATCH' && (
          <Input
            label={t('planning.adversaire')}
            placeholder={t('planning.adversairePlaceholder')}
            value={form.adversaire}
            onChange={(e) => setForm((f) => ({ ...f, adversaire: e.target.value }))}
          />
        )}
        <Input label={t('planning.dateTime')} type="datetime-local" value={form.dateHeure} min={nowDatetimeLocal()} onChange={(e) => setForm((f) => ({ ...f, dateHeure: e.target.value }))} />
        <Select label={t('planning.duration')} value={String(form.duree)} onChange={(e) => setForm((f) => ({ ...f, duree: Number(e.target.value) }))}>
          {DUREE_OPTIONS.map((m) => <option key={m} value={m}>{formatDuree(m)}</option>)}
        </Select>
        <PlacesInput
          locale={locale} label={t('planning.location')}
          placeholder={locale === 'fr' ? t('planning.locationSearch') : t('planning.locationPlaceholder')}
          value={form.lieu}
          onChange={(val) => setForm((f) => ({ ...f, lieu: val, latitude: undefined, longitude: undefined }))}
          onPlaceSelect={({ address, lat, lng }) => setForm((f) => ({ ...f, lieu: address, latitude: lat, longitude: lng }))}
        />
        <Input label={t('planning.description')} placeholder={t('planning.descriptionPlaceholder')} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        {createError && <p className="text-xs text-red-400 mb-3">{createError}</p>}
        <div className="flex gap-3 mt-2">
          <Button variant="secondary" full onClick={() => setShowCreate(false)}>{t('planning.cancel')}</Button>
          <Button full onClick={handleCreate} loading={saving}>{t('planning.create')}</Button>
        </div>
      </Modal>

      {/* Modal détail */}
      {selected && (
        <Modal
          open={!!selected}
          onClose={() => { setSelected(null); setEditMode(false); setScoreEdit(false); }}
          title={editMode ? t('planning.editEvent') : (selected.type === 'MATCH' ? t('planning.match') : t('planning.training'))}
          size="lg"
        >
          {editMode ? (
            <div>
              <Input label={t('planning.dateTime')} type="datetime-local" value={editForm.dateHeure} min={nowDatetimeLocal()} onChange={(e) => setEditForm((f) => ({ ...f, dateHeure: e.target.value }))} />
              <Select label={t('planning.duration')} value={String(editForm.duree)} onChange={(e) => setEditForm((f) => ({ ...f, duree: Number(e.target.value) }))}>
                {DUREE_OPTIONS.map((m) => <option key={m} value={m}>{formatDuree(m)}</option>)}
              </Select>
              <PlacesInput
                locale={locale} label={t('planning.location')}
                placeholder={locale === 'fr' ? t('planning.locationSearch') : t('planning.locationPlaceholder')}
                value={editForm.lieu}
                onChange={(val) => setEditForm((f) => ({ ...f, lieu: val, latitude: undefined, longitude: undefined }))}
                onPlaceSelect={({ address, lat, lng }) => setEditForm((f) => ({ ...f, lieu: address, latitude: lat, longitude: lng }))}
              />
              <Input label={t('planning.description')} placeholder={t('planning.descriptionPlaceholder')} value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} />
              {editError && <p className="text-xs text-red-400 mb-3">{editError}</p>}
              <div className="flex gap-3 mt-2">
                <Button variant="secondary" full onClick={() => setEditMode(false)}>{t('common.cancel')}</Button>
                <Button full onClick={handleUpdate} loading={editSaving}>{t('common.save')}</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={selected.type === 'MATCH' ? 'violet' : 'green'}>
                  {selected.type === 'MATCH' ? t('planning.match') : t('planning.training')}
                </Badge>
                <StatutBadge statut={selectedStatut!} t={t} />
                {selected.equipe && (
                  <span className="text-xs text-slate-400 font-medium">
                    {selected.equipe.nomEquipe}{selected.equipe.categorie?.nom && <span className="text-slate-500"> · {selected.equipe.categorie.nom}</span>}
                  </span>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Calendar size={15} className="text-slate-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-slate-200">{formatDate(selected.dateHeure, locale)}</p>
                    <p className="text-xs text-slate-500">{formatDuree(selected.duree ?? 120)}</p>
                  </div>
                </div>
                {selected.type === 'MATCH' && selected.adversaire && (
                  <div className="flex items-center gap-3">
                    <Trophy size={15} className="text-slate-500 flex-shrink-0" />
                    <span className="text-sm text-slate-300">vs <span className="font-semibold text-slate-200">{selected.adversaire}</span></span>
                  </div>
                )}
                {selected.lieu && (
                  <div className="flex items-start gap-3">
                    <MapPin size={15} className="text-slate-500 flex-shrink-0 mt-0.5" />
                    <a href={mapsLink(selected.lieu)} target="_blank" rel="noopener noreferrer" className="text-sm text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors">
                      {selected.lieu}<ExternalLink size={11} />
                    </a>
                  </div>
                )}
                {selected.description && <p className="text-sm text-slate-400 leading-relaxed pl-6">{selected.description}</p>}
              </div>
              {selected.latitude != null && selected.longitude != null && selected.lieu && (
                <div>
                  <iframe title={selected.lieu} src={osmEmbed(selected.latitude, selected.longitude)} className="w-full h-44 rounded-xl border-0" loading="lazy" />
                  <a href={mapsLink(selected.lieu)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 mt-1.5 transition-colors">
                    <ExternalLink size={11} />{t('planning.viewOnMaps')}
                  </a>
                </div>
              )}
              {selected.type === 'MATCH' && (
                <div className="pt-4 border-t border-slate-700/40">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Trophy size={14} className="text-violet-400" />
                      <h3 className="text-sm font-semibold text-slate-300">{t('planning.score')}</h3>
                    </div>
                    {selectedCanEdit && !scoreEdit && (
                      <Button size="sm" variant="secondary" onClick={() => { setScoreDom(selected.scoreDom ?? 0); setScoreExt(selected.scoreExt ?? 0); setScoreEdit(true); }}>
                        <Pencil size={12} />{t('planning.editScore')}
                      </Button>
                    )}
                  </div>
                  {scoreEdit ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-4 justify-center">
                        <input type="number" min={0} value={scoreDom} onChange={(e) => setScoreDom(Math.max(0, Number(e.target.value)))} className="w-16 text-center text-xl font-bold bg-slate-700/60 border border-slate-600/40 rounded-xl px-2 py-2 text-slate-100 focus:outline-none focus:ring-1 focus:ring-violet-500" />
                        <span className="text-slate-500 text-lg font-bold">—</span>
                        <input type="number" min={0} value={scoreExt} onChange={(e) => setScoreExt(Math.max(0, Number(e.target.value)))} className="w-16 text-center text-xl font-bold bg-slate-700/60 border border-slate-600/40 rounded-xl px-2 py-2 text-slate-100 focus:outline-none focus:ring-1 focus:ring-violet-500" />
                      </div>
                      {scoreError && <p className="text-xs text-red-400 text-center">{scoreError}</p>}
                      <div className="flex gap-3">
                        <Button variant="secondary" full size="sm" onClick={() => setScoreEdit(false)}>{t('common.cancel')}</Button>
                        <Button full size="sm" onClick={handleSaveScore} loading={scoreSaving}>{t('common.save')}</Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-2xl font-extrabold text-slate-100 text-center py-1">
                      {selected.scoreDom !== null && selected.scoreDom !== undefined
                        ? `${selected.scoreDom} — ${selected.scoreExt}`
                        : <span className="text-sm text-slate-500 font-normal">{t('planning.scoreNotSet')}</span>}
                    </p>
                  )}
                </div>
              )}
              {(selectedStatut === 'EN_COURS' || selectedStatut === 'TERMINE') && (
                <div className="pt-4 border-t border-slate-700/40">
                  <div className="flex items-center gap-2 mb-3">
                    <ClipboardList size={14} className="text-violet-400" />
                    <h3 className="text-sm font-semibold text-slate-300">{t('planning.attendance')}</h3>
                    {!canEditAppel && <span className="text-xs text-slate-600 italic ml-1">— {t('planning.notYourTeam')}</span>}
                  </div>
                  <AttendancePanel ev={selected} canEdit={canEditAppel} statut={selectedStatut} t={t} />
                </div>
              )}
              {canManage && (
                <div className="flex items-center gap-2 pt-4 border-t border-slate-700/40">
                  {selectedEditable && selectedCanEdit ? (
                    <>
                      <Button size="sm" variant="secondary" onClick={openEdit}><Pencil size={13} />{t('planning.editEvent')}</Button>
                      {!selected.annule && <Button size="sm" variant="secondary" onClick={confirmCancel}><Ban size={13} />{t('planning.cancelEvent')}</Button>}
                      <div className="ml-auto">
                        <Button size="sm" variant="danger" onClick={confirmDelete}><Trash2 size={13} />{t('common.delete')}</Button>
                      </div>
                    </>
                  ) : !selectedCanEdit && canManage ? (
                    <p className="text-xs text-slate-500 italic">{t('planning.notYourTeam')}</p>
                  ) : (
                    <p className="text-xs text-slate-500 italic">{t('planning.pastEventHint')}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </Modal>
      )}

      <Dialog open={!!dialog} title={dialog?.title} message={dialog?.message ?? ''} variant={dialog?.variant} confirmLabel={dialog?.confirmLabel} onConfirm={dialog?.onConfirm} onClose={() => setDialog(null)} />
    </AppLayout>
  );
}
