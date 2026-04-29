import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { verifyToken, requireRole } from '../middleware/auth';

const router = Router();
router.use(verifyToken);

const entraineurUpdateSchema = z.object({
  phone: z.string().max(20).optional(),
  photoUrl: z.string().url().optional().or(z.literal('')),
});

// GET /api/entraineurs
router.get('/', requireRole(Role.GESTIONNAIRE, Role.ENTRAINEUR), async (req, res) => {
  const clubId = req.user!.clubId;

  const entraineurs = await prisma.entraineur.findMany({
    where: clubId ? { clubId } : {},
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
      equipes: {
        include: { equipe: { select: { id: true, nomEquipe: true } } },
      },
    },
    orderBy: { user: { lastName: 'asc' } },
  });
  return res.json(entraineurs);
});

// GET /api/entraineurs/:id
router.get('/:id', async (req, res) => {
  const entraineur = await prisma.entraineur.findUnique({
    where: { id: req.params.id },
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
      equipes: {
        include: { equipe: { select: { id: true, nomEquipe: true, categorie: true } } },
      },
    },
  });
  if (!entraineur) return res.status(404).json({ message: 'Entraîneur introuvable.' });
  return res.json(entraineur);
});

// PUT /api/entraineurs/:id
router.put('/:id', async (req, res) => {
  const parsed = entraineurUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Données invalides.', errors: parsed.error.flatten() });
  }

  const entraineur = await prisma.entraineur.findUnique({ where: { id: req.params.id } });
  if (!entraineur) return res.status(404).json({ message: 'Entraîneur introuvable.' });

  const isOwner = entraineur.userId === req.user!.userId;
  const isManager = req.user!.role === Role.GESTIONNAIRE && entraineur.clubId === req.user!.clubId;
  if (!isOwner && !isManager) return res.status(403).json({ message: 'Accès interdit.' });

  const updated = await prisma.entraineur.update({
    where: { id: req.params.id },
    data: { ...parsed.data, photoUrl: parsed.data.photoUrl || undefined },
    include: { user: { select: { firstName: true, lastName: true, email: true } } },
  });
  return res.json(updated);
});

export default router;
