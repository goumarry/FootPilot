import { useState, useEffect, type FormEvent } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { Activity, CheckCircle } from 'lucide-react';
import { validateJoinCode, redeemJoinCode } from '@/api/join-codes';
import { useI18n } from '@/contexts/I18nContext';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import AuthLayout from '@/layouts/AuthLayout';
import type { Role } from '@/types';

export default function JoinPage() {
  const { code: paramCode } = useParams<{ code?: string }>();
  const [searchParams] = useSearchParams();
  const { t } = useI18n();

  const initialCode = (paramCode ?? searchParams.get('code') ?? '').toUpperCase();

  const [code, setCode] = useState(initialCode);
  const [codeInfo, setCodeInfo] = useState<{ role: Role; clubNom: string } | null>(null);
  const [codeError, setCodeError] = useState('');
  const [validating, setValidating] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (initialCode.length === 6) handleValidate(initialCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleValidate(c = code) {
    if (c.length !== 6) { setCodeError(t('join.codeTooShort')); return; }
    setValidating(true);
    setCodeError('');
    try {
      const info = await validateJoinCode(c);
      setCodeInfo({ role: info.role as Role, clubNom: info.clubNom });
    } catch (err: unknown) {
      setCodeError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          t('join.codeInvalid'),
      );
    } finally {
      setValidating(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!codeInfo) return;
    if (password !== confirmPassword) {
      setFormError(t('join.passwordMismatch'));
      return;
    }
    setLoading(true);
    setFormError('');
    try {
      await redeemJoinCode({ code, firstName, lastName, email, password, confirmPassword });
      setSubmitted(true);
    } catch (err: unknown) {
      setFormError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          t('join.registerError'),
      );
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <AuthLayout>
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
            <Activity size={16} className="text-violet-400" />
          </div>
          <span className="text-lg font-bold text-slate-700 dark:text-slate-100">FootPilot</span>
        </div>
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/40 rounded-3xl p-8 backdrop-blur-sm shadow-sm text-center">
          <CheckCircle size={48} className="mx-auto mb-4 text-green-400" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-2">{t('pendingVerification.title')}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{t('pendingVerification.message').replace('{email}', email)}</p>
          <Link to="/login" className="text-violet-500 dark:text-violet-400 text-sm hover:underline">
            {t('pendingVerification.loginLink')}
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="flex items-center gap-2.5 mb-8">
        <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
          <Activity size={16} className="text-violet-400" />
        </div>
        <span className="text-lg font-bold text-slate-700 dark:text-slate-100">FootPilot</span>
      </div>

      <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-50 mb-1">{t('join.title')}</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{t('join.subtitle')}</p>

      {!codeInfo ? (
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/40 rounded-3xl p-8 backdrop-blur-sm shadow-sm space-y-4">
          <Input
            label={t('join.codeLabel')}
            placeholder={t('join.codePlaceholder')}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
            className="tracking-widest text-center text-lg font-bold"
          />
          {codeError && <p className="text-xs text-red-500 dark:text-red-400">{codeError}</p>}
          <Button full onClick={() => handleValidate()} loading={validating}>
            {t('join.validateCode')}
          </Button>
          <p className="text-center text-xs text-slate-400 dark:text-slate-500">
            {t('join.alreadyAccount')}{' '}
            <Link to="/login" className="text-violet-500 dark:text-violet-400 hover:underline">
              {t('join.login')}
            </Link>
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/40 rounded-3xl p-8 backdrop-blur-sm shadow-sm space-y-4">
          <div className="bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 rounded-xl px-4 py-3 mb-2">
            <p className="text-xs text-violet-600 dark:text-violet-400 font-semibold">{codeInfo.clubNom}</p>
            <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">
              {t('join.joiningAs')} <strong>{t(`roles.${codeInfo.role}`)}</strong>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label={t('members.firstName')} placeholder="Jean" value={firstName}
              onChange={(e) => setFirstName(e.target.value)} required />
            <Input label={t('members.lastName')} placeholder="Dupont" value={lastName}
              onChange={(e) => setLastName(e.target.value)} required />
          </div>
          <Input label={t('auth.email')} type="email" placeholder="vous@email.fr" value={email}
            onChange={(e) => setEmail(e.target.value)} required />
          <Input label={t('auth.password')} type="password" placeholder={t('join.passwordMin')} value={password}
            onChange={(e) => setPassword(e.target.value)} required />
          <Input label={t('join.confirmPassword')} type="password" placeholder={t('join.confirmPasswordPlaceholder')} value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)} required />

          {formError && <p className="text-xs text-red-500 dark:text-red-400">{formError}</p>}

          <Button type="submit" full loading={loading}>
            {t('join.createAccount')}
          </Button>
          <button type="button" onClick={() => setCodeInfo(null)}
            className="w-full text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors text-center">
            {t('join.changeCode')}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
