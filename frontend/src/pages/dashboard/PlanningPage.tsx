import { useState, useEffect } from 'react';
import { Calendar, MapPin, Shield } from 'lucide-react';
import { getEvenements } from '@/api/evenements';
import type { Evenement } from '@/types';
import AppLayout from '@/layouts/AppLayout';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function PlanningPage() {
  const [evenements, setEvenements] = useState<Evenement[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

  useEffect(() => {
    getEvenements()
      .then(setEvenements)
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const upcoming = evenements.filter((e) => new Date(e.dateHeure) >= now);
  const past = evenements.filter((e) => new Date(e.dateHeure) < now);
  const displayed = tab === 'upcoming' ? upcoming : [...past].reverse();

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl">
        <div className="mb-6">
          <p className="text-xs text-violet-400 font-semibold uppercase tracking-wider mb-1">Planning</p>
          <h1 className="text-2xl font-extrabold text-slate-50">Mon calendrier</h1>
        </div>

        <div className="flex gap-1 bg-slate-800/60 rounded-xl p-1 mb-6 w-fit">
          {(['upcoming', 'past'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === t ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t === 'upcoming' ? `À venir (${upcoming.length})` : `Passés (${past.length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-500 text-sm">Chargement…</div>
        ) : displayed.length === 0 ? (
          <EmptyState
            icon={<Calendar size={22} />}
            title={tab === 'upcoming' ? 'Aucun événement à venir' : 'Aucun événement passé'}
          />
        ) : (
          <div className="space-y-3">
            {displayed.map((ev) => (
              <div
                key={ev.id}
                className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-4"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${ev.type === 'MATCH' ? 'bg-violet-500/10' : 'bg-emerald-500/10'}`}>
                    {ev.type === 'MATCH' ? (
                      <Shield size={18} className="text-violet-400" />
                    ) : (
                      <Calendar size={18} className="text-emerald-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={ev.type === 'MATCH' ? 'violet' : 'green'}>
                        {ev.type === 'MATCH' ? 'Match' : 'Entraînement'}
                      </Badge>
                      {ev.equipe && (
                        <span className="text-xs text-slate-500">{ev.equipe.nomEquipe}</span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-slate-200 mb-1">
                      {formatDate(ev.dateHeure)}
                    </p>
                    {ev.lieu && (
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <MapPin size={11} />
                        {ev.lieu}
                      </p>
                    )}
                    {ev.description && (
                      <p className="text-xs text-slate-400 mt-1">{ev.description}</p>
                    )}
                    {ev.type === 'MATCH' && ev.match && ev.match.scoreDom !== null && (
                      <div className="mt-2 inline-flex items-center gap-2 bg-slate-700/50 rounded-lg px-3 py-1">
                        <span className="text-sm font-bold text-slate-100">
                          {ev.match.scoreDom} — {ev.match.scoreExt}
                        </span>
                        <Badge variant={
                          ev.match.scoreDom! > ev.match.scoreExt! ? 'green' :
                          ev.match.scoreDom! < ev.match.scoreExt! ? 'red' : 'yellow'
                        }>
                          {ev.match.scoreDom! > ev.match.scoreExt! ? 'Victoire' :
                           ev.match.scoreDom! < ev.match.scoreExt! ? 'Défaite' : 'Nul'}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
