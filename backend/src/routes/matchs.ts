import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { verifyToken, requireRole } from '../middleware/auth';

const router = Router();
router.use(verifyToken);

type JoueurRaw = { id: string; firstName: string | null; lastName: string | null; user?: { firstName: string; lastName: string } | null };
function joueurNom(j: JoueurRaw) {
  return { id: j.id, firstName: j.user?.firstName ?? j.firstName ?? '', lastName: j.user?.lastName ?? j.lastName ?? '' };
}

const butSchema = z.object({
  buteurId: z.string(),
  passeurId: z.string().optional(),
  minute: z.number().int().min(1).max(150).optional(),
  zoneTir: z.enum(['TETE', 'PIED_GAUCHE', 'PIED_DROIT']).optional(),
  circonstance: z.enum(['JEU_OUVERT', 'COUP_FRANC', 'PENALTY']).optional(),
  estCSC: z.boolean().default(false),
});

const convocationSchema = z.object({
  joueurIds: z.array(z.string()).min(1),
});

const scoreSchema = z.object({
  scoreDom: z.number().int().min(0),
  scoreExt: z.number().int().min(0),
  statut: z.enum(['AVENIR', 'TERMINE', 'ANNULE']).optional(),
});

const butInclude = {
  buteur: { select: { id: true, firstName: true, lastName: true, user: { select: { firstName: true, lastName: true } } } },
  passeur: { select: { id: true, firstName: true, lastName: true, user: { select: { firstName: true, lastName: true } } } },
} as const;

// POST /api/matchs/:id/buts
router.post('/:id/buts', requireRole(Role.GESTIONNAIRE, Role.ENTRAINEUR), async (req, res) => {
  const parsed = butSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Données invalides.', errors: parsed.error.flatten() });
  }

  const match = await prisma.match.findUnique({ where: { id: req.params.id } });
  if (!match) return res.status(404).json({ message: 'Match introuvable.' });

  const but = await prisma.but.create({
    data: { matchId: req.params.id, ...parsed.data },
    include: butInclude,
  });

  return res.status(201).json({
    ...but,
    buteur: joueurNom(but.buteur),
    passeur: but.passeur ? joueurNom(but.passeur) : null,
  });
});

// DELETE /api/matchs/:id/buts/:butId
router.delete('/:id/buts/:butId', requireRole(Role.GESTIONNAIRE, Role.ENTRAINEUR), async (req, res) => {
  const but = await prisma.but.findUnique({ where: { id: req.params.butId } });
  if (!but || but.matchId !== req.params.id) return res.status(404).json({ message: 'But introuvable.' });
  await prisma.but.delete({ where: { id: req.params.butId } });
  return res.json({ message: 'But supprimé.' });
});

// GET /api/matchs/:id/buts
router.get('/:id/buts', async (req, res) => {
  const buts = await prisma.but.findMany({
    where: { matchId: req.params.id },
    include: butInclude,
    orderBy: { minute: 'asc' },
  });
  return res.json(buts.map((b) => ({
    ...b,
    buteur: joueurNom(b.buteur),
    passeur: b.passeur ? joueurNom(b.passeur) : null,
  })));
});

// PUT /api/matchs/:id/score
router.put('/:id/score', requireRole(Role.GESTIONNAIRE, Role.ENTRAINEUR), async (req, res) => {
  const parsed = scoreSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Données invalides.', errors: parsed.error.flatten() });
  }

  const match = await prisma.match.findUnique({ where: { id: req.params.id } });
  if (!match) return res.status(404).json({ message: 'Match introuvable.' });

  const updated = await prisma.match.update({
    where: { id: req.params.id },
    data: {
      scoreDom: parsed.data.scoreDom,
      scoreExt: parsed.data.scoreExt,
      statut: parsed.data.statut ?? 'TERMINE',
    },
  });
  return res.json(updated);
});

// POST /api/matchs/:id/convocations
router.post('/:id/convocations', requireRole(Role.GESTIONNAIRE, Role.ENTRAINEUR), async (req, res) => {
  const parsed = convocationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Données invalides.', errors: parsed.error.flatten() });
  }

  const match = await prisma.match.findUnique({ where: { id: req.params.id } });
  if (!match) return res.status(404).json({ message: 'Match introuvable.' });

  const records = await prisma.$transaction(
    parsed.data.joueurIds.map((joueurId) =>
      prisma.convocationMatch.upsert({
        where: { matchId_joueurId: { matchId: req.params.id, joueurId } },
        update: {},
        create: { matchId: req.params.id, joueurId },
      })
    )
  );
  return res.status(201).json(records);
});

// GET /api/matchs/:id/convocations
router.get('/:id/convocations', async (req, res) => {
  const convocations = await prisma.convocationMatch.findMany({
    where: { matchId: req.params.id },
    include: {
      joueur: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          poste: true,
          photoUrl: true,
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });
  return res.json(convocations.map((c) => ({
    ...c,
    joueur: {
      ...c.joueur,
      firstName: c.joueur.user?.firstName ?? c.joueur.firstName ?? '',
      lastName: c.joueur.user?.lastName ?? c.joueur.lastName ?? '',
      user: undefined,
    },
  })));
});

// PUT /api/matchs/:matchId/convocations/:joueurId
router.put('/:matchId/convocations/:joueurId', requireRole(Role.GESTIONNAIRE, Role.ENTRAINEUR), async (req, res) => {
  const schema = z.object({
    note: z.number().int().min(1).max(10).optional(),
    commentaire: z.string().optional(),
    estAccompagnateur: z.boolean().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Données invalides.' });

  const updated = await prisma.convocationMatch.update({
    where: {
      matchId_joueurId: { matchId: req.params.matchId, joueurId: req.params.joueurId },
    },
    data: parsed.data,
  });
  return res.json(updated);
});

export default router;
