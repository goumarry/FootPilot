import { type HTMLAttributes } from 'react';
import { clsx } from '@/lib/clsx';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'raised';
}

export default function Card({ className, children, variant = 'default', ...props }: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-2xl border',
        variant === 'default'
          ? 'bg-slate-800/50 border-slate-700/40'
          : 'bg-slate-700/50 border-slate-600/40',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
