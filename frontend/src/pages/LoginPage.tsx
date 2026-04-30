import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Activity, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { login } from '@/api/auth';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import AuthLayout from '@/layouts/AuthLayout';

export default function LoginPage() {
  const { login: setAuth } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, user } = await login(email, password);
      setAuth(token, user);
      navigate(
        user.role === 'JOUEUR' ? '/dashboard' : '/admin',
        { replace: true }
      );
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          t('auth.loginError')
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <div className="flex items-center gap-2.5 mb-8">
        <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
          <Activity size={18} className="text-violet-400" />
        </div>
        <span className="text-base font-bold text-slate-700 dark:text-slate-200">FootPilot</span>
      </div>

      <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/40 rounded-3xl p-8 backdrop-blur-sm shadow-sm">
        <div className="mb-7">
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-50 mb-1.5 tracking-tight">{t('auth.loginTitle')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('auth.loginDesc')}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <Input
            label={t('auth.email')}
            icon={<Mail size={15} />}
            type="email"
            placeholder="votre@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <Input
            label={t('auth.password')}
            icon={<Lock size={15} />}
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          <div className="flex justify-end mb-5 -mt-2">
            <button type="button" className="text-xs text-violet-500 hover:text-violet-400 font-medium transition-colors">
              {t('auth.forgotPassword')}
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2.5 mb-4 px-4 py-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/25 rounded-xl text-sm text-red-600 dark:text-red-400">
              <AlertCircle size={15} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" full size="lg" loading={loading}>
            <span>{t('auth.loginBtn')}</span>
            <ArrowRight size={16} />
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700/40 text-center">
          <Link
            to="/join"
            className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-300 font-medium transition-colors"
          >
            <span>🔑</span>
            <span>{t('auth.joinCode')}</span>
          </Link>
        </div>
      </div>

      <button
        onClick={() => navigate('/')}
        className="mt-4 w-full text-center text-xs text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400 transition-colors"
      >
        {t('common.backHome')}
      </button>
    </AuthLayout>
  );
}
