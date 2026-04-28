import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { verifyToken, requireRole } from '../middleware/auth';

const router = Router();
router.use(verifyToken);

const joueurSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  birthDate: z.string(),
  poste: z.enum(['DEF', 'MIL', 'ATT', 'GB']).optional(),
  numeroMaillot: z.number().int().min(1).max(99).optional(),
  photoUrl: z.string().url().optional().or(z.literal('')),
});

// GET /api/joueurs
router.get('/', requireRole(Role.GESTIONNAIRE, Role.ADMIN, Role.ENTRAINEUR), async (req, res) => {
  const clubId = req.user!.clubId;
  if (!clubId && req.user!.role !== Role.ADMIN) {
    return res.status(400).json({ message: 'Club requis.' });
  }

  const joueurs = await prisma.joueur.findMany({
    where: clubId ? { clubId } : {},
    include: {
      equipes: {
        where: { dateFin: null },
        include: { equipe: { select: { id: true, nomEquipe: true } } },
      },
    },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  });
  return res.json(joueurs);
});

// GET /api/joueurs/:id
router.get('/:id', async (req, res) => {
  const joueur = await prisma.joueur.findUnique({
    where: { id: req.params.id },
    include: {
      equipes: {
        where: { dateFin: null },
        include: { equipe: { select: { id: true, nomEquipe: true, categorie: true } } },
      },
    },
  });
  if (!joueur) return res.status(404).json({ message: 'Joueur introuvable.' });
  return res.json(joueur);
});

// POST /api/joueurs
router.post('/', requireRole(Role.GESTIONNAIRE, Role.ADMIN, Role.ENTRAINEUR), async (req, res) => {
  const parsed = joueurSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Données invalides.', errors: parsed.error.flatten() });
  }

  const clubId = req.user!.clubId;
  if (!clubId) return res.status(400).json({ message: 'Club requis.' });

  const joueur = await prisma.joueur.create({
    data: {
      clubId,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      birthDate: new Date(parsed.data.birthDate),
      poste: parsed.data.poste,
      numeroMaillot: parsed.data.numeroMaillot,
      photoUrl: parsed.data.photoUrl || undefined,
    },
  });
  return res.status(201).json(joueur);
});

// PUT /api/joueurs/:id
router.put('/:id', requireRole(Role.GESTIONNAIRE, Role.ADMIN, Role.ENTRAINEUR), async (req, res) => {
  const parsed = joueurSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Données invalides.', errors: parsed.error.flatten() });
  }

  const joueur = await prisma.joueur.findUnique({ where: { id: req.params.id } });
  if (!joueur) return res.status(404).json({ message: 'Joueur introuvable.' });
  if (joueur.clubId !== req.user!.clubId && req.user!.role !== Role.ADMIN) {
    return res.status(403).json({ message: 'Accès interdit.' });
  }

  const { birthDate, ...rest } = parsed.data;
  const updated = await prisma.joueur.update({
    where: { id: req.params.id },
    data: {
      ...rest,
      birthDate: birthDate ? new Date(birthDate) : undefined,
      photoUrl: parsed.data.photoUrl || undefined,
    },
  });
  return res.json(updated);
});

// DELETE /api/joueurs/:id
router.delete('/:id', requireRole(Role.GESTIONNAIRE, Role.ADMIN), async (req, res) => {
  const joueur = await prisma.joueur.findUnique({ where: { id: req.params.id } });
  if (!joueur) return res.status(404).json({ message: 'Joueur introuvable.' });
  if (joueur.clubId !== req.user!.clubId && req.user!.role !== Role.ADMIN) {
    return res.status(403).json({ message: 'Accès interdit.' });
  }

  await prisma.joueur.delete({ where: { id: req.params.id } });
  return res.json({ message: 'Joueur supprimé.' });
});

export default router;
