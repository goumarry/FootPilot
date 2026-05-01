import { useEffect } from 'react';
import { AlertTriangle, Info, CheckCircle } from 'lucide-react';
import Button from './Button';
import { useI18n } from '@/contexts/I18nContext';

export type DialogVariant = 'danger' | 'warning' | 'info' | 'success';

export interface DialogConfig {
  message: string;
  title?: string;
  variant?: DialogVariant;
  confirmLabel?: string;
  onConfirm?: () => void;
}

interface DialogProps extends DialogConfig {
  open: boolean;
  onClose: () => void;
}

const icons: Record<DialogVariant, React.ReactNode> = {
  danger:  <AlertTriangle size={18} className="text-red-400" />,
  warning: <AlertTriangle size={18} className="text-amber-400" />,
  info:    <Info          size={18} className="text-blue-400" />,
  success: <CheckCircle  size={18} className="text-emerald-400" />,
};

const iconBg: Record<DialogVariant, string> = {
  danger:  'bg-red-500/10',
  warning: 'bg-amber-500/10',
  info:    'bg-blue-500/10',
  success: 'bg-emerald-500/10',
};

const confirmBtnVariant: Record<DialogVariant, 'danger' | 'primary'> = {
  danger:  'danger',
  warning: 'primary',
  info:    'primary',
  success: 'primary',
};

export default function Dialog({
  open,
  title,
  message,
  variant = 'info',
  confirmLabel,
  onConfirm,
  onClose,
}: DialogProps) {
  const { t } = useI18n();

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !onConfirm) onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose, onConfirm]);

  if (!open) return null;

  const isConfirm = !!onConfirm;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick={!isConfirm ? onClose : undefined}
      />
      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl">
        <div className="px-5 py-5">
          <div className="flex items-start gap-3">
            <div className={`w-9 h-9 rounded-xl ${iconBg[variant]} flex items-center justify-center flex-shrink-0 mt-0.5`}>
              {icons[variant]}
            </div>
            <div className="flex-1 min-w-0">
              {title && (
                <p className="text-sm font-bold text-slate-100 mb-1">{title}</p>
              )}
              <p className="text-sm text-slate-400 leading-relaxed">{message}</p>
            </div>
          </div>

          <div className="flex gap-2.5 mt-5">
            {isConfirm ? (
              <>
                <Button variant="secondary" full onClick={onClose}>
                  {t('common.cancel')}
                </Button>
                <Button
                  variant={confirmBtnVariant[variant]}
                  full
                  onClick={() => { onConfirm(); }}
                >
                  {confirmLabel ?? t('common.save')}
                </Button>
              </>
            ) : (
              <Button variant="secondary" full onClick={onClose}>
                OK
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
