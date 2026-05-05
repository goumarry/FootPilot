import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Activity, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { verifyEmail } from '@/api/auth';
import { useI18n } from '@/contexts/I18nContext';
import AuthLayout from '@/layouts/AuthLayout';

export default function VerifyEmailPage() {
  const { token } = useParams<{ token: string }>();
  const { t } = useI18n();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage(t('verifyEmail.invalidLink'));
      return;
    }
    verifyEmail(token)
      .then(({ message: msg }) => { setStatus('success'); setMessage(msg); })
      .catch((err: { response?: { data?: { message?: string } } }) => {
        setStatus('error');
        setMessage(err?.response?.data?.message ?? t('verifyEmail.error'));
      });
  }, [token]);

  return (
    <AuthLayout>
      <div className="flex items-center gap-2.5 mb-8">
        <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
          <Activity size={16} className="text-violet-400" />
        </div>
        <span className="text-lg font-bold text-slate-700 dark:text-slate-100">FootPilot</span>
      </div>

      <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/40 rounded-3xl p-8 backdrop-blur-sm shadow-sm text-center">
        {status === 'loading' && (
          <>
            <Loader2 size={48} className="mx-auto mb-4 text-violet-400 animate-spin" />
            <p className="text-slate-600 dark:text-slate-300 text-sm">{t('verifyEmail.loading')}</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle size={48} className="mx-auto mb-4 text-green-400" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-2">{t('verifyEmail.successTitle')}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{message}</p>
            <Link
              to="/login"
              className="inline-block px-6 py-2.5 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition-colors text-sm"
            >
              {t('verifyEmail.loginBtn')}
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <AlertCircle size={48} className="mx-auto mb-4 text-red-400" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-2">{t('verifyEmail.errorTitle')}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{message}</p>
            <Link to="/login" className="text-violet-500 dark:text-violet-400 text-sm hover:underline">
              {t('verifyEmail.backToLogin')}
            </Link>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
