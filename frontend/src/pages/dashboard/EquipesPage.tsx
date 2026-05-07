import { useState, useEffect } from 'react';
import { Shield, Users } from 'lucide-react';
import { getEquipes } from '@/api/equipes';
import type { Equipe } from '@/types';
import { useI18n } from '@/contexts/I18nContext';
import AppLayout from '@/layouts/AppLayout';
import EmptyState from '@/components/ui/EmptyState';

export default function EquipesPageDashboard() {
  const { t } = useI18n();
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEquipes().then(setEquipes).finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl mx-auto">
        <div className="mb-6">
          <p className="text-xs text-violet-400 font-semibold uppercase tracking-wider mb-1">{t('roles.ENTRAINEUR')}</p>
          <h1 className="text-2xl font-extrabold text-slate-50">{t('teams.myTeams')}</h1>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-500 text-sm">{t('common.loading')}</div>
        ) : equipes.length === 0 ? (
          <EmptyState
            icon={<Shield size={22} />}
            title={t('teams.noAssignedTeams')}
            description={t('teams.noAssignedTeamsDesc')}
          />
        ) : (
          <div className="space-y-3">
            {equipes.map((eq) => (
              <div
                key={eq.id}
                className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <Shield size={18} className="text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-200">{eq.nomEquipe}</p>
                    <p className="text-xs text-slate-500">
                      {eq.categorie?.nom}
                      {eq.niveauChampionnat && ` · ${eq.niveauChampionnat}`}
                    </p>
                  </div>
                  {eq._count && (
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Users size={12} />
                      <span>{eq._count.joueurs}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
