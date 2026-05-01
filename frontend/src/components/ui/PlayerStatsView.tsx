import { Star, Target, Activity, ChevronRight } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';

export interface StatsSection {
  total: number;
  present: number;
  absentNonJustifie: number;
  absentJustifie: number;
  retard: number;
  blesse: number;
  noteMoyenne: number | null;
}

export interface MatchSection extends StatsSection {
  butsMarques: number;
  butsParMatch: number | null;
  passes: number;
  cscs: number;
}

export interface JoueurStatsData {
  joueur: { id: string; firstName: string; lastName: string; poste?: string | null };
  entrainements: StatsSection;
  matchs: MatchSection;
}

const R = 48;
const C = 2 * Math.PI * R;

const COLORS = {
  present:          '#10b981',
  retard:           '#f97316',
  absentJustifie:   '#f59e0b',
  blesse:           '#f43f5e',
  absentNonJustifie:'#ef4444',
} as const;

function Donut({ data }: { data: StatsSection }) {
  const { total } = data;
  if (total === 0) {
    return (
      <div className="w-28 h-28 flex items-center justify-center flex-shrink-0">
        <span className="text-slate-500 text-xs">—</span>
      </div>
    );
  }

  const slices: Array<{ value: number; color: string }> = [
    { value: data.present,           color: COLORS.present },
    { value: data.retard,            color: COLORS.retard },
    { value: data.absentJustifie,    color: COLORS.absentJustifie },
    { value: data.blesse,            color: COLORS.blesse },
    { value: data.absentNonJustifie, color: COLORS.absentNonJustifie },
  ].filter((s) => s.value > 0);

  const rate = Math.round((data.present / total) * 100);
  let cumulative = 0;

  return (
    <div className="relative w-28 h-28 flex-shrink-0">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r={R} fill="none" strokeWidth="15" stroke="rgba(100,116,139,0.2)" />
        {slices.map((slice, i) => {
          const arc = (slice.value / total) * C;
          const offset = -cumulative;
          cumulative += arc;
          return (
            <circle
              key={i}
              cx="60" cy="60" r={R}
              fill="none"
              strokeWidth="15"
              strokeDasharray={`${arc} ${C}`}
              strokeDashoffset={offset}
              strokeLinecap="butt"
              style={{ stroke: slice.color }}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-extrabold text-slate-100 leading-none">{rate}%</span>
        <span className="text-[9px] text-slate-500 mt-0.5">{total} séances</span>
      </div>
    </div>
  );
}

function LegendRow({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      <span className="text-xs text-slate-400 flex-1">{label}</span>
      <span className="text-xs font-bold text-slate-200">{value}</span>
    </div>
  );
}

function NoteStars({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={11} className={i <= Math.round(value) ? 'text-amber-400 fill-amber-400' : 'text-slate-600'} />
      ))}
    </div>
  );
}

function SectionCard({ title, data, isMatch }: { title: string; data: StatsSection; isMatch?: boolean }) {
  const m = isMatch ? (data as MatchSection) : null;
  const { t } = useI18n();

  return (
    <div className="bg-slate-800/40 border border-slate-700/30 rounded-2xl p-4">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{title}</h3>
      <div className="flex items-start gap-4">
        <Donut data={data} />
        <div className="flex-1 min-w-0 space-y-1.5">
          <LegendRow color={COLORS.present}           label={t('stats.present')}           value={data.present} />
          <LegendRow color={COLORS.retard}            label={t('stats.retard')}             value={data.retard} />
          <LegendRow color={COLORS.absentJustifie}    label={t('stats.absentJustifie')}     value={data.absentJustifie} />
          <LegendRow color={COLORS.blesse}            label={t('stats.blesse')}             value={data.blesse} />
          <LegendRow color={COLORS.absentNonJustifie} label={t('stats.absentNonJustifie')}  value={data.absentNonJustifie} />
          {data.noteMoyenne !== null && (
            <div className="flex items-center gap-2 pt-1.5 mt-1 border-t border-slate-700/30">
              <Star size={11} className="text-amber-400 fill-amber-400 flex-shrink-0" />
              <span className="text-xs text-slate-400 flex-1">{t('stats.averageNote')}</span>
              <div className="flex items-center gap-1">
                <NoteStars value={data.noteMoyenne} />
                <span className="text-xs font-bold text-amber-300 ml-1">{data.noteMoyenne.toFixed(1)}</span>
              </div>
            </div>
          )}
          {m !== null && (
            <div className="pt-1.5 mt-1 border-t border-slate-700/30 space-y-1.5">
              <div className="flex items-center gap-2">
                <Target size={11} className="text-violet-400 flex-shrink-0" />
                <span className="text-xs text-slate-400 flex-1">{t('stats.goalsMade')}</span>
                <span className="text-xs font-bold text-slate-200">{m.butsMarques}</span>
              </div>
              {m.butsParMatch !== null && (
                <div className="flex items-center gap-2">
                  <ChevronRight size={11} className="text-slate-600 flex-shrink-0" />
                  <span className="text-xs text-slate-400 flex-1">{t('stats.butsParMatch')}</span>
                  <span className="text-xs font-bold text-slate-200">{m.butsParMatch.toFixed(2)}</span>
                </div>
              )}
              {m.passes > 0 && (
                <div className="flex items-center gap-2">
                  <Activity size={11} className="text-blue-400 flex-shrink-0" />
                  <span className="text-xs text-slate-400 flex-1">{t('stats.decisiveAssists')}</span>
                  <span className="text-xs font-bold text-slate-200">{m.passes}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function PlayerStatsView({ stats }: { stats: JoueurStatsData }) {
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      <SectionCard title={t('stats.sectionTraining')} data={stats.entrainements} />
      <SectionCard title={t('stats.sectionMatchs')} data={stats.matchs} isMatch />
    </div>
  );
}
