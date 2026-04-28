import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { verifyToken, requireRole } from '../middleware/auth';

const router = Router();
router.use(verifyToken);

const presenceSchema = z.object({
  presences: z.array(
    z.object({
      joueurId: z.string(),
      statut: z.enum(['PRESENT', 'ABSENT_JUSTIFIE', 'ABSENT_NON_JUSTIFIE', 'RETARD']),
      commentaire: z.string().optional(),
    })
  ),
});

// POST /api/entrainements/:id/appel
router.post('/:id/appel', requireRole(Role.GESTIONNAIRE, Role.ADMIN, Role.ENTRAINEUR), async (req, res) => {
  const parsed = presenceSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Données invalides.', errors: parsed.error.flatten() });
  }

  const entrainement = await prisma.entrainement.findUnique({ where: { id: req.params.id } });
  if (!entrainement) return res.status(404).json({ message: 'Entraînement introuvable.' });

  const records = await prisma.$transaction(
    parsed.data.presences.map((p) =>
      prisma.presenceEntrainement.upsert({
        where: {
          entrainementId_joueurId: { entrainementId: req.params.id, joueurId: p.joueurId },
        },
        update: { statut: p.statut, commentaire: p.commentaire },
        create: { entrainementId: req.params.id, joueurId: p.joueurId, statut: p.statut, commentaire: p.commentaire },
      })
    )
  );
  return res.status(201).json(records);
});

// GET /api/entrainements/:id/appel
router.get('/:id/appel', async (req, res) => {
  const presences = await prisma.presenceEntrainement.findMany({
    where: { entrainementId: req.params.id },
    include: {
      joueur: { select: { id: true, firstName: true, lastName: true, photoUrl: true } },
    },
  });
  return res.json(presences);
});

export default router;
