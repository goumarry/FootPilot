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

// GET /api/equipes
router.get('/', async (req, res) => {
  const clubId = req.user!.clubId;
  if (!clubId) return res.status(400).json({ message: 'Vous devez appartenir à un club.' });

  const where =
    req.user!.role === Role.ENTRAINEUR
      ? {
          clubId,
          entraineurs: { some: { entraineur: { userId: req.user!.userId } } },
        }
      : { clubId };

  const equipes = await prisma.equipe.findMany({
    where,
    include: {
      categorie: { select: { id: true, nom: true } },
      _count: { select: { joueurs: { where: { dateFin: null } }, entraineurs: true } },
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
              photoUrl: true,
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
      },
    },
  });
  if (!equipe) return res.status(404).json({ message: 'Équipe introuvable.' });

  // Normalise les noms joueurs et entraineurs
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

  const equipe = await prisma.equipe.findUnique({ where: { id: req.params.id } });
  if (!equipe) return res.status(404).json({ message: 'Équipe introuvable.' });

  const record = await prisma.entraineurEquipe.upsert({
    where: { entraineurId_equipeId: { entraineurId: parsed.data.entraineurId, equipeId: req.params.id } },
    update: {},
    create: { entraineurId: parsed.data.entraineurId, equipeId: req.params.id },
  });
  return res.status(201).json(record);
});

// DELETE /api/equipes/:id/entraineurs/:entraineurId
router.delete('/:id/entraineurs/:entraineurId', requireRole(Role.GESTIONNAIRE, Role.ENTRAINEUR), async (req, res) => {
  await prisma.entraineurEquipe.delete({
    where: {
      entraineurId_equipeId: { entraineurId: req.params.entraineurId, equipeId: req.params.id },
    },
  });
  return res.json({ message: "Entraîneur retiré de l'équipe." });
});

export default router;
