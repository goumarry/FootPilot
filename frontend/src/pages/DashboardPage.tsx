import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Newspaper, Trophy, Shield, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { getEvenements } from '@/api/evenements';
import { getActualites } from '@/api/actualites';
import type { Evenement, Actualite } from '@/types';
import AppLayout from '@/layouts/AppLayout';
import Badge from '@/components/ui/Badge';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [nextMatch, setNextMatch] = useState<Evenement | null>(null);
  const [nextTraining, setNextTraining] = useState<Evenement | null>(null);
  const [actualite, setActualite] = useState<Actualite | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getEvenements(), getActualites()])
      .then(([evs, actus]) => {
        const now = new Date();
        const upcoming = evs.filter((e) => new Date(e.dateHeure) >= now && !e.annule);
        setNextMatch(upcoming.find((e) => e.type === 'MATCH') ?? null);
        setNextTraining(upcoming.find((e) => e.type === 'ENTRAINEMENT') ?? null);
        setActualite(actus.data[0] ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl">
        <div className="mb-8">
          <p className="text-xs text-violet-400 font-semibold uppercase tracking-wider mb-1">{t('dashboard.subtitle')}</p>
          <h1 className="text-2xl font-extrabold text-slate-50">
            {user?.firstName} {user?.lastName}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {user?.role === 'ENTRAINEUR' ? t('dashboard.coachSpace') : t('dashboard.playerSpace')}
          </p>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-500 text-sm">{t('common.loading')}</div>
        ) : (
          <div className="space-y-8">
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-slate-300">{t('dashboard.upcoming')}</h2>
                <button
                  onClick={() => navigate('/dashboard/planning')}
                  className="text-xs text-violet-400 hover:text-violet-300 font-semibold flex items-center gap-1"
                >
                  {t('dashboard.seeAll')} <ArrowRight size={12} />
                </button>
              </div>
              <div className="space-y-2">
                {[
                  { ev: nextMatch, type: 'MATCH' as const },
                  { ev: nextTraining, type: 'ENTRAINEMENT' as const },
                ].map(({ ev, type }) =>
                  ev ? (
                    <div
                      key={ev.id}
                      className="flex items-center gap-4 bg-slate-800/50 border border-slate-700/40 rounded-xl px-4 py-3"
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${type === 'MATCH' ? 'bg-violet-500/10' : 'bg-emerald-500/10'}`}>
                        {type === 'MATCH' ? (
                          <Shield size={16} className="text-violet-400" />
                        ) : (
                          <Calendar size={16} className="text-emerald-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Badge variant={type === 'MATCH' ? 'violet' : 'green'}>
                            {type === 'MATCH' ? t('planning.match') : t('planning.training')}
                          </Badge>
                          {ev.equipe && (
                            <span className="text-xs text-slate-500 truncate">{ev.equipe.nomEquipe}</span>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-slate-200">{formatDate(ev.dateHeure)}</p>
                        {ev.lieu && <p className="text-xs text-slate-500">{ev.lieu}</p>}
                        {type === 'MATCH' && ev.adversaire && (
                          <p className="text-xs text-slate-400">vs {ev.adversaire}</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div
                      key={type}
                      className="flex items-center gap-4 bg-slate-800/30 border border-slate-700/30 rounded-xl px-4 py-3"
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${type === 'MATCH' ? 'bg-violet-500/5' : 'bg-emerald-500/5'}`}>
                        {type === 'MATCH' ? (
                          <Shield size={16} className="text-slate-600" />
                        ) : (
                          <Calendar size={16} className="text-slate-600" />
                        )}
                      </div>
                      <p className="text-sm text-slate-500">
                        {type === 'MATCH' ? t('planning.match') : t('planning.training')} · {t('dashboard.noUpcoming')}
                      </p>
                    </div>
                  )
                )}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-slate-300">{t('dashboard.news')}</h2>
                <button
                  onClick={() => navigate('/dashboard/actualites')}
                  className="text-xs text-violet-400 hover:text-violet-300 font-semibold flex items-center gap-1"
                >
                  {t('dashboard.seeAll')} <ArrowRight size={12} />
                </button>
              </div>
              {actualite ? (
                <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Newspaper size={13} className="text-violet-400" />
                    <span className="text-xs text-slate-500">
                      {new Date(actualite.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-200">{actualite.titre}</p>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{actualite.contenu}</p>
                </div>
              ) : (
                <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-6 text-center text-sm text-slate-500">
                  {t('dashboard.noNews')}
                </div>
              )}
            </section>

            {user?.role === 'JOUEUR' && (
              <section>
                <button
                  onClick={() => navigate('/dashboard/stats')}
                  className="flex items-center gap-4 bg-slate-800/50 border border-slate-700/40 rounded-xl p-4 w-full text-left hover:border-violet-500/30 transition-all group"
                >
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <Trophy size={16} className="text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">{t('dashboard.myStats')}</p>
                    <p className="text-xs text-slate-500">{t('dashboard.statDesc')}</p>
                  </div>
                  <ArrowRight size={14} className="text-slate-600 group-hover:text-violet-400 ml-auto transition-colors" />
                </button>
              </section>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
