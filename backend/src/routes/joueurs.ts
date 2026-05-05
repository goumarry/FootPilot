import { Router } from 'express';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { verifyToken, requireRole } from '../middleware/auth';
import { checkClubLimits } from '../middleware/billing';

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

const joueurInclude = {
  user: { select: { firstName: true, lastName: true } },
  equipes: {
    where: { dateFin: null as null },
    include: { equipe: { select: { id: true, nomEquipe: true } } },
  },
} as const;

function flattenJoueur<T extends { user: { firstName: string; lastName: string } }>(j: T) {
  const { user, ...rest } = j;
  return { ...rest, firstName: user.firstName, lastName: user.lastName };
}

// GET /api/joueurs
router.get('/', requireRole(Role.GESTIONNAIRE, Role.ENTRAINEUR), async (req, res) => {
  const clubId = req.user!.clubId;
  if (!clubId) return res.status(400).json({ message: 'Club requis.' });

  const joueurs = await prisma.joueur.findMany({
    where: { clubId },
    include: joueurInclude,
    orderBy: { birthDate: 'asc' },
  });
  return res.json(joueurs.map(flattenJoueur));
});

// GET /api/joueurs/:id
router.get('/:id', async (req, res) => {
  const joueur = await prisma.joueur.findUnique({
    where: { id: req.params.id },
    include: {
      user: { select: { firstName: true, lastName: true } },
      equipes: {
        where: { dateFin: null },
        include: { equipe: { select: { id: true, nomEquipe: true, categorie: true } } },
      },
    },
  });
  if (!joueur) return res.status(404).json({ message: 'Joueur introuvable.' });
  return res.json(flattenJoueur(joueur));
});

// POST /api/joueurs — ajout manuel : crée un utilisateur stub (isManual) lié au joueur
router.post('/', requireRole(Role.GESTIONNAIRE, Role.ENTRAINEUR), checkClubLimits('joueurs'), async (req, res) => {
  const parsed = joueurSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Données invalides.', errors: parsed.error.flatten() });
  }

  const clubId = req.user!.clubId;
  if (!clubId) return res.status(400).json({ message: 'Club requis.' });

  const { firstName, lastName, birthDate, poste, numeroMaillot, photoUrl } = parsed.data;

  const joueur = await prisma.$transaction(async (tx) => {
    const stubUser = await tx.user.create({
      data: {
        email: `stub-${randomBytes(16).toString('hex')}@footpilot.internal`,
        password: '*',
        firstName,
        lastName,
        role: Role.JOUEUR,
        clubId,
        emailVerified: false,
        isActive: false,
        isManual: true,
      },
    });

    return tx.joueur.create({
      data: {
        userId: stubUser.id,
        clubId,
        birthDate: new Date(birthDate),
        poste,
        numeroMaillot,
        photoUrl: photoUrl || undefined,
      },
    });
  });

  return res.status(201).json({ ...joueur, firstName, lastName });
});

// PUT /api/joueurs/:id — les noms sont mis à jour sur User (source de vérité unique)
router.put('/:id', requireRole(Role.GESTIONNAIRE, Role.ENTRAINEUR), async (req, res) => {
  const parsed = joueurSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Données invalides.', errors: parsed.error.flatten() });
  }

  const joueur = await prisma.joueur.findUnique({
    where: { id: req.params.id },
    select: { clubId: true, userId: true },
  });
  if (!joueur) return res.status(404).json({ message: 'Joueur introuvable.' });
  if (joueur.clubId !== req.user!.clubId) {
    return res.status(403).json({ message: 'Accès interdit.' });
  }

  const { firstName, lastName, birthDate, poste, numeroMaillot, photoUrl } = parsed.data;

  const updated = await prisma.$transaction(async (tx) => {
    if (firstName !== undefined || lastName !== undefined) {
      await tx.user.update({
        where: { id: joueur.userId },
        data: {
          ...(firstName !== undefined && { firstName }),
          ...(lastName !== undefined && { lastName }),
        },
      });
    }

    return tx.joueur.update({
      where: { id: req.params.id },
      data: {
        birthDate: birthDate ? new Date(birthDate) : undefined,
        poste,
        numeroMaillot,
        photoUrl: photoUrl || undefined,
      },
      include: { user: { select: { firstName: true, lastName: true } } },
    });
  });

  return res.json(flattenJoueur(updated));
});

// DELETE /api/joueurs/:id — supprime aussi le stub User si isManual
router.delete('/:id', requireRole(Role.GESTIONNAIRE, Role.ENTRAINEUR), async (req, res) => {
  const joueur = await prisma.joueur.findUnique({
    where: { id: req.params.id },
    include: { user: { select: { id: true, isManual: true } } },
  });
  if (!joueur) return res.status(404).json({ message: 'Joueur introuvable.' });
  if (joueur.clubId !== req.user!.clubId) {
    return res.status(403).json({ message: 'Accès interdit.' });
  }

  await prisma.$transaction(async (tx) => {
    await tx.joueur.delete({ where: { id: req.params.id } });
    if (joueur.user.isManual) {
      await tx.user.delete({ where: { id: joueur.userId } });
    }
  });

  return res.json({ message: 'Joueur supprimé.' });
});

export default router;
