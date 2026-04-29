import { useState, useEffect, type FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { validateJoinCode, useJoinCode } from '@/api/join-codes';
import { useAuth } from '@/contexts/AuthContext';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import AuthLayout from '@/layouts/AuthLayout';
import { ROLE_LABELS, type Role } from '@/types';

export default function JoinPage() {
  const { code: paramCode } = useParams<{ code?: string }>();
  const navigate = useNavigate();
  const { login: setAuth } = useAuth();

  const [code, setCode] = useState(paramCode ?? '');
  const [codeInfo, setCodeInfo] = useState<{ role: Role; clubNom: string } | null>(null);
  const [codeError, setCodeError] = useState('');
  const [validating, setValidating] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (paramCode && paramCode.length === 6) handleValidate(paramCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleValidate(c = code) {
    if (c.length !== 6) { setCodeError('Le code doit faire 6 caractères.'); return; }
    setValidating(true);
    setCodeError('');
    try {
      const info = await validateJoinCode(c);
      setCodeInfo({ role: info.role as Role, clubNom: info.clubNom });
    } catch (err: unknown) {
      setCodeError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Code invalide ou expiré.',
      );
    } finally {
      setValidating(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!codeInfo) return;
    setLoading(true);
    setFormError('');
    try {
      const { token, user } = await useJoinCode({ code, firstName, lastName, email, password });
      setAuth(token, user as Parameters<typeof setAuth>[1]);
      navigate(user.role === 'JOUEUR' ? '/dashboard' : '/admin', { replace: true });
    } catch (err: unknown) {
      setFormError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Erreur lors de la création du compte.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <div className="flex items-center gap-2.5 mb-8">
        <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
          <Activity size={16} className="text-violet-400" />
        </div>
        <span className="text-lg font-bold text-slate-700 dark:text-slate-100">FootPilot</span>
      </div>

      <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-50 mb-1">Rejoindre un club</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Entrez le code reçu de votre club.</p>

      {!codeInfo ? (
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/40 rounded-3xl p-8 backdrop-blur-sm shadow-sm space-y-4">
          <Input
            label="Code d'accès"
            placeholder="Ex : A3F7B2"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
            className="tracking-widest text-center text-lg font-bold"
          />
          {codeError && <p className="text-xs text-red-500 dark:text-red-400">{codeError}</p>}
          <Button full onClick={() => handleValidate()} loading={validating}>
            Valider le code
          </Button>
          <p className="text-center text-xs text-slate-400 dark:text-slate-500">
            Déjà un compte ?{' '}
            <Link to="/login" className="text-violet-500 dark:text-violet-400 hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/40 rounded-3xl p-8 backdrop-blur-sm shadow-sm space-y-4">
          <div className="bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 rounded-xl px-4 py-3 mb-2">
            <p className="text-xs text-violet-600 dark:text-violet-400 font-semibold">{codeInfo.clubNom}</p>
            <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">
              Vous rejoindrez en tant que <strong>{ROLE_LABELS[codeInfo.role]}</strong>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Prénom" placeholder="Jean" value={firstName}
              onChange={(e) => setFirstName(e.target.value)} required />
            <Input label="Nom" placeholder="Dupont" value={lastName}
              onChange={(e) => setLastName(e.target.value)} required />
          </div>
          <Input label="Email" type="email" placeholder="vous@email.fr" value={email}
            onChange={(e) => setEmail(e.target.value)} required />
          <Input label="Mot de passe" type="password" placeholder="8 caractères minimum" value={password}
            onChange={(e) => setPassword(e.target.value)} required />

          {formError && <p className="text-xs text-red-500 dark:text-red-400">{formError}</p>}

          <Button type="submit" full loading={loading}>
            Créer mon compte
          </Button>
          <button type="button" onClick={() => setCodeInfo(null)}
            className="w-full text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors text-center">
            ← Changer de code
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
