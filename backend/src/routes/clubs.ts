import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { verifyToken, requireRole } from '../middleware/auth';
import { upload, processImage } from '../lib/upload';

const router = Router();
router.use(verifyToken);

const updateClubSchema = z.object({
  nom: z.string().min(2).max(100).optional(),
  ville: z.string().min(2).max(100).optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
  description: z.string().max(1000).optional(),
});

// GET /api/clubs/:id
router.get('/:id', async (req, res) => {
  const club = await prisma.club.findUnique({
    where: { id: req.params.id },
    include: {
      _count: {
        select: { categories: true, equipes: true, joueurs: true, users: true },
      },
    },
  });
  if (!club) return res.status(404).json({ message: 'Club introuvable.' });
  return res.json(club);
});

// PUT /api/clubs/:id — GESTIONNAIRE du club uniquement
router.put('/:id', requireRole(Role.GESTIONNAIRE), async (req, res) => {
  if (req.user!.clubId !== req.params.id) {
    return res.status(403).json({ message: 'Accès interdit à ce club.' });
  }

  const parsed = updateClubSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Données invalides.', errors: parsed.error.flatten() });
  }

  const club = await prisma.club.update({
    where: { id: req.params.id },
    data: {
      ...parsed.data,
      logoUrl: parsed.data.logoUrl || undefined,
    },
  });
  return res.json(club);
});

// POST /api/clubs/:id/logo — GESTIONNAIRE uniquement
router.post('/:id/logo', requireRole(Role.GESTIONNAIRE), upload.single('logo'), async (req, res) => {
  if (req.user!.clubId !== req.params.id) {
    return res.status(403).json({ message: 'Accès interdit à ce club.' });
  }
  if (!req.file) return res.status(400).json({ message: 'Fichier requis.' });

  try {
    const { data, mimeType, size } = await processImage(req.file.buffer, 400, 400);
    const image = await prisma.image.create({ data: { data, mimeType, size } });
    const logoUrl = `/api/images/${image.id}`;
    const club = await prisma.club.update({
      where: { id: req.params.id },
      data: { logoUrl },
    });
    return res.json({ logoUrl: club.logoUrl });
  } catch {
    return res.status(422).json({ message: "Impossible de traiter l'image." });
  }
});

// GET /api/clubs/:id/membres
router.get('/:id/membres', requireRole(Role.GESTIONNAIRE, Role.ENTRAINEUR), async (req, res) => {
  if (req.user!.clubId !== req.params.id) {
    return res.status(403).json({ message: 'Accès interdit à ce club.' });
  }

  const users = await prisma.user.findMany({
    where: { clubId: req.params.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  return res.json(users);
});

export default router;
