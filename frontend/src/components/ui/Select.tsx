import { type SelectHTMLAttributes, forwardRef, type ReactNode } from 'react';
import { clsx } from '@/lib/clsx';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, icon, className, children, ...props }, ref) => {
    return (
      <div className="mb-4">
        {label && (
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 tracking-wide uppercase">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
              {icon}
            </span>
          )}
          <select
            ref={ref}
            className={clsx(
              'w-full bg-slate-800/60 border border-slate-700/50 rounded-xl py-2.5 text-sm text-slate-100',
              'transition-all duration-150 appearance-none cursor-pointer',
              'focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/60',
              error && 'border-red-500/50',
              icon ? 'pl-10 pr-8' : 'px-4 pr-8',
              className
            )}
            {...props}
          >
            {children}
          </select>
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
            ▾
          </span>
        </div>
        {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        {error && <p className="mt-1 text-xs text-red-400 font-medium">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
export default Select;
