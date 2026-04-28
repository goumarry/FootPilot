import { useState, useEffect } from 'react';
import { Trophy, Target, Users, Activity } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getStatsJoueur } from '@/api/statistiques';
import client from '@/api/client';
import AppLayout from '@/layouts/AppLayout';

interface JoueurStats {
  joueur: { id: string; firstName: string; lastName: string; poste?: string };
  buts: number;
  passes: number;
  cscs: number;
  matchsJoues: number;
  presences: number;
  assiduite: number | null;
}

export default function StatsPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<JoueurStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    client.get<{ userId?: string; id: string }[]>('/joueurs')
      .then(({ data }) => {
        const myJoueur = data.find((j) => j.userId === user?.id);
        if (!myJoueur) { setLoading(false); return; }
        return getStatsJoueur(myJoueur.id).then(setStats);
      })
      .catch(() => setError('Impossible de charger les statistiques.'))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const statCards = stats
    ? [
        { label: 'Buts', value: stats.buts, icon: Target, color: 'text-violet-400', bg: 'bg-violet-500/10' },
        { label: 'Passes déc.', value: stats.passes, icon: Activity, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        { label: 'Matchs joués', value: stats.matchsJoues, icon: Trophy, color: 'text-amber-400', bg: 'bg-amber-500/10' },
        {
          label: 'Assiduité',
          value: stats.assiduite !== null ? `${stats.assiduite}%` : '—',
          icon: Users,
          color: 'text-emerald-400',
          bg: 'bg-emerald-500/10',
        },
      ]
    : [];

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl">
        <div className="mb-6">
          <p className="text-xs text-violet-400 font-semibold uppercase tracking-wider mb-1">Performance</p>
          <h1 className="text-2xl font-extrabold text-slate-50">Mes statistiques</h1>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-500 text-sm">Chargement…</div>
        ) : error ? (
          <div className="text-center py-16 text-red-400 text-sm">{error}</div>
        ) : !stats ? (
          <div className="text-center py-16 text-slate-500 text-sm">
            Aucun profil joueur associé à votre compte.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 mb-8">
              {statCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className="bg-slate-800/50 border border-slate-700/40 rounded-2xl p-5">
                    <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
                      <Icon size={18} className={card.color} />
                    </div>
                    <p className="text-3xl font-extrabold text-slate-100">{card.value}</p>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">{card.label}</p>
                  </div>
                );
              })}
            </div>

            <div className="bg-slate-800/30 border border-slate-700/30 rounded-2xl p-5">
              <h2 className="text-sm font-bold text-slate-300 mb-3">Détails</h2>
              <div className="space-y-3">
                <StatRow label="Buts marqués" value={stats.buts} />
                <StatRow label="Passes décisives" value={stats.passes} />
                <StatRow label="Contre-son-camp" value={stats.cscs} />
                <StatRow label="Matchs joués" value={stats.matchsJoues} />
                <StatRow label="Présences enregistrées" value={stats.presences} />
                {stats.assiduite !== null && (
                  <StatRow label="Taux d'assiduité" value={`${stats.assiduite}%`} />
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-700/20 last:border-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-sm font-bold text-slate-200">{value}</span>
    </div>
  );
}
