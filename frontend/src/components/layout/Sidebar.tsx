import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, Newspaper, User,
  LogOut, Users, FolderOpen, Shield, Activity,
  ChevronRight, ListChecks, Trophy,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { clsx } from '@/lib/clsx';
import { ROLE_LABELS } from '@/types';

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  end?: boolean;
}

const gestionnaireItems: NavItem[] = [
  { to: '/admin', icon: LayoutDashboard, label: 'Tableau de bord', end: true },
  { to: '/admin/membres', icon: Users, label: 'Membres & invitations' },
  { to: '/admin/categories', icon: FolderOpen, label: 'Catégories' },
  { to: '/admin/equipes', icon: Shield, label: 'Équipes' },
  { to: '/admin/joueurs', icon: Users, label: 'Joueurs' },
  { to: '/admin/planning', icon: Calendar, label: 'Planning' },
  { to: '/admin/actualites', icon: Newspaper, label: 'Actualités' },
];

const entraineurItems: NavItem[] = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord', end: true },
  { to: '/dashboard/equipes', icon: Shield, label: 'Mes équipes' },
  { to: '/dashboard/joueurs', icon: Users, label: 'Mes joueurs' },
  { to: '/dashboard/planning', icon: Calendar, label: 'Planning' },
  { to: '/dashboard/actualites', icon: Newspaper, label: 'Actualités' },
];

const joueurItems: NavItem[] = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord', end: true },
  { to: '/dashboard/planning', icon: Calendar, label: 'Mon planning' },
  { to: '/dashboard/actualites', icon: Newspaper, label: 'Actualités' },
  { to: '/dashboard/stats', icon: Trophy, label: 'Mes statistiques' },
  { to: '/dashboard/profil', icon: User, label: 'Mon profil' },
];

const adminItems: NavItem[] = [
  { to: '/admin', icon: LayoutDashboard, label: 'Tableau de bord', end: true },
  { to: '/admin/membres', icon: Users, label: 'Utilisateurs' },
  { to: '/admin/invitations', icon: ListChecks, label: 'Invitations' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/', { replace: true });
  }

  const role = user?.role ?? 'JOUEUR';
  let items: NavItem[];
  if (role === 'ADMIN') items = adminItems;
  else if (role === 'GESTIONNAIRE') items = gestionnaireItems;
  else if (role === 'ENTRAINEUR') items = entraineurItems;
  else items = joueurItems;

  return (
    <aside className="hidden lg:flex flex-col w-60 min-h-screen bg-slate-900/80 border-r border-slate-700/40 flex-shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-700/40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
            <Activity size={16} className="text-violet-400" />
          </div>
          <span className="text-base font-bold text-slate-100 tracking-tight">FootPilot</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {items.map((item) => (
          <SidebarLink key={item.to} item={item} />
        ))}
      </nav>

      {/* User footer */}
      <div className="px-3 pb-4 border-t border-slate-700/40 pt-3 space-y-0.5">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1">
          <div className="w-8 h-8 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-xs font-bold text-violet-300 flex-shrink-0">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-200 truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-[10px] text-slate-500 truncate">
              {ROLE_LABELS[role]}
            </p>
          </div>
          <ChevronRight size={14} className="text-slate-600 flex-shrink-0" />
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/5 transition-colors text-sm font-medium"
        >
          <LogOut size={15} />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  );
}

function SidebarLink({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
          isActive
            ? 'bg-violet-600/15 text-violet-300 border border-violet-500/20'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={16} className={isActive ? 'text-violet-400' : ''} />
          <span>{item.label}</span>
        </>
      )}
    </NavLink>
  );
}
