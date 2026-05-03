import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { verifyToken, requireRole } from '../middleware/auth';

const router = Router();
router.use(verifyToken);

const equipeSchema = z.object({
  categorieId: z.string(),
  nomEquipe: z.string().min(1).max(100),
  niveauChampionnat: z.string().max(100).optional(),
});

const assignJoueurSchema = z.object({
  joueurId: z.string(),
});

const assignEntraineurSchema = z.object({
  entraineurId: z.string(),
});

async function findMyEntraineurRecord(userId: string, clubId: string) {
  return prisma.entraineur.findFirst({ where: { userId, clubId } });
}

async function isCoachOfTeam(entraineurId: string, equipeId: string): Promise<boolean> {
  const record = await prisma.entraineurEquipe.findUnique({
    where: { entraineurId_equipeId: { entraineurId, equipeId } },
  });
  return record !== null;
}

async function getOrCreateEntraineurRecord(userId: string, clubId: string) {
  return prisma.entraineur.upsert({
    where: { userId },
    update: {},
    create: { userId, clubId },
  });
}

async function userIsCoachOfTeam(userId: string, clubId: string, equipeId: string): Promise<boolean> {
  const me = await findMyEntraineurRecord(userId, clubId);
  if (!me) return false;
  return isCoachOfTeam(me.id, equipeId);
}

// GET /api/equipes — all club teams, with coach userIds for frontend distinction
router.get('/', async (req, res) => {
  const clubId = req.user!.clubId;
  if (!clubId) return res.status(400).json({ message: 'Vous devez appartenir à un club.' });

  const equipes = await prisma.equipe.findMany({
    where: { clubId },
    include: {
      categorie: { select: { id: true, nom: true } },
      _count: { select: { joueurs: { where: { dateFin: null } }, entraineurs: true } },
      entraineurs: {
        select: { entraineur: { select: { userId: true } } },
      },
    },
    orderBy: [{ categorie: { nom: 'asc' } }, { nomEquipe: 'asc' }],
  });
  return res.json(equipes);
});

// GET /api/equipes/:id
router.get('/:id', async (req, res) => {
  const equipe = await prisma.equipe.findUnique({
    where: { id: req.params.id },
    include: {
      categorie: true,
      joueurs: {
        include: {
          joueur: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              poste: true,
              numeroMaillot: true,
              photoUrl: true,
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
        where: { dateFin: null },
      },
      entraineurs: {
        include: {
          entraineur: {
            select: {
              id: true,
              userId: true,
              photoUrl: true,
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
      },
    },
  });
  if (!equipe) return res.status(404).json({ message: 'Équipe introuvable.' });

  const result = {
    ...equipe,
    joueurs: equipe.joueurs.map((je) => ({
      ...je,
      joueur: {
        ...je.joueur,
        firstName: je.joueur.user?.firstName ?? je.joueur.firstName ?? '',
        lastName: je.joueur.user?.lastName ?? je.joueur.lastName ?? '',
        user: undefined,
      },
    })),
    entraineurs: equipe.entraineurs.map((ee) => ({
      ...ee,
      entraineur: {
        ...ee.entraineur,
        firstName: ee.entraineur.user.firstName,
        lastName: ee.entraineur.user.lastName,
        user: undefined,
      },
    })),
  };

  return res.json(result);
});

// POST /api/equipes
router.post('/', requireRole(Role.GESTIONNAIRE, Role.ENTRAINEUR), async (req, res) => {
  const parsed = equipeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Données invalides.', errors: parsed.error.flatten() });
  }

  const clubId = req.user!.clubId;
  if (!clubId) return res.status(400).json({ message: 'Vous devez appartenir à un club.' });

  const categorie = await prisma.categorie.findFirst({
    where: { id: parsed.data.categorieId, clubId },
  });
  if (!categorie) return res.status(404).json({ message: 'Catégorie introuvable.' });

  const equipe = await prisma.equipe.create({
    data: {
      clubId,
      categorieId: parsed.data.categorieId,
      nomEquipe: parsed.data.nomEquipe,
      niveauChampionnat: parsed.data.niveauChampionnat,
    },
    include: { categorie: true },
  });

  // Auto-assign creator as coach (create Entraineur record for gestionnaire if needed)
  const creatorEntraineur = await getOrCreateEntraineurRecord(req.user!.userId, clubId);
  await prisma.entraineurEquipe.create({
    data: { entraineurId: creatorEntraineur.id, equipeId: equipe.id },
  });

  return res.status(201).json(equipe);
});

// PUT /api/equipes/:id
router.put('/:id', requireRole(Role.GESTIONNAIRE, Role.ENTRAINEUR), async (req, res) => {
  const parsed = equipeSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Données invalides.', errors: parsed.error.flatten() });
  }

  const equipe = await prisma.equipe.findUnique({ where: { id: req.params.id } });
  if (!equipe) return res.status(404).json({ message: 'Équipe introuvable.' });
  if (equipe.clubId !== req.user!.clubId) {
    return res.status(403).json({ message: 'Accès interdit.' });
  }

  if (!(await userIsCoachOfTeam(req.user!.userId, req.user!.clubId!, req.params.id))) {
    return res.status(403).json({ message: 'Vous devez être entraîneur de cette équipe.' });
  }

  const updated = await prisma.equipe.update({
    where: { id: req.params.id },
    data: parsed.data,
    include: { categorie: true },
  });
  return res.json(updated);
});

// DELETE /api/equipes/:id
router.delete('/:id', requireRole(Role.GESTIONNAIRE, Role.ENTRAINEUR), async (req, res) => {
  const equipe = await prisma.equipe.findUnique({ where: { id: req.params.id } });
  if (!equipe) return res.status(404).json({ message: 'Équipe introuvable.' });
  if (equipe.clubId !== req.user!.clubId) {
    return res.status(403).json({ message: 'Accès interdit.' });
  }

  if (!(await userIsCoachOfTeam(req.user!.userId, req.user!.clubId!, req.params.id))) {
    return res.status(403).json({ message: 'Vous devez être entraîneur de cette équipe.' });
  }

  await prisma.equipe.delete({ where: { id: req.params.id } });
  return res.json({ message: 'Équipe supprimée.' });
});

// POST /api/equipes/:id/joueurs — assigner un joueur
router.post('/:id/joueurs', requireRole(Role.GESTIONNAIRE, Role.ENTRAINEUR), async (req, res) => {
  const parsed = assignJoueurSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Données invalides.' });
  }

  const equipe = await prisma.equipe.findUnique({ where: { id: req.params.id } });
  if (!equipe) return res.status(404).json({ message: 'Équipe introuvable.' });

  if (!(await userIsCoachOfTeam(req.user!.userId, req.user!.clubId!, req.params.id))) {
    return res.status(403).json({ message: 'Vous devez être entraîneur de cette équipe.' });
  }

  const existing = await prisma.joueurEquipe.findUnique({
    where: { joueurId_equipeId: { joueurId: parsed.data.joueurId, equipeId: req.params.id } },
  });
  if (existing && !existing.dateFin) {
    return res.status(409).json({ message: 'Joueur déjà dans cette équipe.' });
  }

  const record = await prisma.joueurEquipe.upsert({
    where: { joueurId_equipeId: { joueurId: parsed.data.joueurId, equipeId: req.params.id } },
    update: { dateFin: null, dateDebut: new Date() },
    create: { joueurId: parsed.data.joueurId, equipeId: req.params.id },
  });
  return res.status(201).json(record);
});

// DELETE /api/equipes/:id/joueurs/:joueurId — retirer un joueur
router.delete('/:id/joueurs/:joueurId', requireRole(Role.GESTIONNAIRE, Role.ENTRAINEUR), async (req, res) => {
  if (!(await userIsCoachOfTeam(req.user!.userId, req.user!.clubId!, req.params.id))) {
    return res.status(403).json({ message: 'Vous devez être entraîneur de cette équipe.' });
  }

  await prisma.joueurEquipe.update({
    where: { joueurId_equipeId: { joueurId: req.params.joueurId, equipeId: req.params.id } },
    data: { dateFin: new Date() },
  });
  return res.json({ message: "Joueur retiré de l'équipe." });
});

// POST /api/equipes/:id/entraineurs — assigner un entraineur
router.post('/:id/entraineurs', requireRole(Role.GESTIONNAIRE, Role.ENTRAINEUR), async (req, res) => {
  const parsed = assignEntraineurSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Données invalides.' });

  const equipe = await prisma.equipe.findUnique({
    where: { id: req.params.id },
    include: { _count: { select: { entraineurs: true } } },
  });
  if (!equipe) return res.status(404).json({ message: 'Équipe introuvable.' });

  const me = await findMyEntraineurRecord(req.user!.userId, req.user!.clubId!);

  if (req.user!.role === Role.GESTIONNAIRE) {
    // Self-assign: always allowed (even if team already has coaches, no count restriction)
    if (!me || parsed.data.entraineurId !== me.id) {
      // Adding someone else: must be coach of the team
      if (!me || !(await isCoachOfTeam(me.id, req.params.id))) {
        return res.status(403).json({ message: 'Vous devez être entraîneur de cette équipe.' });
      }
    }
  } else if (req.user!.role === Role.ENTRAINEUR) {
    if (!me) return res.status(403).json({ message: 'Profil entraîneur introuvable.' });

    if (parsed.data.entraineurId === me.id) {
      // ENTRAINEUR self-assign : blocked if team already has a coach
      if (equipe._count.entraineurs > 0) {
        return res.status(403).json({ message: 'Un entraîneur doit vous ajouter à cette équipe.' });
      }
    } else {
      // Adding someone else : requester must already be coach of the team
      if (!(await isCoachOfTeam(me.id, req.params.id))) {
        return res.status(403).json({ message: 'Vous devez être entraîneur de cette équipe.' });
      }
    }
  }

  const record = await prisma.entraineurEquipe.upsert({
    where: { entraineurId_equipeId: { entraineurId: parsed.data.entraineurId, equipeId: req.params.id } },
    update: {},
    create: { entraineurId: parsed.data.entraineurId, equipeId: req.params.id },
  });
  return res.status(201).json(record);
});

// DELETE /api/equipes/:id/entraineurs/:entraineurId
router.delete('/:id/entraineurs/:entraineurId', requireRole(Role.GESTIONNAIRE, Role.ENTRAINEUR), async (req, res) => {
  if (!(await userIsCoachOfTeam(req.user!.userId, req.user!.clubId!, req.params.id))) {
    return res.status(403).json({ message: 'Vous devez être entraîneur de cette équipe.' });
  }

  await prisma.entraineurEquipe.delete({
    where: {
      entraineurId_equipeId: { entraineurId: req.params.entraineurId, equipeId: req.params.id },
    },
  });
  return res.json({ message: "Entraîneur retiré de l'équipe." });
});

export default router;
