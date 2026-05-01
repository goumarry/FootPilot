import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, Newspaper, User,
  LogOut, Users, Shield, Activity,
  ChevronRight, Trophy, Settings, Sun, Moon,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useI18n } from '@/contexts/I18nContext';
import { clsx } from '@/lib/clsx';
import { useClub } from '@/hooks/useClubLogo';
import LanguageSwitcher from '@/components/layout/LanguageSwitcher';

interface NavItem {
  to: string;
  icon: React.ElementType;
  labelKey: string;
  end?: boolean;
}

const coachItems: NavItem[] = [
  { to: '/admin', icon: LayoutDashboard, labelKey: 'nav.dashboard', end: true },
  { to: '/admin/membres', icon: Users, labelKey: 'nav.members' },
  { to: '/admin/equipes', icon: Shield, labelKey: 'nav.teams' },
  { to: '/admin/joueurs', icon: Users, labelKey: 'nav.players' },
  { to: '/admin/planning', icon: Calendar, labelKey: 'nav.planning' },
  { to: '/admin/matchs', icon: Trophy, labelKey: 'nav.matchs' },
  { to: '/admin/entrainements', icon: Calendar, labelKey: 'nav.entrainements' },
  { to: '/admin/actualites', icon: Newspaper, labelKey: 'nav.news' },
];

const gestionnaireItems: NavItem[] = [
  ...coachItems,
  { to: '/admin/club', icon: Settings, labelKey: 'nav.clubSettings' },
];

const joueurItems: NavItem[] = [
  { to: '/dashboard', icon: LayoutDashboard, labelKey: 'nav.dashboard', end: true },
  { to: '/dashboard/planning', icon: Calendar, labelKey: 'nav.myPlanning' },
  { to: '/dashboard/matchs', icon: Trophy, labelKey: 'nav.myMatchs' },
  { to: '/dashboard/entrainements', icon: Calendar, labelKey: 'nav.myEntrainements' },
  { to: '/dashboard/actualites', icon: Newspaper, labelKey: 'nav.actus' },
  { to: '/dashboard/stats', icon: Trophy, labelKey: 'nav.stats' },
  { to: '/dashboard/profil', icon: User, labelKey: 'nav.myProfile' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t } = useI18n();
  const navigate = useNavigate();
  const club = useClub();

  function handleLogout() {
    logout();
    navigate('/', { replace: true });
  }

  const role = user?.role ?? 'JOUEUR';
  let items: NavItem[];
  if (role === 'GESTIONNAIRE') items = gestionnaireItems;
  else if (role === 'ENTRAINEUR') items = coachItems;
  else items = joueurItems;

  return (
    <aside className="hidden lg:flex flex-col w-60 min-h-screen bg-white dark:bg-slate-900/80 border-r border-slate-200 dark:border-slate-700/40 flex-shrink-0">
      <div className="px-5 py-5 border-b border-slate-200 dark:border-slate-700/40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center overflow-hidden flex-shrink-0">
            {club?.logoUrl ? (
              <img src={club.logoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Activity size={16} className="text-violet-400" />
            )}
          </div>
          <span className="text-base font-bold text-slate-800 dark:text-slate-100 tracking-tight truncate">
            {club?.nom ?? 'FootPilot'}
          </span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {items.map((item) => (
          <SidebarLink key={item.to} item={item} label={t(item.labelKey)} />
        ))}
      </nav>

      <div className="px-3 pb-4 border-t border-slate-200 dark:border-slate-700/40 pt-3 space-y-0.5">
        <NavLink
          to="/profile"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
        >
          <div className="w-8 h-8 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-xs font-bold text-violet-600 dark:text-violet-300 flex-shrink-0 overflow-hidden">
            {user?.profilePic ? (
              <img src={user.profilePic} alt="Profil" className="w-full h-full object-cover" />
            ) : (
              <>{user?.firstName?.[0]}{user?.lastName?.[0]}</>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
              {t(`roles.${role}`)}
            </p>
          </div>
          <ChevronRight size={14} className="text-slate-400 dark:text-slate-600 flex-shrink-0" />
        </NavLink>

        <LanguageSwitcher />

        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors text-sm font-medium"
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          <span>{theme === 'dark' ? t('nav.lightMode') : t('nav.darkMode')}</span>
        </button>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/5 transition-colors text-sm font-medium"
        >
          <LogOut size={15} />
          <span>{t('nav.logout')}</span>
        </button>
      </div>
    </aside>
  );
}

function SidebarLink({ item, label }: { item: NavItem; label: string }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
          isActive
            ? 'bg-violet-600/15 text-violet-700 dark:text-violet-300 border border-violet-500/20'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={16} className={isActive ? 'text-violet-600 dark:text-violet-400' : ''} />
          <span>{label}</span>
        </>
      )}
    </NavLink>
  );
}
