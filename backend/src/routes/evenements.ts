import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { verifyToken, requireRole } from '../middleware/auth';

const router = Router();
router.use(verifyToken);

// ── Schemas ───────────────────────────────────────────────────────────────────

const evenementBaseSchema = z.object({
  type: z.enum(['MATCH', 'ENTRAINEMENT']),
  equipeId: z.string(),
  dateHeure: z.string(),
  duree: z.number().int().min(15).max(480).optional(),
  lieu: z.string().max(255).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  description: z.string().optional(),
});

const matchSchema = evenementBaseSchema.extend({
  type: z.literal('MATCH'),
  adversaire: z.string().min(1).max(100),
  placesCovoiturage: z.number().int().min(0).optional(),
});

const entrainementSchema = evenementBaseSchema.extend({
  type: z.literal('ENTRAINEMENT'),
  categorieId: z.string().optional(),
});

const eventCreateSchema = z.discriminatedUnion('type', [matchSchema, entrainementSchema]);

const butSchema = z.object({
  buteurId: z.string(),
  passeurId: z.string().optional(),
  minute: z.number().int().min(1).max(150).optional(),
  zoneTir: z.enum(['TETE', 'PIED_GAUCHE', 'PIED_DROIT']).optional(),
  circonstance: z.enum(['JEU_OUVERT', 'COUP_FRANC', 'PENALTY']).optional(),
  estCSC: z.boolean().default(false),
});

const scoreSchema = z.object({
  scoreDom: z.number().int().min(0),
  scoreExt: z.number().int().min(0),
  statut: z.enum(['AVENIR', 'TERMINE', 'ANNULE']).optional(),
});

const appelSchema = z.object({
  presences: z.array(z.object({
    joueurId: z.string(),
    statut: z.enum(['PRESENT', 'ABSENT_JUSTIFIE', 'ABSENT_NON_JUSTIFIE', 'RETARD', 'BLESSE']),
    note: z.number().int().min(1).max(5).optional().nullable(),
    buts: z.number().int().min(0).optional().nullable(),
    commentaire: z.string().optional(),
  })),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

type JoueurRaw = {
  id: string;
  photoUrl?: string | null;
  user: { firstName: string; lastName: string };
};

function normalizeJoueur<T extends JoueurRaw>(j: T) {
  const { user: _user, ...rest } = j as T & { user: unknown };
  return {
    ...(rest as Omit<T, 'user'>),
    firstName: j.user.firstName,
    lastName: j.user.lastName,
  };
}

const joueurSelect = {
  id: true,
  photoUrl: true,
  user: { select: { firstName: true, lastName: true } },
} as const;

const butInclude = {
  buteur: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
  passeur: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
} as const;

function isEventPast(ev: { dateHeure: Date; duree: number }): boolean {
  return Date.now() > new Date(ev.dateHeure).getTime() + ev.duree * 60000;
}

async function checkCoachAccess(userId: string, equipeId: string): Promise<boolean> {
  const entraineur = await prisma.entraineur.findFirst({ where: { userId } });
  if (!entraineur) return false;
  const record = await prisma.entraineurEquipe.findUnique({
    where: { entraineurId_equipeId: { entraineurId: entraineur.id, equipeId } },
  });
  return record !== null;
}

// ── GET /api/evenements ───────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  const { equipeId, from, to, type } = req.query as Record<string, string | undefined>;
  const clubId = req.user!.clubId;

  if (req.user!.role === Role.JOUEUR) {
    const joueur = await prisma.joueur.findFirst({
      where: { userId: req.user!.userId },
      include: { equipes: { where: { dateFin: null }, select: { equipeId: true } } },
    });
    if (!joueur) return res.json([]);

    const currentTeamIds = joueur.equipes.map((e) => e.equipeId);

    // Futurs : seulement les événements de l'équipe courante
    // Passés  : tous les événements où le joueur figure dans le snapshot (peu importe l'équipe)
    const allEvenements = await prisma.evenement.findMany({
      where: {
        OR: [
          { equipeId: { in: currentTeamIds } },   // équipe actuelle (peut être vide)
          { presences: { some: { joueurId: joueur.id } } }, // snapshot toutes équipes
        ],
        ...(from && { dateHeure: { gte: new Date(from) } }),
        ...(to && { dateHeure: { lte: new Date(to) } }),
      },
      include: {
        equipe: { select: { id: true, nomEquipe: true, categorie: { select: { nom: true } } } },
        presences: { where: { joueurId: joueur.id }, select: { joueurId: true } },
      },
      orderBy: { dateHeure: 'asc' },
    });

    const now = Date.now();
    const filtered = allEvenements.filter((ev) => {
      const isPast = now >= new Date(ev.dateHeure).getTime() + ev.duree * 60000;
      if (!isPast) return currentTeamIds.includes(ev.equipeId);
      return ev.presences.length > 0;
    });

    const typeFiltered = type ? filtered.filter((ev) => ev.type === type) : filtered;
    return res.json(typeFiltered.map(({ presences: _p, ...ev }) => ev));
  }

  const evenements = await prisma.evenement.findMany({
    where: {
      equipe: clubId ? { clubId } : {},
      ...(equipeId && { equipeId }),
      ...(type && { type: type as 'MATCH' | 'ENTRAINEMENT' }),
      ...(from && { dateHeure: { gte: new Date(from) } }),
      ...(to && { dateHeure: { lte: new Date(to) } }),
    },
    include: {
      equipe: { select: { id: true, nomEquipe: true, categorie: { select: { nom: true } } } },
    },
    orderBy: { dateHeure: 'asc' },
  });
  return res.json(evenements);
});

// ── GET /api/evenements/:id ───────────────────────────────────────────────────

router.get('/:id', async (req, res) => {
  const evenement = await prisma.evenement.findUnique({
    where: { id: req.params.id },
    include: {
      equipe: { select: { id: true, nomEquipe: true, categorie: true } },
      buts: {
        include: butInclude,
        orderBy: { minute: 'asc' },
      },
      presences: {
        include: { joueur: { select: joueurSelect } },
      },
    },
  });
  if (!evenement) return res.status(404).json({ message: 'Événement introuvable.' });

  return res.json({
    ...evenement,
    buts: evenement.buts.map((b) => ({
      ...b,
      buteur: normalizeJoueur(b.buteur),
      passeur: b.passeur ? normalizeJoueur(b.passeur) : null,
    })),
    presences: evenement.presences.map((p) => ({
      ...p,
      joueur: normalizeJoueur(p.joueur),
    })),
  });
});

// ── POST /api/evenements ──────────────────────────────────────────────────────

router.post('/', requireRole(Role.GESTIONNAIRE, Role.ENTRAINEUR), async (req, res) => {
  const parsed = eventCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Données invalides.', errors: parsed.error.flatten() });
  }

  const { type, equipeId, dateHeure, duree, lieu, latitude, longitude, description } = parsed.data;

  if (new Date(dateHeure) <= new Date()) {
    return res.status(400).json({ message: "La date et l'heure de l'événement ne peuvent pas être dans le passé." });
  }

  if (req.user!.role === Role.ENTRAINEUR) {
    if (!(await checkCoachAccess(req.user!.userId, equipeId))) {
      return res.status(403).json({ message: 'Vous devez être entraîneur de cette équipe.' });
    }
  }

  const data: Record<string, unknown> = {
    type, equipeId, dateHeure: new Date(dateHeure),
    duree: duree ?? 120, lieu, latitude, longitude, description,
  };

  if (type === 'MATCH') {
    const d = parsed.data as z.infer<typeof matchSchema>;
    data.adversaire = d.adversaire;
    data.placesCovoiturage = d.placesCovoiturage ?? 0;
    data.statutMatch = 'AVENIR';
  } else {
    const d = parsed.data as z.infer<typeof entrainementSchema>;
    data.categorieId = d.categorieId;
  }

  const evenement = await prisma.evenement.create({
    data: data as Parameters<typeof prisma.evenement.create>[0]['data'],
    include: { equipe: { select: { id: true, nomEquipe: true, categorie: { select: { nom: true } } } } },
  });

  return res.status(201).json(evenement);
});

// ── PUT /api/evenements/:id ───────────────────────────────────────────────────

router.put('/:id', requireRole(Role.GESTIONNAIRE, Role.ENTRAINEUR), async (req, res) => {
  const ev = await prisma.evenement.findUnique({ where: { id: req.params.id } });
  if (!ev) return res.status(404).json({ message: 'Événement introuvable.' });

  if (req.user!.role === Role.ENTRAINEUR) {
    if (!(await checkCoachAccess(req.user!.userId, ev.equipeId))) {
      return res.status(403).json({ message: "Vous n'êtes pas entraîneur de cette équipe." });
    }
  }

  if (isEventPast(ev)) {
    return res.status(403).json({ message: 'Cet événement est terminé et ne peut plus être modifié.' });
  }

  const updateSchema = z.object({
    dateHeure: z.string().optional(),
    duree: z.number().int().min(15).max(480).optional(),
    annule: z.boolean().optional(),
    lieu: z.string().max(255).optional().nullable(),
    description: z.string().optional().nullable(),
    latitude: z.number().optional().nullable(),
    longitude: z.number().optional().nullable(),
    scoreDom: z.number().int().min(0).optional(),
    scoreExt: z.number().int().min(0).optional(),
    statutMatch: z.enum(['AVENIR', 'TERMINE', 'ANNULE']).optional(),
  });

  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Données invalides.', errors: parsed.error.flatten() });
  }

  const { dateHeure, ...rest } = parsed.data;
  const updated = await prisma.evenement.update({
    where: { id: req.params.id },
    data: { ...rest, dateHeure: dateHeure ? new Date(dateHeure) : undefined },
    include: { equipe: { select: { id: true, nomEquipe: true, categorie: { select: { nom: true } } } } },
  });
  return res.json(updated);
});

// ── DELETE /api/evenements/:id ────────────────────────────────────────────────

router.delete('/:id', requireRole(Role.GESTIONNAIRE, Role.ENTRAINEUR), async (req, res) => {
  const ev = await prisma.evenement.findUnique({ where: { id: req.params.id } });
  if (!ev) return res.status(404).json({ message: 'Événement introuvable.' });

  if (req.user!.role === Role.ENTRAINEUR) {
    if (!(await checkCoachAccess(req.user!.userId, ev.equipeId))) {
      return res.status(403).json({ message: "Vous n'êtes pas entraîneur de cette équipe." });
    }
  }

  if (isEventPast(ev)) {
    return res.status(403).json({ message: 'Cet événement est terminé et ne peut plus être supprimé.' });
  }

  await prisma.evenement.delete({ where: { id: req.params.id } });
  return res.json({ message: 'Événement supprimé.' });
});

// ── GET /api/evenements/:id/appel ─────────────────────────────────────────────

router.get('/:id/appel', async (req, res) => {
  const ev = await prisma.evenement.findUnique({
    where: { id: req.params.id },
    select: { id: true, equipeId: true, snapshotPris: true, dateHeure: true, duree: true },
  });
  if (!ev) return res.status(404).json({ message: 'Événement introuvable.' });

  const eventEndDate = new Date(new Date(ev.dateHeure).getTime() + ev.duree * 60000);
  const now = new Date();

  // Cas C — snapshot déjà figé : retourner les présences enregistrées
  if (ev.snapshotPris) {
    const presences = await prisma.presence.findMany({
      where: { evenementId: ev.id },
      include: { joueur: { select: joueurSelect } },
    });
    return res.json(presences.map((p) => ({ ...p, joueur: normalizeJoueur(p.joueur) })));
  }

  // Cas B — événement terminé, première ouverture : figer le snapshot
  if (now >= eventEndDate) {
    const teamMembers = await prisma.joueurEquipe.findMany({
      where: {
        equipeId: ev.equipeId,
        dateDebut: { lte: eventEndDate },
        OR: [{ dateFin: null }, { dateFin: { gt: eventEndDate } }],
      },
      select: { joueurId: true },
    });

    const finalRosterIds = teamMembers.map((je) => je.joueurId);

    await prisma.$transaction([
      // Purge des présences fantômes (joueurs exclus de l'équipe avant la fin de l'événement)
      prisma.presence.deleteMany({
        where: { evenementId: ev.id, joueurId: { notIn: finalRosterIds } },
      }),
      ...teamMembers.map((je) =>
        prisma.presence.upsert({
          where: { evenementId_joueurId: { evenementId: ev.id, joueurId: je.joueurId } },
          update: {},
          create: { evenementId: ev.id, joueurId: je.joueurId, statut: 'PRESENT', note: 3 },
        })
      ),
      prisma.evenement.update({ where: { id: ev.id }, data: { snapshotPris: true } }),
    ]);

    const presences = await prisma.presence.findMany({
      where: { evenementId: ev.id },
      include: { joueur: { select: joueurSelect } },
    });
    return res.json(presences.map((p) => ({ ...p, joueur: normalizeJoueur(p.joueur) })));
  }

  // Cas A — événement en cours ou à venir : liste dynamique
  const liveMembers = await prisma.joueurEquipe.findMany({
    where: {
      equipeId: ev.equipeId,
      dateDebut: { lte: now },
      OR: [{ dateFin: null }, { dateFin: { gt: now } }],
    },
    include: { joueur: { select: joueurSelect } },
  });

  const liveMemberIds = liveMembers.map((je) => je.joueurId);

  // LEFT JOIN sur Presence pour récupérer les stats déjà saisies (live tracking)
  const existingPresences = await prisma.presence.findMany({
    where: { evenementId: ev.id, joueurId: { in: liveMemberIds } },
  });
  const presenceMap = new Map(existingPresences.map((p) => [p.joueurId, p]));

  return res.json(liveMembers.map((je) => {
    const existing = presenceMap.get(je.joueurId);
    return {
      evenementId: ev.id,
      joueurId: je.joueurId,
      statut: existing?.statut ?? ('PRESENT' as const),
      note: existing?.note ?? 3,
      buts: existing?.buts ?? null,
      commentaire: existing?.commentaire ?? null,
      joueur: normalizeJoueur(je.joueur),
    };
  }));
});

// ── POST /api/evenements/:id/appel ────────────────────────────────────────────

router.post('/:id/appel', requireRole(Role.GESTIONNAIRE, Role.ENTRAINEUR), async (req, res) => {
  const parsed = appelSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Données invalides.' });

  const evenement = await prisma.evenement.findUnique({ where: { id: req.params.id } });
  if (!evenement) return res.status(404).json({ message: 'Événement introuvable.' });
  if (evenement.annule) return res.status(403).json({ message: 'Cet événement est annulé.' });

  if (req.user!.role === Role.ENTRAINEUR) {
    if (!(await checkCoachAccess(req.user!.userId, evenement.equipeId))) {
      return res.status(403).json({ message: "Vous n'êtes pas entraîneur de cette équipe." });
    }
  }

  let presencesToSave = parsed.data.presences;

  // Snapshot figé : on ne peut modifier que les joueurs déjà dans la liste
  if (evenement.snapshotPris) {
    const existing = await prisma.presence.findMany({
      where: { evenementId: req.params.id },
      select: { joueurId: true },
    });
    const existingIds = new Set(existing.map((p) => p.joueurId));
    presencesToSave = presencesToSave.filter((p) => existingIds.has(p.joueurId));
  }

  if (presencesToSave.length === 0) return res.status(201).json([]);

  const records = await prisma.$transaction(
    presencesToSave.map((p) =>
      prisma.presence.upsert({
        where: { evenementId_joueurId: { evenementId: req.params.id, joueurId: p.joueurId } },
        update: { statut: p.statut, note: p.note ?? null, buts: p.buts ?? null, commentaire: p.commentaire },
        create: {
          evenementId: req.params.id, joueurId: p.joueurId,
          statut: p.statut, note: p.note ?? null, buts: p.buts ?? null, commentaire: p.commentaire,
        },
      })
    )
  );
  return res.status(201).json(records);
});

// ── PUT /api/evenements/:id/score ─────────────────────────────────────────────

router.put('/:id/score', requireRole(Role.GESTIONNAIRE, Role.ENTRAINEUR), async (req, res) => {
  const parsed = scoreSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Données invalides.', errors: parsed.error.flatten() });
  }

  const ev = await prisma.evenement.findUnique({ where: { id: req.params.id } });
  if (!ev || ev.type !== 'MATCH') return res.status(404).json({ message: 'Match introuvable.' });

  const updated = await prisma.evenement.update({
    where: { id: req.params.id },
    data: {
      scoreDom: parsed.data.scoreDom,
      scoreExt: parsed.data.scoreExt,
      statutMatch: parsed.data.statut ?? 'TERMINE',
    },
  });
  return res.json(updated);
});

// ── GET /api/evenements/:id/buts ──────────────────────────────────────────────

router.get('/:id/buts', async (req, res) => {
  const buts = await prisma.but.findMany({
    where: { evenementId: req.params.id },
    include: butInclude,
    orderBy: { minute: 'asc' },
  });
  return res.json(buts.map((b) => ({
    ...b,
    buteur: normalizeJoueur(b.buteur),
    passeur: b.passeur ? normalizeJoueur(b.passeur) : null,
  })));
});

// ── POST /api/evenements/:id/buts ─────────────────────────────────────────────

router.post('/:id/buts', requireRole(Role.GESTIONNAIRE, Role.ENTRAINEUR), async (req, res) => {
  const parsed = butSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Données invalides.', errors: parsed.error.flatten() });
  }

  const ev = await prisma.evenement.findUnique({ where: { id: req.params.id } });
  if (!ev || ev.type !== 'MATCH') return res.status(404).json({ message: 'Match introuvable.' });

  const but = await prisma.but.create({
    data: { evenementId: req.params.id, ...parsed.data },
    include: butInclude,
  });

  return res.status(201).json({
    ...but,
    buteur: normalizeJoueur(but.buteur),
    passeur: but.passeur ? normalizeJoueur(but.passeur) : null,
  });
});

// ── DELETE /api/evenements/:id/buts/:butId ────────────────────────────────────

router.delete('/:id/buts/:butId', requireRole(Role.GESTIONNAIRE, Role.ENTRAINEUR), async (req, res) => {
  const but = await prisma.but.findUnique({ where: { id: req.params.butId } });
  if (!but || but.evenementId !== req.params.id) return res.status(404).json({ message: 'But introuvable.' });
  await prisma.but.delete({ where: { id: req.params.butId } });
  return res.json({ message: 'But supprimé.' });
});

export default router;
