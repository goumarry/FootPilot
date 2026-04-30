import { useState, useEffect, useCallback } from 'react';
import { Calendar, Plus, Trash2, MapPin, ExternalLink } from 'lucide-react';
import { getEvenements, createEvenement, deleteEvenement } from '@/api/evenements';
import { getEquipes } from '@/api/equipes';
import type { Evenement, Equipe } from '@/types';
import { useI18n } from '@/contexts/I18nContext';
import AppLayout from '@/layouts/AppLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import Badge from '@/components/ui/Badge';
import PlacesInput from '@/components/ui/PlacesInput';

function formatDate(d: string, locale: string) {
  return new Date(d).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function mapsLink(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function osmEmbed(lat: number, lng: number) {
  const delta = 0.008;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - delta},${lat - delta},${lng + delta},${lat + delta}&layer=mapnik&marker=${lat},${lng}`;
}

export default function PlanningPage() {
  const { locale, t } = useI18n();
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
      setError(t('planning.errorRequired'));
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
          t('planning.errorCreate')
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t('planning.deleteConfirm'))) return;
    await deleteEvenement(id);
    setEvenements((prev) => prev.filter((e) => e.id !== id));
  }

  const filtered = evenements.filter((e) => !filter || e.equipeId === filter);
  const upcoming = filtered.filter((e) => new Date(e.dateHeure) >= new Date());
  const past = filtered.filter((e) => new Date(e.dateHeure) < new Date());

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs text-violet-400 font-semibold uppercase tracking-wider mb-1">
              {t('planning.subtitle')}
            </p>
            <h1 className="text-2xl font-extrabold text-slate-50">{t('planning.title')}</h1>
          </div>
          <Button onClick={() => setShowModal(true)}>
            <Plus size={15} />
            <span>{t('planning.add')}</span>
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
              {t('planning.allTeams')}
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
          <div className="text-center py-16 text-slate-500 text-sm">{t('planning.loading')}</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Calendar size={22} />}
            title={t('planning.noEvents')}
            description={t('planning.noEventsDesc')}
            action={
              <Button onClick={() => setShowModal(true)} variant="secondary">
                <Plus size={15} /> {t('planning.createEvent')}
              </Button>
            }
          />
        ) : (
          <div className="space-y-6">
            {upcoming.length > 0 && (
              <div>
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  {t('planning.upcoming')}
                </h2>
                <div className="space-y-2">
                  {upcoming.map((ev) => (
                    <EventCard key={ev.id} ev={ev} onDelete={handleDelete} locale={locale} />
                  ))}
                </div>
              </div>
            )}
            {past.length > 0 && (
              <div>
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  {t('planning.past')}
                </h2>
                <div className="space-y-2 opacity-60">
                  {[...past].reverse().slice(0, 5).map((ev) => (
                    <EventCard key={ev.id} ev={ev} onDelete={handleDelete} locale={locale} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={t('planning.newEvent')}>
        <Select
          label={t('planning.type')}
          value={form.type}
          onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as 'MATCH' | 'ENTRAINEMENT' }))}
        >
          <option value="ENTRAINEMENT">{t('planning.training')}</option>
          <option value="MATCH">{t('planning.match')}</option>
        </Select>
        <Select
          label={form.type === 'MATCH' ? t('planning.homeTeam') : t('planning.team')}
          value={form.equipeId}
          onChange={(e) => setForm((f) => ({ ...f, equipeId: e.target.value }))}
        >
          {equipes.map((eq) => (
            <option key={eq.id} value={eq.id}>{eq.nomEquipe}</option>
          ))}
        </Select>
        {form.type === 'MATCH' && (
          <Select
            label={t('planning.awayTeam')}
            value={form.equipeExtId}
            onChange={(e) => setForm((f) => ({ ...f, equipeExtId: e.target.value }))}
          >
            {equipes.map((eq) => (
              <option key={eq.id} value={eq.id}>{eq.nomEquipe}</option>
            ))}
          </Select>
        )}
        <Input
          label={t('planning.dateTime')}
          type="datetime-local"
          value={form.dateHeure}
          onChange={(e) => setForm((f) => ({ ...f, dateHeure: e.target.value }))}
        />
        <PlacesInput
          locale={locale}
          label={t('planning.location')}
          placeholder={locale === 'fr' ? t('planning.locationSearch') : t('planning.locationPlaceholder')}
          value={form.lieu}
          onChange={(val) => setForm((f) => ({ ...f, lieu: val, latitude: undefined, longitude: undefined }))}
          onPlaceSelect={({ address, lat, lng }) =>
            setForm((f) => ({ ...f, lieu: address, latitude: lat, longitude: lng }))
          }
        />
        <Input
          label={t('planning.description')}
          placeholder={t('planning.descriptionPlaceholder')}
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
        {error && <p className="text-xs text-red-500 dark:text-red-400 mb-3">{error}</p>}
        <div className="flex gap-3 mt-2">
          <Button variant="secondary" full onClick={() => setShowModal(false)}>{t('planning.cancel')}</Button>
          <Button full onClick={handleCreate} loading={saving}>{t('planning.create')}</Button>
        </div>
      </Modal>
    </AppLayout>
  );
}

function EventCard({
  ev,
  onDelete,
  locale,
}: {
  ev: Evenement;
  onDelete: (id: string) => void;
  locale: string;
}) {
  const { t } = useI18n();
  const isMatch = ev.type === 'MATCH';
  const hasCoords = ev.latitude != null && ev.longitude != null;

  return (
    <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl px-4 py-3.5">
      <div className="flex items-center gap-4">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isMatch ? 'bg-violet-500/10' : 'bg-emerald-500/10'}`}>
          <Calendar size={16} className={isMatch ? 'text-violet-400' : 'text-emerald-400'} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <Badge variant={isMatch ? 'violet' : 'green'}>
              {isMatch ? t('planning.match') : t('planning.training')}
            </Badge>
            {ev.equipe && (
              <span className="text-xs text-slate-500">{ev.equipe.nomEquipe}</span>
            )}
          </div>
          <p className="text-sm font-semibold text-slate-200">{formatDate(ev.dateHeure, locale)}</p>
          {ev.lieu && (
            <a
              href={mapsLink(ev.lieu)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 mt-0.5 transition-colors"
            >
              <MapPin size={11} />
              {ev.lieu}
              <ExternalLink size={10} />
            </a>
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

      {locale === 'fr' && ev.lieu && hasCoords && (
        <div className="mt-3">
          <iframe
            title={ev.lieu}
            src={osmEmbed(ev.latitude!, ev.longitude!)}
            className="w-full h-44 rounded-xl border-0"
            loading="lazy"
          />
          <a
            href={mapsLink(ev.lieu)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 mt-1.5 transition-colors"
          >
            <ExternalLink size={11} />
            {t('planning.viewOnMaps')}
          </a>
        </div>
      )}
    </div>
  );
}
