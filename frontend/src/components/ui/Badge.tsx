import { clsx } from '@/lib/clsx';
import type { ReactNode } from 'react';
import type { Role } from '@/types';

type BadgeVariant = 'default' | 'violet' | 'green' | 'yellow' | 'red' | 'blue' | 'gray';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600/40',
  violet:  'bg-violet-50 dark:bg-violet-500/15 text-violet-600 dark:text-violet-300 border-violet-200 dark:border-violet-500/30',
  green:   'bg-green-50 dark:bg-green-500/15 text-green-600 dark:text-green-300 border-green-200 dark:border-green-500/30',
  yellow:  'bg-yellow-50 dark:bg-yellow-500/15 text-yellow-600 dark:text-yellow-300 border-yellow-200 dark:border-yellow-500/30',
  red:     'bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-300 border-red-200 dark:border-red-500/30',
  blue:    'bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-200 dark:border-blue-500/30',
  gray:    'bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700/40',
};

export default function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

const roleConfig: Record<Role, { label: string; classes: string }> = {
  GESTIONNAIRE: { label: 'Gestionnaire', classes: 'bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-200 dark:border-blue-500/25' },
  ENTRAINEUR:   { label: 'Entraîneur',   classes: 'bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-200 dark:border-amber-500/25' },
  JOUEUR:       { label: 'Joueur',       classes: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/25' },
};

export function RoleBadge({ role, className }: { role: Role; className?: string }) {
  const cfg = roleConfig[role];
  return (
    <span className={clsx(
      'text-xs font-semibold px-2.5 py-1 rounded-full border',
      cfg.classes, className
    )}>
      {cfg.label}
    </span>
  );
}

export function StatusBadge({ label, variant }: { label: string; variant: 'success' | 'error' | 'warning' | 'neutral' }) {
  const classes = {
    success: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/25',
    error:   'bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-300 border-red-200 dark:border-red-500/25',
    warning: 'bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-200 dark:border-amber-500/25',
    neutral: 'bg-slate-100 dark:bg-slate-600/30 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600/40',
  };
  return (
    <span className={clsx('text-xs font-semibold px-2.5 py-1 rounded-full border', classes[variant])}>
      {label}
    </span>
  );
}
