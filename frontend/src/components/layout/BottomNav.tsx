import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, Newspaper, User, Shield, Trophy } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { clsx } from '@/lib/clsx';

export default function BottomNav() {
  const { user } = useAuth();
  const { t } = useI18n();
  const role = user?.role ?? 'JOUEUR';

  const itemsByRole: Record<string, Array<{ to: string; icon: React.ElementType; labelKey: string; end?: boolean }>> = {
    GESTIONNAIRE: [
      { to: '/admin', icon: LayoutDashboard, labelKey: 'nav.home', end: true },
      { to: '/admin/joueurs', icon: User, labelKey: 'nav.players' },
      { to: '/admin/planning', icon: Calendar, labelKey: 'nav.planning' },
      { to: '/admin/actualites', icon: Newspaper, labelKey: 'nav.actus' },
      { to: '/admin/equipes', icon: Shield, labelKey: 'nav.teams' },
    ],
    ENTRAINEUR: [
      { to: '/admin', icon: LayoutDashboard, labelKey: 'nav.home', end: true },
      { to: '/admin/joueurs', icon: User, labelKey: 'nav.players' },
      { to: '/admin/equipes', icon: Shield, labelKey: 'nav.teams' },
      { to: '/admin/planning', icon: Calendar, labelKey: 'nav.planning' },
      { to: '/admin/actualites', icon: Newspaper, labelKey: 'nav.actus' },
    ],
    JOUEUR: [
      { to: '/dashboard', icon: LayoutDashboard, labelKey: 'nav.home', end: true },
      { to: '/dashboard/planning', icon: Calendar, labelKey: 'nav.planning' },
      { to: '/dashboard/actualites', icon: Newspaper, labelKey: 'nav.actus' },
      { to: '/dashboard/stats', icon: Trophy, labelKey: 'nav.stats' },
    ],
  };

  const items = itemsByRole[role] ?? itemsByRole.JOUEUR;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-700/40">
      <div className="flex">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                clsx(
                  'flex-1 flex flex-col items-center gap-1 py-2.5 transition-colors',
                  isActive ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400 dark:text-slate-500'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 1.75} />
                  <span className={clsx('text-[10px] font-semibold', isActive && 'text-violet-600 dark:text-violet-400')}>
                    {t(item.labelKey)}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
