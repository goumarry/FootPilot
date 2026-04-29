import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { verifyToken, requireRole } from '../middleware/auth';

const router = Router();
router.use(verifyToken);

const categorieSchema = z.object({
  nom: z.string().min(1).max(50),
});

// GET /api/categories?clubId=
router.get('/', async (req, res) => {
  const clubId = (req.query.clubId as string) ?? req.user!.clubId;
  if (!clubId) return res.status(400).json({ message: 'clubId requis.' });

  const categories = await prisma.categorie.findMany({
    where: { clubId },
    include: { _count: { select: { equipes: true } } },
    orderBy: { nom: 'asc' },
  });
  return res.json(categories);
});

// POST /api/categories
router.post('/', requireRole(Role.GESTIONNAIRE, Role.ENTRAINEUR), async (req, res) => {
  const parsed = categorieSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Données invalides.', errors: parsed.error.flatten() });
  }

  const clubId = req.user!.clubId;
  if (!clubId) return res.status(400).json({ message: 'Vous devez appartenir à un club.' });

  const existing = await prisma.categorie.findFirst({
    where: { clubId, nom: parsed.data.nom },
  });
  if (existing) return res.status(409).json({ message: 'Cette catégorie existe déjà.' });

  const categorie = await prisma.categorie.create({
    data: { clubId, nom: parsed.data.nom },
  });
  return res.status(201).json(categorie);
});

// PUT /api/categories/:id
router.put('/:id', requireRole(Role.GESTIONNAIRE, Role.ENTRAINEUR), async (req, res) => {
  const parsed = categorieSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Données invalides.', errors: parsed.error.flatten() });
  }

  const cat = await prisma.categorie.findUnique({ where: { id: req.params.id } });
  if (!cat) return res.status(404).json({ message: 'Catégorie introuvable.' });
  if (cat.clubId !== req.user!.clubId) {
    return res.status(403).json({ message: 'Accès interdit.' });
  }

  const updated = await prisma.categorie.update({
    where: { id: req.params.id },
    data: { nom: parsed.data.nom },
  });
  return res.json(updated);
});

// DELETE /api/categories/:id
router.delete('/:id', requireRole(Role.GESTIONNAIRE, Role.ENTRAINEUR), async (req, res) => {
  const cat = await prisma.categorie.findUnique({
    where: { id: req.params.id },
    include: { _count: { select: { equipes: true } } },
  });
  if (!cat) return res.status(404).json({ message: 'Catégorie introuvable.' });
  if (cat.clubId !== req.user!.clubId) {
    return res.status(403).json({ message: 'Accès interdit.' });
  }
  if (cat._count.equipes > 0) {
    return res.status(409).json({ message: 'Impossible de supprimer une catégorie avec des équipes.' });
  }

  await prisma.categorie.delete({ where: { id: req.params.id } });
  return res.json({ message: 'Catégorie supprimée.' });
});

export default router;
