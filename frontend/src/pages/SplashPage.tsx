import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Activity, ArrowRight, Users, PlusCircle } from 'lucide-react';

export default function SplashPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;
    if (user) {
      navigate(
        user.role === 'ADMIN' || user.role === 'GESTIONNAIRE' ? '/admin' : '/dashboard',
        { replace: true }
      );
    }
  }, [user, isLoading, navigate]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row relative overflow-hidden">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-700/15 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-violet-800/10 rounded-full blur-2xl" />
      </div>
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(148,163,184,1) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Left — Branding */}
      <div className="flex-1 flex flex-col justify-center px-8 py-16 lg:px-20 relative z-10 lg:max-w-2xl">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
            <Activity size={20} className="text-violet-400" />
          </div>
          <span className="text-lg font-bold text-slate-200 tracking-tight">FootPilot</span>
        </div>

        <div className="mb-6">
          <span className="text-xs font-semibold text-violet-400 tracking-widest uppercase">
            Gestion de club · v1.0
          </span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-50 leading-[1.1] tracking-tight mb-6">
          Gérez votre club
          <br />
          <span className="text-gradient">sans effort.</span>
        </h1>

        <p className="text-slate-400 text-base lg:text-lg leading-relaxed max-w-md mb-10">
          Planning, présences, résultats, communications — tout ce dont votre club a besoin,
          dans une interface moderne et accessible.
        </p>

        <div className="flex gap-8 mb-12 lg:mb-0">
          {[
            { value: '4', label: 'Rôles' },
            { value: '∞', label: 'Équipes' },
            { value: '100%', label: 'Web' },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-2xl font-extrabold text-slate-100">{s.value}</p>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right — Actions */}
      <div className="flex flex-col justify-center px-8 py-10 lg:py-0 lg:px-16 relative z-10 lg:w-[440px]">
        <div className="bg-slate-800/50 border border-slate-700/40 rounded-3xl p-8 backdrop-blur-sm">
          <h2 className="text-xl font-bold text-slate-100 mb-2">Bienvenue</h2>
          <p className="text-sm text-slate-400 mb-8">
            Créez votre club ou connectez-vous à votre espace.
          </p>

          <div className="space-y-3">
            {/* CTA principal */}
            <button
              onClick={() => navigate('/create-club')}
              className="w-full flex items-center justify-between bg-violet-600 hover:bg-violet-500 text-white font-semibold px-5 py-4 rounded-xl transition-all active:scale-95 group shadow-lg shadow-violet-900/30"
            >
              <div className="flex items-center gap-3">
                <PlusCircle size={18} className="text-violet-200" />
                <div className="text-left">
                  <div className="text-sm">Créer un club</div>
                  <div className="text-xs text-violet-300 font-normal">Nouveau compte gestionnaire</div>
                </div>
              </div>
              <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-700/50" />
              <span className="text-xs text-slate-600">ou</span>
              <div className="flex-1 h-px bg-slate-700/50" />
            </div>

            <button
              onClick={() => navigate('/login')}
              className="w-full flex items-center justify-between bg-slate-700/60 hover:bg-slate-700 text-slate-200 font-semibold px-5 py-3.5 rounded-xl border border-slate-600/50 transition-all active:scale-95 group"
            >
              <span>Se connecter</span>
              <ArrowRight size={16} className="text-slate-500 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              onClick={() => navigate('/register')}
              className="w-full flex items-center justify-between bg-slate-800/60 hover:bg-slate-800 text-slate-400 font-medium px-5 py-3 rounded-xl border border-slate-700/40 transition-all active:scale-95 group"
            >
              <div className="flex items-center gap-2.5">
                <Users size={15} className="text-slate-500" />
                <span className="text-sm">Rejoindre via invitation</span>
              </div>
              <ArrowRight size={14} className="text-slate-600 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          <p className="text-center text-xs text-slate-600 mt-8">
            Version 1.0 · FootPilot 2025
          </p>
        </div>
      </div>
    </div>
  );
}
