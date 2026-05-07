import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Shield, Calendar, Newspaper, TrendingUp, ArrowRight, Building2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { getStatsClub } from '@/api/statistiques';
import { getClub } from '@/api/clubs';
import { getEvenements } from '@/api/evenements';
import { getEquipes } from '@/api/equipes';
import { getActualites } from '@/api/actualites';
import AppLayout from '@/layouts/AppLayout';
import Badge from '@/components/ui/Badge';
import type { Club, Equipe, Evenement, Actualite } from '@/types';

interface ClubStats {
  categories: number;
  equipes: number;
  joueurs: number;
  membres: number;
  entraineurs: number;
  matchs: number;
  entrainements: number;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [club, setClub] = useState<Club | null>(null);
  const [stats, setStats] = useState<ClubStats | null>(null);
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [evenements, setEvenements] = useState<Evenement[]>([]);
  const [actualite, setActualite] = useState<Actualite | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.clubId) return;
    Promise.all([
      getClub(user.clubId).then(setClub),
      getStatsClub(user.clubId).then(setStats),
      getEquipes().then(setEquipes),
      getEvenements(),
      getActualites(),
    ]).then(([, , , evs, actus]) => {
      const now = new Date();
      const upcoming = evs.filter((e: Evenement) => new Date(e.dateHeure) >= now && !e.annule);
      setEvenements(upcoming);
      setActualite(actus.data[0] ?? null);
    }).finally(() => setLoading(false));
  }, [user?.clubId]);

  const myTeamIds = useMemo(
    () => equipes.filter((eq) => eq.entraineurs?.some((e) => e.entraineur.userId === user?.id)).map((eq) => eq.id),
    [equipes, user?.id]
  );

  const nextMatch = useMemo(
    () => evenements.filter((e) => myTeamIds.includes(e.equipeId) && e.type === 'MATCH')[0] ?? null,
    [evenements, myTeamIds]
  );

  const nextTraining = useMemo(
    () => evenements.filter((e) => myTeamIds.includes(e.equipeId) && e.type === 'ENTRAINEMENT')[0] ?? null,
    [evenements, myTeamIds]
  );

  const quickActions = [
    { labelKey: 'adminDash.inviteMember', descKey: 'adminDash.inviteMemberDesc', to: '/admin/membres', icon: Users },
    { labelKey: 'adminDash.createTeam', descKey: 'adminDash.createTeamDesc', to: '/admin/equipes', icon: Shield },
    { labelKey: 'adminDash.viewPlanning', descKey: 'adminDash.viewPlanningDesc', to: '/admin/planning', icon: TrendingUp },
    { labelKey: 'adminDash.publishNews', descKey: 'adminDash.publishNewsDesc', to: '/admin/actualites', icon: Newspaper },
  ];

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-8">
          <p className="text-xs text-violet-400 font-semibold uppercase tracking-wider mb-1">{t('adminDash.subtitle')}</p>
          <h1 className="text-2xl font-extrabold text-slate-50 tracking-tight">
            {club ? club.nom : t('common.loading')}
          </h1>
          {club && (
            <p className="text-sm text-slate-400 mt-1">
              {club.ville}
              {club.description && ` · ${club.description}`}
            </p>
          )}
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-500 text-sm">{t('common.loading')}</div>
        ) : (
          <div className="space-y-8">
            {/* Prochains événements */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-slate-300">{t('dashboard.upcoming')}</h2>
                <button
                  onClick={() => navigate('/admin/planning')}
                  className="text-xs text-violet-400 hover:text-violet-300 font-semibold flex items-center gap-1"
                >
                  {t('dashboard.seeAll')} <ArrowRight size={12} />
                </button>
              </div>
              <div className="space-y-2">
                {([
                  { ev: nextMatch, type: 'MATCH' as const },
                  { ev: nextTraining, type: 'ENTRAINEMENT' as const },
                ] as const).map(({ ev, type }) =>
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

            {/* Dernière actualité */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-slate-300">{t('dashboard.news')}</h2>
                <button
                  onClick={() => navigate('/admin/actualites')}
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

            {/* Actions rapides */}
            <section>
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">{t('adminDash.quickActions')}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.labelKey}
                      onClick={() => navigate(action.to)}
                      className="flex items-center gap-4 bg-slate-800/50 border border-slate-700/40 rounded-xl p-4 text-left hover:border-violet-500/30 hover:bg-slate-800/80 transition-all group"
                    >
                      <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                        <Icon size={16} className="text-violet-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-200">{t(action.labelKey)}</p>
                        <p className="text-xs text-slate-500">{t(action.descKey)}</p>
                      </div>
                      <ArrowRight size={14} className="text-slate-600 group-hover:text-violet-400 group-hover:translate-x-0.5 transition-all" />
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Club card — GESTIONNAIRE only */}
            {user?.role === 'GESTIONNAIRE' && (
              <section>
                <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center gap-4 p-5 border-b border-slate-700/30">
                    {club?.logoUrl ? (
                      <img
                        src={club.logoUrl}
                        alt={club.nom}
                        className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-slate-600/40"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                        <Building2 size={24} className="text-violet-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h2 className="text-base font-bold text-slate-100 truncate">{club?.nom}</h2>
                      {club?.ville && <p className="text-sm text-slate-400">{club.ville}</p>}
                      {club?.description && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{club.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-700/20">
                    {[
                      { labelKey: 'adminDash.players', value: stats?.joueurs ?? '—', color: 'text-emerald-400' },
                      { labelKey: 'adminDash.coaches', value: stats?.entraineurs ?? '—', color: 'text-blue-400' },
                      { labelKey: 'adminDash.totalMatches', value: stats?.matchs ?? '—', color: 'text-violet-400' },
                      { labelKey: 'adminDash.totalTrainings', value: stats?.entrainements ?? '—', color: 'text-amber-400' },
                    ].map((item) => (
                      <div key={item.labelKey} className="bg-slate-800/50 px-4 py-3 text-center">
                        <p className={`text-xl font-extrabold ${item.color}`}>{item.value}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{t(item.labelKey)}</p>
                      </div>
                    ))}
                  </div>

                  {/* Edit action */}
                  <div className="px-5 py-3 flex justify-end">
                    <button
                      onClick={() => navigate('/admin/club')}
                      className="text-xs text-violet-400 hover:text-violet-300 font-semibold transition-colors flex items-center gap-1"
                    >
                      {t('adminDash.editClub')} <ArrowRight size={11} />
                    </button>
                  </div>
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
