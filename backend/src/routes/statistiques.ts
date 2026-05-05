import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { verifyToken } from '../middleware/auth';
import { requireSubscription } from '../middleware/billing';

const router = Router();
router.use(verifyToken);
router.use(requireSubscription);

const joueurStatsInclude = {
  user: { select: { firstName: true, lastName: true } },
  butsPasses: { select: { id: true } },
  presences: {
    include: { evenement: { select: { type: true } } },
  },
} as const;

type PresenceRow = { statut: string; note: number | null; buts: number | null; evenement: { type: string } };

function noteAvg(presences: PresenceRow[]): number | null {
  const noted = presences.filter((p) => p.note !== null && p.note >= 1);
  if (noted.length === 0) return null;
  return Math.round((noted.reduce((s, p) => s + (p.note ?? 0), 0) / noted.length) * 10) / 10;
}

function countBy(presences: PresenceRow[], statut: string): number {
  return presences.filter((p) => p.statut === statut).length;
}

function computeStats(joueur: {
  id: string;
  poste: string | null;
  user: { firstName: string; lastName: string };
  butsPasses: unknown[];
  presences: PresenceRow[];
}) {
  const training = joueur.presences.filter((p) => p.evenement.type === 'ENTRAINEMENT');
  const matchs = joueur.presences.filter((p) => p.evenement.type === 'MATCH');

  // Buts : valeur saisie dans les feuilles d'appel (Presence.buts), pas la table But
  const buts = matchs.reduce((sum, p) => sum + (p.buts ?? 0), 0);
  const passes = joueur.butsPasses.length;

  return {
    joueur: {
      id: joueur.id,
      firstName: joueur.user.firstName,
      lastName: joueur.user.lastName,
      poste: joueur.poste,
    },
    entrainements: {
      total: training.length,
      present: countBy(training, 'PRESENT'),
      absentNonJustifie: countBy(training, 'ABSENT_NON_JUSTIFIE'),
      absentJustifie: countBy(training, 'ABSENT_JUSTIFIE'),
      retard: countBy(training, 'RETARD'),
      blesse: countBy(training, 'BLESSE'),
      noteMoyenne: noteAvg(training),
    },
    matchs: {
      total: matchs.length,
      present: countBy(matchs, 'PRESENT'),
      absentNonJustifie: countBy(matchs, 'ABSENT_NON_JUSTIFIE'),
      absentJustifie: countBy(matchs, 'ABSENT_JUSTIFIE'),
      retard: countBy(matchs, 'RETARD'),
      blesse: countBy(matchs, 'BLESSE'),
      noteMoyenne: noteAvg(matchs),
      butsMarques: buts,
      butsParMatch: matchs.length > 0 ? Math.round((buts / matchs.length) * 100) / 100 : null,
      passes,
    },
  };
}

// GET /api/statistiques/joueurs/moi — stats du joueur connecté
router.get('/joueurs/moi', async (req, res) => {
  const joueur = await prisma.joueur.findFirst({
    where: { userId: req.user!.userId },
    include: joueurStatsInclude,
  });
  if (!joueur) return res.status(404).json({ message: 'Aucun profil joueur associé à votre compte.' });
  return res.json(computeStats(joueur));
});

// GET /api/statistiques/joueurs/:id
router.get('/joueurs/:id', async (req, res) => {
  const joueur = await prisma.joueur.findUnique({
    where: { id: req.params.id },
    include: joueurStatsInclude,
  });
  if (!joueur) return res.status(404).json({ message: 'Joueur introuvable.' });
  return res.json(computeStats(joueur));
});

// GET /api/statistiques/equipes/:id
router.get('/equipes/:id', async (req, res) => {
  const evenements = await prisma.evenement.findMany({
    where: { equipeId: req.params.id, type: 'MATCH' },
  });

  const matchsTermines = evenements.filter(
    (e) => e.statutMatch === 'TERMINE' && e.scoreDom !== null
  );

  const victoires = matchsTermines.filter((e) => (e.scoreDom ?? 0) > (e.scoreExt ?? 0)).length;
  const defaites = matchsTermines.filter((e) => (e.scoreDom ?? 0) < (e.scoreExt ?? 0)).length;
  const nuls = matchsTermines.filter((e) => (e.scoreDom ?? 0) === (e.scoreExt ?? 0)).length;
  const butsMarques = matchsTermines.reduce((sum, e) => sum + (e.scoreDom ?? 0), 0);
  const butsEncaisses = matchsTermines.reduce((sum, e) => sum + (e.scoreExt ?? 0), 0);
  const total = victoires + defaites + nuls;
  const winrate = total > 0 ? Math.round((victoires / total) * 100) : null;

  return res.json({
    equipe: { id: req.params.id },
    matchsJoues: total,
    victoires,
    defaites,
    nuls,
    butsMarques,
    butsEncaisses,
    winrate,
  });
});

// GET /api/statistiques/clubs/:id
router.get('/clubs/:id', async (req, res) => {
  const [club, entraineurs, matchs, entrainements] = await Promise.all([
    prisma.club.findUnique({
      where: { id: req.params.id },
      include: {
        _count: { select: { categories: true, equipes: true, joueurs: true, users: true } },
      },
    }),
    prisma.entraineur.count({ where: { clubId: req.params.id } }),
    prisma.evenement.count({ where: { equipe: { clubId: req.params.id }, type: 'MATCH' } }),
    prisma.evenement.count({ where: { equipe: { clubId: req.params.id }, type: 'ENTRAINEMENT' } }),
  ]);
  if (!club) return res.status(404).json({ message: 'Club introuvable.' });

  return res.json({
    club: { id: club.id, nom: club.nom },
    categories: club._count.categories,
    equipes: club._count.equipes,
    joueurs: club._count.joueurs,
    membres: club._count.users,
    entraineurs,
    matchs,
    entrainements,
  });
});

export default router;
