import { useState, useEffect } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { getMyStats } from '@/api/statistiques';
import AppLayout from '@/layouts/AppLayout';
import { PlayerStatsView, type JoueurStatsData } from '@/components/ui/PlayerStatsView';

export default function StatsPage() {
  const { t } = useI18n();
  const [stats, setStats] = useState<JoueurStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getMyStats()
      .then(setStats)
      .catch(() => setError(t('stats.loadError')))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout>
      <div className="p-6 max-w-2xl">
        <div className="mb-6">
          <p className="text-xs text-violet-400 font-semibold uppercase tracking-wider mb-1">{t('stats.subtitle')}</p>
          <h1 className="text-2xl font-extrabold text-slate-50">{t('stats.title')}</h1>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-500 text-sm">{t('common.loading')}</div>
        ) : error ? (
          <div className="text-center py-16 text-red-400 text-sm">{error}</div>
        ) : !stats ? (
          <div className="text-center py-16 text-slate-500 text-sm">{t('stats.noProfile')}</div>
        ) : (
          <PlayerStatsView stats={stats} />
        )}
      </div>
    </AppLayout>
  );
}
