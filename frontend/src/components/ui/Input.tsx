import { type InputHTMLAttributes, forwardRef, type ReactNode } from 'react';
import { clsx } from '@/lib/clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: ReactNode;
  error?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, icon, error, hint, className, ...props }, ref) => {
    return (
      <div className="mb-4">
        {label && (
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 tracking-wide uppercase">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            className={clsx(
              'w-full bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-xl py-2.5 text-sm text-slate-900 dark:text-slate-100',
              'placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all duration-150',
              'focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/60',
              error && 'border-red-500/50 focus:ring-red-500/30 focus:border-red-500/50',
              icon ? 'pl-10 pr-4' : 'px-4',
              className
            )}
            {...props}
          />
        </div>
        {hint && !error && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
        {error && <p className="mt-1 text-xs text-red-500 dark:text-red-400 font-medium">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
