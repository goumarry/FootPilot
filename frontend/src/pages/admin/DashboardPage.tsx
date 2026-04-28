import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Shield, FolderOpen, Trophy, TrendingUp, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getStatsClub } from '@/api/statistiques';
import { getClub } from '@/api/clubs';
import AppLayout from '@/layouts/AppLayout';
import type { Club } from '@/types';

interface ClubStats {
  categories: number;
  equipes: number;
  joueurs: number;
  membres: number;
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [club, setClub] = useState<Club | null>(null);
  const [stats, setStats] = useState<ClubStats | null>(null);

  useEffect(() => {
    if (!user?.clubId) return;
    getClub(user.clubId).then(setClub);
    getStatsClub(user.clubId).then((s) => setStats(s));
  }, [user?.clubId]);

  const statCards = [
    { label: 'Catégories', value: stats?.categories ?? '—', icon: FolderOpen, color: 'text-violet-400', bg: 'bg-violet-500/10', to: '/admin/categories' },
    { label: 'Équipes', value: stats?.equipes ?? '—', icon: Shield, color: 'text-blue-400', bg: 'bg-blue-500/10', to: '/admin/equipes' },
    { label: 'Joueurs', value: stats?.joueurs ?? '—', icon: Trophy, color: 'text-emerald-400', bg: 'bg-emerald-500/10', to: '/admin/joueurs' },
    { label: 'Membres', value: stats?.membres ?? '—', icon: Users, color: 'text-amber-400', bg: 'bg-amber-500/10', to: '/admin/membres' },
  ];

  const quickActions = [
    { label: 'Inviter un membre', description: 'Ajouter entraîneur ou joueur', to: '/admin/membres', icon: Users },
    { label: 'Créer une équipe', description: 'Nouvelle équipe dans une catégorie', to: '/admin/equipes', icon: Shield },
    { label: 'Voir le planning', description: 'Matchs et entraînements', to: '/admin/planning', icon: TrendingUp },
    { label: 'Publier une actualité', description: 'Communication club', to: '/admin/actualites', icon: ArrowRight },
  ];

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs text-violet-400 font-semibold uppercase tracking-wider mb-1">Tableau de bord</p>
          <h1 className="text-2xl font-extrabold text-slate-50 tracking-tight">
            {club ? club.nom : 'Mon club'}
          </h1>
          {club && (
            <p className="text-sm text-slate-400 mt-1">
              {club.ville}
              {club.description && ` · ${club.description}`}
            </p>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.label}
                onClick={() => navigate(card.to)}
                className="bg-slate-800/50 border border-slate-700/40 rounded-2xl p-5 text-left hover:border-slate-600/60 transition-all active:scale-95 group"
              >
                <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
                  <Icon size={18} className={card.color} />
                </div>
                <p className="text-2xl font-extrabold text-slate-100">{card.value}</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">{card.label}</p>
              </button>
            );
          })}
        </div>

        {/* Actions rapides */}
        <div className="mb-8">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Actions rapides</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  onClick={() => navigate(action.to)}
                  className="flex items-center gap-4 bg-slate-800/50 border border-slate-700/40 rounded-xl p-4 text-left hover:border-violet-500/30 hover:bg-slate-800/80 transition-all group"
                >
                  <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                    <Icon size={16} className="text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-200">{action.label}</p>
                    <p className="text-xs text-slate-500">{action.description}</p>
                  </div>
                  <ArrowRight size={14} className="text-slate-600 group-hover:text-violet-400 group-hover:translate-x-0.5 transition-all" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Info profil club */}
        {user?.role === 'GESTIONNAIRE' && (
          <div className="bg-slate-800/30 border border-slate-700/30 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-300">Profil du club</h2>
              <button
                onClick={() => navigate('/admin/club')}
                className="text-xs text-violet-400 hover:text-violet-300 font-semibold transition-colors"
              >
                Modifier →
              </button>
            </div>
            {club ? (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-slate-500 text-xs">Nom</p>
                  <p className="text-slate-200 font-medium">{club.nom}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Ville</p>
                  <p className="text-slate-200 font-medium">{club.ville}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Chargement…</p>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
