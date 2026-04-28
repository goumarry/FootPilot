import { useState, useEffect, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Calendar, Activity, AlertCircle, Link2, Loader2 } from 'lucide-react';
import { getInvitation, register } from '@/api/auth';
import { useAuth } from '@/contexts/AuthContext';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import AuthLayout from '@/layouts/AuthLayout';
import { ROLE_LABELS, type Role } from '@/types';

export default function RegisterPage() {
  const { token } = useParams<{ token?: string }>();
  const navigate = useNavigate();
  const { login: setAuth } = useAuth();

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
    if (!token) {
      setInvitError("Aucun token d'invitation fourni. Demandez un lien à votre administrateur.");
      setLoadingInvit(false);
      return;
    }
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
            "Lien d'invitation invalide ou expiré."
        );
      })
      .finally(() => setLoadingInvit(false));
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    if (password !== confirmPassword) {
      setFormError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (password.length < 8) {
      setFormError('Le mot de passe doit faire au moins 8 caractères.');
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
        user.role === 'ADMIN' || user.role === 'GESTIONNAIRE' ? '/admin' : '/dashboard',
        { replace: true }
      );
    } catch (err: unknown) {
      setFormError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Erreur lors de la création du compte.'
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
          <p className="text-sm text-slate-400">Vérification du lien…</p>
        </div>
      </AuthLayout>
    );
  }

  if (invitError) {
    return (
      <AuthLayout>
        <div className="bg-slate-800/50 border border-slate-700/40 rounded-3xl p-8 text-center backdrop-blur-sm">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center mx-auto mb-4">
            <Link2 size={22} className="text-red-400" />
          </div>
          <h2 className="text-lg font-bold text-slate-100 mb-2">Lien invalide</h2>
          <p className="text-sm text-slate-400 mb-6">{invitError}</p>
          <Button onClick={() => navigate('/login')} variant="secondary" full>
            Aller à la connexion
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
        <span className="text-base font-bold text-slate-200">FootPilot</span>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/40 rounded-3xl p-8 backdrop-blur-sm">
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 bg-violet-500/10 border border-violet-500/20 rounded-full px-3 py-1 mb-4">
            <Link2 size={12} className="text-violet-400" />
            <span className="text-xs font-semibold text-violet-400">Invitation reçue</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-50 mb-1.5 tracking-tight">Créer mon compte</h1>
          <p className="text-sm text-slate-400">
            {invitData?.clubNom && (
              <>
                Club : <span className="text-slate-200 font-semibold">{invitData.clubNom}</span>
                {' — '}
              </>
            )}
            Rôle :{' '}
            <span className="text-violet-300 font-semibold">
              {ROLE_LABELS[(invitData?.role as Role) ?? 'JOUEUR']}
            </span>
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Prénom"
              icon={<User size={14} />}
              placeholder="Jean"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <Input
              label="Nom"
              icon={<User size={14} />}
              placeholder="Dupont"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>

          <Input
            label="Email"
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
            label="Mot de passe"
            icon={<Lock size={15} />}
            type="password"
            placeholder="Minimum 8 caractères"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
          <Input
            label="Confirmer le mot de passe"
            icon={<Lock size={15} />}
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
          <Input
            label="Date de naissance (optionnel)"
            icon={<Calendar size={15} />}
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />

          {formError && (
            <div className="flex items-center gap-2.5 mb-4 px-4 py-3 bg-red-500/10 border border-red-500/25 rounded-xl text-sm text-red-400">
              <AlertCircle size={15} className="flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <Button type="submit" full size="lg" loading={loading}>
            Créer mon compte
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-700/40 text-center text-sm text-slate-500">
          Déjà un compte ?{' '}
          <button
            onClick={() => navigate('/login')}
            className="text-violet-400 hover:text-violet-300 font-semibold transition-colors"
          >
            Se connecter
          </button>
        </div>
      </div>
    </AuthLayout>
  );
}
