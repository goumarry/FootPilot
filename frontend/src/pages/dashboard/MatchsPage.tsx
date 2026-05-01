import { useState, useEffect } from 'react';
import { Calendar, MapPin, ExternalLink, Shield } from 'lucide-react';
import { getEvenements } from '@/api/evenements';
import type { Evenement } from '@/types';
import { useI18n } from '@/contexts/I18nContext';
import AppLayout from '@/layouts/AppLayout';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import { getStatut, formatDate, formatDuree, mapsLink, osmEmbed } from '@/lib/planning';

export default function MatchsPage() {
  const { locale, t } = useI18n();
  const [evenements, setEvenements] = useState<Evenement[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [selected, setSelected] = useState<Evenement | null>(null);

  useEffect(() => {
    getEvenements({ type: 'MATCH' }).then(setEvenements).finally(() => setLoading(false));
  }, []);

  const now = Date.now();
  const upcoming = evenements.filter((e) => new Date(e.dateHeure).getTime() + (e.duree ?? 120) * 60000 > now);
  const past = evenements.filter((e) => new Date(e.dateHeure).getTime() + (e.duree ?? 120) * 60000 <= now);
  const displayed = tab === 'upcoming' ? upcoming : [...past].reverse();

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-3xl">
        <div className="mb-5">
          <p className="text-xs text-violet-400 font-semibold uppercase tracking-wider mb-0.5">{t('planning.subtitle')}</p>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-50">{t('planning.matchsTitle')}</h1>
        </div>

        <div className="flex gap-1 bg-slate-800/60 rounded-xl p-1 mb-5 w-fit">
          {(['upcoming', 'past'] as const).map((tab_) => (
            <button
              key={tab_}
              onClick={() => setTab(tab_)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === tab_ ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              {tab_ === 'upcoming' ? `${t('planning.upcoming')} (${upcoming.length})` : `${t('planning.past')} (${past.length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-500 text-sm">{t('planning.loading')}</div>
        ) : displayed.length === 0 ? (
          <EmptyState icon={<Shield size={22} />} title={tab === 'upcoming' ? t('planning.noUpcoming') : t('planning.noPast')} />
        ) : (
          <div className="space-y-2">
            {displayed.map((ev) => {
              const statut = getStatut(ev);
              return (
                <button
                  key={ev.id}
                  onClick={() => setSelected(ev)}
                  className="w-full text-left bg-slate-800/50 border border-slate-700/40 rounded-xl px-4 py-3.5 hover:border-slate-600/60 hover:bg-slate-800/70 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-violet-500/10">
                      <Shield size={16} className="text-violet-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <Badge variant="violet">{t('planning.match')}</Badge>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${
                          statut === 'EN_COURS' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' :
                          statut === 'TERMINE' ? 'bg-slate-800/60 text-slate-500 border-slate-700/30' :
                          statut === 'ANNULE' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                          'bg-slate-700/60 text-slate-400 border-slate-600/40'
                        }`}>
                          {statut === 'EN_COURS' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                          {statut === 'EN_COURS' ? t('planning.statusEnCours') : statut === 'TERMINE' ? t('planning.statusTermine') : statut === 'ANNULE' ? t('planning.statusAnnule') : t('planning.statusAvenir')}
                        </span>
                        {ev.equipe && <span className="text-xs text-slate-500">{ev.equipe.nomEquipe}</span>}
                      </div>
                      <p className="text-sm font-semibold text-slate-200">{formatDate(ev.dateHeure, locale)}</p>
                      {ev.lieu && <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 truncate"><MapPin size={10} className="flex-shrink-0" />{ev.lieu}</p>}
                    </div>
                    {ev.scoreDom !== null && ev.scoreDom !== undefined && (
                      <span className="text-sm font-bold text-slate-300 flex-shrink-0">{ev.scoreDom} — {ev.scoreExt}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selected && (
        <Modal open={!!selected} onClose={() => setSelected(null)} title={t('planning.match')} size="lg">
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="violet">{t('planning.match')}</Badge>
              {selected.equipe && <span className="text-xs text-slate-400">{selected.equipe.nomEquipe}</span>}
            </div>
            <div className="flex items-start gap-3">
              <Calendar size={15} className="text-slate-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-slate-200">{formatDate(selected.dateHeure, locale)}</p>
                <p className="text-xs text-slate-500">{formatDuree(selected.duree ?? 120)}</p>
              </div>
            </div>
            {selected.lieu && (
              <div className="flex items-start gap-3">
                <MapPin size={15} className="text-slate-500 flex-shrink-0 mt-0.5" />
                <a href={mapsLink(selected.lieu)} target="_blank" rel="noopener noreferrer" className="text-sm text-violet-400 hover:text-violet-300 flex items-center gap-1">
                  {selected.lieu}<ExternalLink size={11} />
                </a>
              </div>
            )}
            {selected.description && <p className="text-sm text-slate-400 pl-6">{selected.description}</p>}
            {selected.adversaire && (
              <p className="text-sm text-slate-400 pl-6">vs <span className="font-semibold text-slate-300">{selected.adversaire}</span></p>
            )}
            {selected.scoreDom !== null && selected.scoreDom !== undefined && (
              <div className="flex items-center gap-3 pt-3 border-t border-slate-700/40">
                <Shield size={14} className="text-violet-400" />
                <span className="text-2xl font-extrabold text-slate-100">{selected.scoreDom} — {selected.scoreExt}</span>
                <Badge variant={selected.scoreDom! > selected.scoreExt! ? 'green' : selected.scoreDom! < selected.scoreExt! ? 'red' : 'yellow'}>
                  {selected.scoreDom! > selected.scoreExt! ? t('planning.victory') : selected.scoreDom! < selected.scoreExt! ? t('planning.defeat') : t('planning.draw')}
                </Badge>
              </div>
            )}
            {selected.latitude != null && selected.longitude != null && selected.lieu && (
              <div>
                <iframe title={selected.lieu} src={osmEmbed(selected.latitude, selected.longitude)} className="w-full h-44 rounded-xl border-0" loading="lazy" />
                <a href={mapsLink(selected.lieu)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-violet-400 mt-1.5">
                  <ExternalLink size={11} />{t('planning.viewOnMaps')}
                </a>
              </div>
            )}
          </div>
        </Modal>
      )}
    </AppLayout>
  );
}
