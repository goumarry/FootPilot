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
  const [evenements, setEvenements] = useState<Evenement[]>([]);
  const [actualites, setActualites] = useState<Actualite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getEvenements(), getActualites()])
      .then(([evs, actus]) => {
        const now = new Date();
        setEvenements(evs.filter((e) => new Date(e.dateHeure) >= now).slice(0, 3));
        setActualites(actus.data.slice(0, 3));
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
              {evenements.length === 0 ? (
                <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-6 text-center text-sm text-slate-500">
                  {t('dashboard.noUpcoming')}
                </div>
              ) : (
                <div className="space-y-2">
                  {evenements.map((ev) => (
                    <div
                      key={ev.id}
                      className="flex items-center gap-4 bg-slate-800/50 border border-slate-700/40 rounded-xl px-4 py-3"
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${ev.type === 'MATCH' ? 'bg-violet-500/10' : 'bg-emerald-500/10'}`}>
                        {ev.type === 'MATCH' ? (
                          <Shield size={16} className="text-violet-400" />
                        ) : (
                          <Calendar size={16} className="text-emerald-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Badge variant={ev.type === 'MATCH' ? 'violet' : 'green'}>
                            {ev.type === 'MATCH' ? t('planning.match') : t('planning.training')}
                          </Badge>
                          {ev.equipe && (
                            <span className="text-xs text-slate-500">{ev.equipe.nomEquipe}</span>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-slate-200">{formatDate(ev.dateHeure)}</p>
                        {ev.lieu && <p className="text-xs text-slate-500">{ev.lieu}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
              {actualites.length === 0 ? (
                <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-6 text-center text-sm text-slate-500">
                  {t('dashboard.noNews')}
                </div>
              ) : (
                <div className="space-y-3">
                  {actualites.map((actu) => (
                    <div
                      key={actu.id}
                      className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-4"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Newspaper size={13} className="text-violet-400" />
                        <span className="text-xs text-slate-500">
                          {new Date(actu.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-200">{actu.titre}</p>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{actu.contenu}</p>
                    </div>
                  ))}
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
