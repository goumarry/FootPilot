import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar, MapPin, ExternalLink, Shield } from 'lucide-react';
import { getEvenements } from '@/api/evenements';
import type { Evenement, StatutEvenement } from '@/types';
import { useI18n } from '@/contexts/I18nContext';
import AppLayout from '@/layouts/AppLayout';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import {
  getStatut, formatDate, formatDuree, mapsLink, osmEmbed,
  startOfWeek, addDays, isSameDay, DAY_LABELS_FR, DAY_LETTERS_FR,
} from '@/lib/planning';

function StatutDot({ statut }: { statut: StatutEvenement }) {
  const cls: Record<StatutEvenement, string> = {
    AVENIR:   'bg-slate-500',
    EN_COURS: 'bg-emerald-400 animate-pulse',
    TERMINE:  'bg-slate-700',
    ANNULE:   'bg-red-500/60',
  };
  return <span className={`w-1.5 h-1.5 rounded-full inline-block ${cls[statut]}`} />;
}

export default function PlanningPage() {
  const { locale, t } = useI18n();
  const [evenements, setEvenements] = useState<Evenement[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [selected, setSelected] = useState<Evenement | null>(null);

  useEffect(() => {
    getEvenements().then(setEvenements).finally(() => setLoading(false));
  }, []);

  const days = useMemo(() => Array.from({ length: 28 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, Evenement[]>();
    for (const ev of evenements) {
      const key = new Date(ev.dateHeure).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    return map;
  }, [evenements]);

  const today = new Date();

  const windowLabel = (() => {
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
    const loc = locale === 'fr' ? 'fr-FR' : 'en-GB';
    return `${weekStart.toLocaleDateString(loc, opts)} — ${addDays(weekStart, 27).toLocaleDateString(loc, { ...opts, year: 'numeric' })}`;
  })();

  return (
    <AppLayout>
      <div className="p-4 md:p-6">
        <div className="mb-4">
          <p className="text-xs text-violet-400 font-semibold uppercase tracking-wider mb-0.5">{t('planning.subtitle')}</p>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-50">{t('planning.myCalendar')}</h1>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => setWeekStart((d) => addDays(d, -28))}
            className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-slate-300 flex-1 text-center">{windowLabel}</span>
          <button
            onClick={() => setWeekStart((d) => addDays(d, 28))}
            className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-500 text-sm">{t('planning.loading')}</div>
        ) : (
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
                const isPast = day < new Date(today.toDateString());

                return (
                  <div
                    key={key}
                    className={`min-h-[72px] sm:min-h-[90px] rounded-xl p-1 sm:p-1.5 border ${
                      isToday
                        ? 'border-violet-500/50 bg-violet-500/8'
                        : isPast
                        ? 'border-slate-700/20 bg-slate-800/20 opacity-60'
                        : 'border-slate-700/30 bg-slate-800/30'
                    }`}
                  >
                    <div className={`text-[11px] sm:text-xs font-bold mb-1 ${isToday ? 'text-violet-400' : isPast ? 'text-slate-600' : 'text-slate-400'}`}>
                      {day.getDate()}
                    </div>
                    {dayEvents.slice(0, 3).map((ev) => {
                      const evStatut = getStatut(ev);
                      const isMatch = ev.type === 'MATCH';
                      return (
                        <button
                          key={ev.id}
                          onClick={() => setSelected(ev)}
                          className={`w-full text-left mb-0.5 px-1 py-0.5 rounded-md flex items-center gap-0.5 hover:opacity-80 ${
                            isMatch ? 'bg-violet-500/15 text-violet-300' : 'bg-emerald-500/10 text-emerald-400'
                          }`}
                        >
                          <StatutDot statut={evStatut} />
                          <span className="text-[9px] sm:text-[10px] font-bold truncate ml-0.5">
                            {isMatch ? 'M' : 'E'}
                            <span className="hidden md:inline"> {new Date(ev.dateHeure).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                          </span>
                        </button>
                      );
                    })}
                    {dayEvents.length > 3 && <p className="text-[9px] text-slate-500 pl-1">+{dayEvents.length - 3}</p>}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-700/30">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-violet-500/20 inline-block" />
                <span className="text-[10px] text-slate-500">{t('planning.match')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-500/15 inline-block" />
                <span className="text-[10px] text-slate-500">{t('planning.training')}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {selected && (
        <Modal open={!!selected} onClose={() => setSelected(null)} title={selected.type === 'MATCH' ? t('planning.match') : t('planning.training')} size="lg">
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={selected.type === 'MATCH' ? 'violet' : 'green'}>
                {selected.type === 'MATCH' ? t('planning.match') : t('planning.training')}
              </Badge>
              {selected.equipe && (
                <span className="text-xs text-slate-400">{selected.equipe.nomEquipe}{selected.equipe.categorie?.nom && <span className="text-slate-500"> · {selected.equipe.categorie.nom}</span>}</span>
              )}
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
            {selected.type === 'MATCH' && selected.adversaire && (
              <p className="text-sm text-slate-400 pl-6">vs <span className="font-semibold text-slate-300">{selected.adversaire}</span></p>
            )}
            {selected.type === 'MATCH' && selected.scoreDom !== null && selected.scoreDom !== undefined && (
              <div className="flex items-center gap-3 pt-2 border-t border-slate-700/40">
                <Shield size={14} className="text-violet-400" />
                <span className="text-xl font-extrabold text-slate-100">{selected.scoreDom} — {selected.scoreExt}</span>
                <Badge variant={
                  selected.scoreDom! > selected.scoreExt! ? 'green' :
                  selected.scoreDom! < selected.scoreExt! ? 'red' : 'yellow'
                }>
                  {selected.scoreDom! > selected.scoreExt! ? t('planning.victory') :
                   selected.scoreDom! < selected.scoreExt! ? t('planning.defeat') : t('planning.draw')}
                </Badge>
              </div>
            )}
            {selected.latitude != null && selected.longitude != null && selected.lieu && (
              <div>
                <iframe title={selected.lieu} src={osmEmbed(selected.latitude, selected.longitude)} className="w-full h-44 rounded-xl border-0" loading="lazy" />
                <a href={mapsLink(selected.lieu)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 mt-1.5">
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
