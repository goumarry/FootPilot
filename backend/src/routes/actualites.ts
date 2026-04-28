import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { verifyToken, requireRole } from '../middleware/auth';
import { sendActualiteEmail } from '../lib/email';

const router = Router();
router.use(verifyToken);

const actualiteSchema = z.object({
  titre: z.string().min(1).max(255),
  contenu: z.string().min(1),
  equipeId: z.string().optional(),
});

// GET /api/actualites
router.get('/', async (req, res) => {
  const clubId = req.user!.clubId;
  if (!clubId) return res.status(400).json({ message: 'Club requis.' });

  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = 20;

  const [total, actualites] = await prisma.$transaction([
    prisma.actualite.count({ where: { clubId } }),
    prisma.actualite.findMany({
      where: { clubId },
      include: {
        auteur: { select: { id: true, firstName: true, lastName: true, profilePic: true } },
        equipe: { select: { id: true, nomEquipe: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return res.json({ data: actualites, total, page, totalPages: Math.ceil(total / limit) });
});

// POST /api/actualites
router.post('/', requireRole(Role.GESTIONNAIRE, Role.ADMIN, Role.ENTRAINEUR), async (req, res) => {
  const parsed = actualiteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Données invalides.', errors: parsed.error.flatten() });
  }

  const clubId = req.user!.clubId;
  if (!clubId) return res.status(400).json({ message: 'Club requis.' });

  const actualite = await prisma.actualite.create({
    data: {
      auteurId: req.user!.userId,
      clubId,
      titre: parsed.data.titre,
      contenu: parsed.data.contenu,
      equipeId: parsed.data.equipeId,
    },
    include: {
      auteur: { select: { firstName: true, lastName: true } },
      club: { select: { nom: true } },
    },
  });

  // Envoi email async (ne bloque pas la réponse)
  prisma.user.findMany({
    where: { clubId, isActive: true, email: { not: '' } },
    select: { email: true },
  }).then((users) => {
    const emails = users.map((u) => u.email).filter(Boolean);
    sendActualiteEmail({
      to: emails,
      clubNom: actualite.club.nom,
      titre: actualite.titre,
      contenu: actualite.contenu,
      auteur: `${actualite.auteur.firstName} ${actualite.auteur.lastName}`,
    }).catch(() => {}); // silently ignore email errors
  });

  return res.status(201).json(actualite);
});

// DELETE /api/actualites/:id
router.delete('/:id', requireRole(Role.GESTIONNAIRE, Role.ADMIN), async (req, res) => {
  const actu = await prisma.actualite.findUnique({ where: { id: req.params.id } });
  if (!actu) return res.status(404).json({ message: 'Actualité introuvable.' });
  if (actu.clubId !== req.user!.clubId && req.user!.role !== Role.ADMIN) {
    return res.status(403).json({ message: 'Accès interdit.' });
  }
  await prisma.actualite.delete({ where: { id: req.params.id } });
  return res.json({ message: 'Actualité supprimée.' });
});

export default router;
