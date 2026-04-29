import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { verifyToken } from '../middleware/auth';

const router = Router();
router.use(verifyToken);

// GET /api/statistiques/joueurs/:id
router.get('/joueurs/:id', async (req, res) => {
  const joueur = await prisma.joueur.findUnique({
    where: { id: req.params.id },
    include: {
      user: { select: { firstName: true, lastName: true } },
      butsMarques: {
        include: { match: { include: { evenement: { select: { dateHeure: true } } } } },
      },
      butsPasses: true,
      presences: true,
      convocations: true,
    },
  });
  if (!joueur) return res.status(404).json({ message: 'Joueur introuvable.' });

  const buts = joueur.butsMarques.filter((b) => !b.estCSC).length;
  const passes = joueur.butsPasses.length;
  const cscs = joueur.butsMarques.filter((b) => b.estCSC).length;
  const matchsJoues = joueur.convocations.length;
  const totalPresences = joueur.presences.length;
  const presents = joueur.presences.filter((p) => p.statut === 'PRESENT').length;
  const assiduite = totalPresences > 0 ? Math.round((presents / totalPresences) * 100) : null;

  return res.json({
    joueur: {
      id: joueur.id,
      firstName: joueur.user?.firstName ?? joueur.firstName ?? '',
      lastName: joueur.user?.lastName ?? joueur.lastName ?? '',
      poste: joueur.poste,
    },
    buts,
    passes,
    cscs,
    matchsJoues,
    presences: totalPresences,
    assiduite,
  });
});

// GET /api/statistiques/equipes/:id
router.get('/equipes/:id', async (req, res) => {
  const equipe = await prisma.equipe.findUnique({
    where: { id: req.params.id },
    include: {
      evenements: {
        where: { type: 'MATCH' },
        include: { match: true },
      },
    },
  });
  if (!equipe) return res.status(404).json({ message: 'Équipe introuvable.' });

  const matchsTermines = equipe.evenements.filter(
    (e) => e.match?.statut === 'TERMINE' && e.match.scoreDom !== null
  );

  let victoires = 0;
  let defaites = 0;
  let nuls = 0;
  let butsMarques = 0;
  let butsEncaisses = 0;

  for (const e of matchsTermines) {
    const m = e.match!;
    const dom = m.scoreDom ?? 0;
    const ext = m.scoreExt ?? 0;
    const isDom = m.equipesDomId === req.params.id;

    butsMarques += isDom ? dom : ext;
    butsEncaisses += isDom ? ext : dom;

    const score = isDom ? dom - ext : ext - dom;
    if (score > 0) victoires++;
    else if (score < 0) defaites++;
    else nuls++;
  }

  const total = victoires + defaites + nuls;
  const winrate = total > 0 ? Math.round((victoires / total) * 100) : null;

  return res.json({
    equipe: { id: equipe.id, nomEquipe: equipe.nomEquipe },
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
  const club = await prisma.club.findUnique({
    where: { id: req.params.id },
    include: {
      _count: {
        select: { categories: true, equipes: true, joueurs: true, users: true },
      },
    },
  });
  if (!club) return res.status(404).json({ message: 'Club introuvable.' });

  return res.json({
    club: { id: club.id, nom: club.nom },
    categories: club._count.categories,
    equipes: club._count.equipes,
    joueurs: club._count.joueurs,
    membres: club._count.users,
  });
});

export default router;
