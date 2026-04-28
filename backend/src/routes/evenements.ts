import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { verifyToken, requireRole } from '../middleware/auth';

const router = Router();
router.use(verifyToken);

const evenementBaseSchema = z.object({
  type: z.enum(['MATCH', 'ENTRAINEMENT']),
  equipeId: z.string(),
  dateHeure: z.string(),
  lieu: z.string().max(255).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  description: z.string().optional(),
});

const matchSchema = evenementBaseSchema.extend({
  type: z.literal('MATCH'),
  equipesDomId: z.string(),
  equipesExtId: z.string(),
  placesCovoiturage: z.number().int().min(0).optional(),
});

const entrainementSchema = evenementBaseSchema.extend({
  type: z.literal('ENTRAINEMENT'),
  categorieId: z.string().optional(),
});

const eventCreateSchema = z.discriminatedUnion('type', [matchSchema, entrainementSchema]);

// GET /api/evenements
router.get('/', async (req, res) => {
  const { equipeId, from, to } = req.query as Record<string, string | undefined>;
  const clubId = req.user!.clubId;

  let equipeFilter: string | undefined;

  if (equipeId) {
    equipeFilter = equipeId;
  } else if (req.user!.role === Role.JOUEUR) {
    // Joueur : ne voit que ses équipes
    const joueur = await prisma.joueur.findFirst({
      where: { userId: req.user!.userId },
      include: { equipes: { where: { dateFin: null }, select: { equipeId: true } } },
    });
    if (!joueur) return res.json([]);
    const ids = joueur.equipes.map((e) => e.equipeId);
    if (ids.length === 0) return res.json([]);

    const evenements = await prisma.evenement.findMany({
      where: {
        equipeId: { in: ids },
        ...(from && { dateHeure: { gte: new Date(from) } }),
        ...(to && { dateHeure: { lte: new Date(to) } }),
      },
      include: {
        equipe: { select: { id: true, nomEquipe: true, categorie: { select: { nom: true } } } },
        match: true,
        entrainement: true,
      },
      orderBy: { dateHeure: 'asc' },
    });
    return res.json(evenements);
  } else if (req.user!.role === Role.ENTRAINEUR) {
    // Entraîneur : voit ses équipes
    const entraineur = await prisma.entraineur.findFirst({
      where: { userId: req.user!.userId },
      include: { equipes: { select: { equipeId: true } } },
    });
    const ids = entraineur?.equipes.map((e) => e.equipeId) ?? [];

    const evenements = await prisma.evenement.findMany({
      where: {
        equipeId: { in: ids },
        ...(from && { dateHeure: { gte: new Date(from) } }),
        ...(to && { dateHeure: { lte: new Date(to) } }),
      },
      include: {
        equipe: { select: { id: true, nomEquipe: true, categorie: { select: { nom: true } } } },
        match: true,
        entrainement: true,
      },
      orderBy: { dateHeure: 'asc' },
    });
    return res.json(evenements);
  }

  // GESTIONNAIRE / ADMIN : tout le club
  const evenements = await prisma.evenement.findMany({
    where: {
      equipe: clubId ? { clubId } : {},
      ...(equipeFilter && { equipeId: equipeFilter }),
      ...(from && { dateHeure: { gte: new Date(from) } }),
      ...(to && { dateHeure: { lte: new Date(to) } }),
    },
    include: {
      equipe: { select: { id: true, nomEquipe: true, categorie: { select: { nom: true } } } },
      match: true,
      entrainement: true,
    },
    orderBy: { dateHeure: 'asc' },
  });
  return res.json(evenements);
});

// GET /api/evenements/:id
router.get('/:id', async (req, res) => {
  const evenement = await prisma.evenement.findUnique({
    where: { id: req.params.id },
    include: {
      equipe: { select: { id: true, nomEquipe: true, categorie: true } },
      match: {
        include: {
          equipeDom: { select: { id: true, nomEquipe: true } },
          equipeExt: { select: { id: true, nomEquipe: true } },
          buts: {
            include: {
              buteur: { select: { id: true, firstName: true, lastName: true } },
              passeur: { select: { id: true, firstName: true, lastName: true } },
            },
          },
          convocations: {
            include: {
              joueur: { select: { id: true, firstName: true, lastName: true, photoUrl: true } },
            },
          },
        },
      },
      entrainement: {
        include: {
          presences: {
            include: {
              joueur: { select: { id: true, firstName: true, lastName: true, photoUrl: true } },
            },
          },
        },
      },
    },
  });
  if (!evenement) return res.status(404).json({ message: 'Événement introuvable.' });
  return res.json(evenement);
});

// POST /api/evenements
router.post('/', requireRole(Role.GESTIONNAIRE, Role.ADMIN, Role.ENTRAINEUR), async (req, res) => {
  const parsed = eventCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Données invalides.', errors: parsed.error.flatten() });
  }

  const { type, equipeId, dateHeure, lieu, latitude, longitude, description } = parsed.data;

  const evenement = await prisma.$transaction(async (tx) => {
    const ev = await tx.evenement.create({
      data: { type, equipeId, dateHeure: new Date(dateHeure), lieu, latitude, longitude, description },
    });

    if (type === 'MATCH') {
      const d = parsed.data as z.infer<typeof matchSchema>;
      await tx.match.create({
        data: {
          id: ev.id,
          equipesDomId: d.equipesDomId,
          equipesExtId: d.equipesExtId,
          placesCovoiturage: d.placesCovoiturage ?? 0,
        },
      });
    } else {
      const d = parsed.data as z.infer<typeof entrainementSchema>;
      await tx.entrainement.create({
        data: { id: ev.id, categorieId: d.categorieId },
      });
    }

    return tx.evenement.findUnique({
      where: { id: ev.id },
      include: {
        equipe: { select: { id: true, nomEquipe: true } },
        match: true,
        entrainement: true,
      },
    });
  });

  return res.status(201).json(evenement);
});

// PUT /api/evenements/:id
router.put('/:id', requireRole(Role.GESTIONNAIRE, Role.ADMIN, Role.ENTRAINEUR), async (req, res) => {
  const ev = await prisma.evenement.findUnique({ where: { id: req.params.id } });
  if (!ev) return res.status(404).json({ message: 'Événement introuvable.' });

  const updateSchema = z.object({
    dateHeure: z.string().optional(),
    lieu: z.string().max(255).optional(),
    description: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    scoreDom: z.number().int().min(0).optional(),
    scoreExt: z.number().int().min(0).optional(),
    statut: z.enum(['AVENIR', 'TERMINE', 'ANNULE']).optional(),
  });

  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Données invalides.', errors: parsed.error.flatten() });
  }

  const { scoreDom, scoreExt, statut, dateHeure, ...rest } = parsed.data;

  await prisma.$transaction(async (tx) => {
    await tx.evenement.update({
      where: { id: req.params.id },
      data: { ...rest, dateHeure: dateHeure ? new Date(dateHeure) : undefined },
    });

    if (ev.type === 'MATCH' && (scoreDom !== undefined || scoreExt !== undefined || statut)) {
      await tx.match.update({
        where: { id: req.params.id },
        data: { scoreDom, scoreExt, statut },
      });
    }
  });

  const updated = await prisma.evenement.findUnique({
    where: { id: req.params.id },
    include: { match: true, entrainement: true },
  });
  return res.json(updated);
});

// DELETE /api/evenements/:id
router.delete('/:id', requireRole(Role.GESTIONNAIRE, Role.ADMIN, Role.ENTRAINEUR), async (req, res) => {
  const ev = await prisma.evenement.findUnique({ where: { id: req.params.id } });
  if (!ev) return res.status(404).json({ message: 'Événement introuvable.' });

  await prisma.evenement.delete({ where: { id: req.params.id } });
  return res.json({ message: 'Événement supprimé.' });
});

export default router;
