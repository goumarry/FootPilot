import { useState, useEffect, useCallback } from 'react';
import { Calendar, Plus, Trash2, MapPin } from 'lucide-react';
import { getEvenements, createEvenement, deleteEvenement } from '@/api/evenements';
import { getEquipes } from '@/api/equipes';
import type { Evenement, Equipe } from '@/types';
import AppLayout from '@/layouts/AppLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import Badge from '@/components/ui/Badge';
import PlacesInput from '@/components/ui/PlacesInput';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export default function PlanningPage() {
  const [evenements, setEvenements] = useState<Evenement[]>([]);
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');

  const [form, setForm] = useState({
    type: 'ENTRAINEMENT' as 'MATCH' | 'ENTRAINEMENT',
    equipeId: '',
    equipeExtId: '',
    dateHeure: '',
    lieu: '',
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
    description: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    const [ev, eq] = await Promise.all([getEvenements(), getEquipes()]);
    setEvenements(ev);
    setEquipes(eq);
    if (eq.length > 0 && !form.equipeId) {
      setForm((f) => ({ ...f, equipeId: eq[0].id, equipeExtId: eq[0].id }));
    }
    setLoading(false);
  }, []); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  async function handleCreate() {
    if (!form.equipeId || !form.dateHeure) {
      setError('Équipe et date/heure sont requis.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload: Record<string, unknown> = {
        type: form.type,
        equipeId: form.equipeId,
        dateHeure: form.dateHeure,
        lieu: form.lieu || undefined,
        latitude: form.latitude,
        longitude: form.longitude,
        description: form.description || undefined,
      };
      if (form.type === 'MATCH') {
        payload.equipesDomId = form.equipeId;
        payload.equipesExtId = form.equipeExtId;
      }
      const ev = await createEvenement(payload);
      setEvenements((prev) => [...prev, ev as Evenement].sort(
        (a, b) => new Date(a.dateHeure).getTime() - new Date(b.dateHeure).getTime()
      ));
      setShowModal(false);
      setForm((f) => ({ ...f, dateHeure: '', lieu: '', latitude: undefined, longitude: undefined, description: '' }));
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Erreur lors de la création.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cet événement ?')) return;
    await deleteEvenement(id);
    setEvenements((prev) => prev.filter((e) => e.id !== id));
  }

  const filtered = evenements.filter((e) => {
    if (filter && e.equipeId !== filter) return false;
    return true;
  });

  const upcoming = filtered.filter((e) => new Date(e.dateHeure) >= new Date());
  const past = filtered.filter((e) => new Date(e.dateHeure) < new Date());

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs text-violet-400 font-semibold uppercase tracking-wider mb-1">Planning</p>
            <h1 className="text-2xl font-extrabold text-slate-50">Calendrier</h1>
          </div>
          <Button onClick={() => setShowModal(true)}>
            <Plus size={15} />
            <span>Ajouter</span>
          </Button>
        </div>

        {equipes.length > 1 && (
          <div className="flex gap-2 flex-wrap mb-6">
            <button
              onClick={() => setFilter('')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                !filter ? 'bg-violet-600 text-white' : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              Toutes les équipes
            </button>
            {equipes.map((eq) => (
              <button
                key={eq.id}
                onClick={() => setFilter(eq.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filter === eq.id ? 'bg-violet-600 text-white' : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                {eq.nomEquipe}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 text-slate-500 text-sm">Chargement…</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Calendar size={22} />}
            title="Aucun événement"
            description="Créez des matchs ou entraînements pour votre club."
            action={
              <Button onClick={() => setShowModal(true)} variant="secondary">
                <Plus size={15} /> Créer un événement
              </Button>
            }
          />
        ) : (
          <div className="space-y-6">
            {upcoming.length > 0 && (
              <div>
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">À venir</h2>
                <div className="space-y-2">
                  {upcoming.map((ev) => (
                    <EventCard key={ev.id} ev={ev} onDelete={handleDelete} />
                  ))}
                </div>
              </div>
            )}
            {past.length > 0 && (
              <div>
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Passés</h2>
                <div className="space-y-2 opacity-60">
                  {[...past].reverse().slice(0, 5).map((ev) => (
                    <EventCard key={ev.id} ev={ev} onDelete={handleDelete} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nouvel événement">
        <Select
          label="Type"
          value={form.type}
          onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as 'MATCH' | 'ENTRAINEMENT' }))}
        >
          <option value="ENTRAINEMENT">Entraînement</option>
          <option value="MATCH">Match</option>
        </Select>
        <Select
          label={form.type === 'MATCH' ? 'Équipe domicile' : 'Équipe'}
          value={form.equipeId}
          onChange={(e) => setForm((f) => ({ ...f, equipeId: e.target.value }))}
        >
          {equipes.map((eq) => (
            <option key={eq.id} value={eq.id}>{eq.nomEquipe}</option>
          ))}
        </Select>
        {form.type === 'MATCH' && (
          <Select
            label="Équipe extérieure"
            value={form.equipeExtId}
            onChange={(e) => setForm((f) => ({ ...f, equipeExtId: e.target.value }))}
          >
            {equipes.map((eq) => (
              <option key={eq.id} value={eq.id}>{eq.nomEquipe}</option>
            ))}
          </Select>
        )}
        <Input
          label="Date et heure"
          type="datetime-local"
          value={form.dateHeure}
          onChange={(e) => setForm((f) => ({ ...f, dateHeure: e.target.value }))}
        />
        <PlacesInput
          label="Lieu (optionnel)"
          placeholder="Stade municipal, terrain annexe…"
          value={form.lieu}
          onChange={(val) => setForm((f) => ({ ...f, lieu: val, latitude: undefined, longitude: undefined }))}
          onPlaceSelect={({ address, lat, lng }) =>
            setForm((f) => ({ ...f, lieu: address, latitude: lat, longitude: lng }))
          }
        />
        <Input
          label="Description (optionnel)"
          placeholder="Informations complémentaires…"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
        {error && <p className="text-xs text-red-500 dark:text-red-400 mb-3">{error}</p>}
        <div className="flex gap-3 mt-2">
          <Button variant="secondary" full onClick={() => setShowModal(false)}>Annuler</Button>
          <Button full onClick={handleCreate} loading={saving}>Créer</Button>
        </div>
      </Modal>
    </AppLayout>
  );
}

function EventCard({ ev, onDelete }: { ev: Evenement; onDelete: (id: string) => void }) {
  const isMatch = ev.type === 'MATCH';
  return (
    <div className="flex items-center gap-4 bg-slate-800/50 border border-slate-700/40 rounded-xl px-4 py-3.5">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isMatch ? 'bg-violet-500/10' : 'bg-emerald-500/10'}`}>
        <Calendar size={16} className={isMatch ? 'text-violet-400' : 'text-emerald-400'} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <Badge variant={isMatch ? 'violet' : 'green'}>
            {isMatch ? 'Match' : 'Entraînement'}
          </Badge>
          {ev.equipe && (
            <span className="text-xs text-slate-500">{ev.equipe.nomEquipe}</span>
          )}
        </div>
        <p className="text-sm font-semibold text-slate-200">{formatDate(ev.dateHeure)}</p>
        {ev.lieu && (
          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
            <MapPin size={11} />
            {ev.lieu}
          </p>
        )}
      </div>
      {isMatch && ev.match && (
        <div className="text-xs font-bold text-slate-300 mr-2">
          {ev.match.scoreDom !== null ? `${ev.match.scoreDom} - ${ev.match.scoreExt}` : 'vs'}
        </div>
      )}
      <button
        onClick={() => onDelete(ev.id)}
        className="text-slate-500 hover:text-red-400 transition-colors p-1"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}
