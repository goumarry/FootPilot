import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ArrowRight, Mail, Lock, User, MapPin, Shield, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { createClub } from '@/api/auth';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

export default function CreateClubPage() {
  const { login: setAuth } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    clubNom: '',
    clubVille: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError(t('createClub.passwordMismatch'));
      return;
    }
    if (form.password.length < 8) {
      setError(t('createClub.passwordTooShort'));
      return;
    }

    setLoading(true);
    try {
      const { token, user } = await createClub({
        clubNom: form.clubNom,
        clubVille: form.clubVille,
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
      });
      setAuth(token, user);
      navigate('/admin', { replace: true });
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          t('createClub.error')
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-700/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
            <Activity size={18} className="text-violet-400" />
          </div>
          <span className="text-base font-bold text-slate-700 dark:text-slate-200">FootPilot</span>
        </div>

        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/40 rounded-3xl p-8 backdrop-blur-sm shadow-sm">
          <div className="mb-7">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-50 mb-1.5 tracking-tight">{t('createClub.title')}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('createClub.desc')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-0">
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-4">
                <Shield size={14} className="text-violet-400" />
                <span className="text-xs font-bold text-violet-500 dark:text-violet-400 uppercase tracking-wider">{t('createClub.clubInfo')}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 sm:gap-4">
                <Input
                  label={t('createClub.clubName')}
                  icon={<Shield size={15} />}
                  placeholder="AS Lyon FC"
                  value={form.clubNom}
                  onChange={(e) => set('clubNom', e.target.value)}
                  required
                  minLength={2}
                />
                <Input
                  label={t('createClub.city')}
                  icon={<MapPin size={15} />}
                  placeholder="Lyon"
                  value={form.clubVille}
                  onChange={(e) => set('clubVille', e.target.value)}
                  required
                  minLength={2}
                />
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-700/40 pt-5 mb-5">
              <div className="flex items-center gap-2 mb-4">
                <User size={14} className="text-violet-400" />
                <span className="text-xs font-bold text-violet-500 dark:text-violet-400 uppercase tracking-wider">{t('createClub.accountInfo')}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 sm:gap-4">
                <Input
                  label={t('createClub.firstName')}
                  icon={<User size={15} />}
                  placeholder="Marc"
                  value={form.firstName}
                  onChange={(e) => set('firstName', e.target.value)}
                  required
                />
                <Input
                  label={t('createClub.lastName')}
                  icon={<User size={15} />}
                  placeholder="Dupont"
                  value={form.lastName}
                  onChange={(e) => set('lastName', e.target.value)}
                  required
                />
              </div>
              <Input
                label={t('createClub.email')}
                icon={<Mail size={15} />}
                type="email"
                placeholder="vous@votreclub.fr"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                required
                autoComplete="email"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 sm:gap-4">
                <Input
                  label={t('createClub.password')}
                  icon={<Lock size={15} />}
                  type="password"
                  placeholder={t('createClub.passwordMin')}
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
                <Input
                  label={t('createClub.confirm')}
                  icon={<Lock size={15} />}
                  type="password"
                  placeholder={t('createClub.confirmPlaceholder')}
                  value={form.confirmPassword}
                  onChange={(e) => set('confirmPassword', e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2.5 mb-4 px-4 py-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/25 rounded-xl text-sm text-red-600 dark:text-red-400">
                <AlertCircle size={15} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" full size="lg" loading={loading}>
              <span>{t('createClub.submit')}</span>
              <ArrowRight size={16} />
            </Button>
          </form>
        </div>

        <button
          onClick={() => navigate('/')}
          className="mt-4 w-full text-center text-xs text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400 transition-colors"
        >
          {t('common.backHome')}
        </button>
      </div>
    </div>
  );
}
