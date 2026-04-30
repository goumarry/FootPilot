import { useState, useEffect, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Calendar, Activity, AlertCircle, Link2, Loader2 } from 'lucide-react';
import { getInvitation, register } from '@/api/auth';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import AuthLayout from '@/layouts/AuthLayout';
import type { Role } from '@/types';

export default function RegisterPage() {
  const { token } = useParams<{ token?: string }>();
  const navigate = useNavigate();
  const { login: setAuth } = useAuth();
  const { t } = useI18n();

  const [invitData, setInvitData] = useState<{
    email?: string;
    firstName?: string;
    lastName?: string;
    role: string;
    clubNom?: string;
  } | null>(null);
  const [invitError, setInvitError] = useState('');
  const [loadingInvit, setLoadingInvit] = useState(true);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    getInvitation(token)
      .then((data) => {
        setInvitData(data);
        if (data.email) setEmail(data.email);
        if (data.firstName) setFirstName(data.firstName);
        if (data.lastName) setLastName(data.lastName);
      })
      .catch((err) => {
        setInvitError(
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            t('auth.invalidLinkDesc')
        );
      })
      .finally(() => setLoadingInvit(false));
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    if (password !== confirmPassword) {
      setFormError(t('auth.passwordMismatch'));
      return;
    }
    if (password.length < 8) {
      setFormError(t('auth.passwordTooShort'));
      return;
    }

    setLoading(true);
    try {
      const { token: jwt, user } = await register({
        token: token!,
        email,
        firstName,
        lastName,
        password,
        birthDate: birthDate || undefined,
      });
      setAuth(jwt, user);
      navigate(
        user.role === 'JOUEUR' ? '/dashboard' : '/admin',
        { replace: true }
      );
    } catch (err: unknown) {
      setFormError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          t('auth.registerError')
      );
    } finally {
      setLoading(false);
    }
  }

  if (loadingInvit) {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center justify-center gap-3 py-20">
          <Loader2 className="animate-spin text-violet-400" size={28} />
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('auth.verifying')}</p>
        </div>
      </AuthLayout>
    );
  }

  if (invitError) {
    return (
      <AuthLayout>
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/40 rounded-3xl p-8 text-center backdrop-blur-sm shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/25 flex items-center justify-center mx-auto mb-4">
            <Link2 size={22} className="text-red-500 dark:text-red-400" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">{t('auth.invalidLink')}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{invitError}</p>
          <Button onClick={() => navigate('/login')} variant="secondary" full>
            {t('auth.goToLogin')}
          </Button>
        </div>
      </AuthLayout>
    );
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
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 rounded-full px-3 py-1 mb-4">
            <Link2 size={12} className="text-violet-500 dark:text-violet-400" />
            <span className="text-xs font-semibold text-violet-600 dark:text-violet-400">{t('auth.invitation')}</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-50 mb-1.5 tracking-tight">{t('auth.registerTitle')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {invitData?.clubNom && (
              <>
                {t('auth.club')} : <span className="text-slate-700 dark:text-slate-200 font-semibold">{invitData.clubNom}</span>
                {' — '}
              </>
            )}
            {t('auth.role')} :{' '}
            <span className="text-violet-600 dark:text-violet-300 font-semibold">
              {t(`roles.${(invitData?.role as Role) ?? 'JOUEUR'}`)}
            </span>
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t('createClub.firstName')}
              icon={<User size={14} />}
              placeholder="Jean"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <Input
              label={t('createClub.lastName')}
              icon={<User size={14} />}
              placeholder="Dupont"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>

          <Input
            label={t('auth.email')}
            icon={<Mail size={15} />}
            type="email"
            placeholder="votre@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            readOnly={!!invitData?.email}
            className={invitData?.email ? 'opacity-60 cursor-not-allowed' : ''}
          />

          <Input
            label={t('auth.password')}
            icon={<Lock size={15} />}
            type="password"
            placeholder={t('auth.passwordMin')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
          <Input
            label={t('auth.confirmPassword')}
            icon={<Lock size={15} />}
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
          <Input
            label={t('auth.birthDateOptional')}
            icon={<Calendar size={15} />}
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />

          {formError && (
            <div className="flex items-center gap-2.5 mb-4 px-4 py-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/25 rounded-xl text-sm text-red-600 dark:text-red-400">
              <AlertCircle size={15} className="flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <Button type="submit" full size="lg" loading={loading}>
            {t('auth.registerTitle')}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700/40 text-center text-sm text-slate-500">
          {t('auth.alreadyAccount')}{' '}
          <button
            onClick={() => navigate('/login')}
            className="text-violet-600 dark:text-violet-400 hover:text-violet-500 dark:hover:text-violet-300 font-semibold transition-colors"
          >
            {t('auth.loginBtn')}
          </button>
        </div>
      </div>
    </AuthLayout>
  );
}
