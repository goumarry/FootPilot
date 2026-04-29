import { Router } from 'express';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { verifyToken, requireRole } from '../middleware/auth';

const router = Router();

const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function generateCode(): string {
  const bytes = randomBytes(6);
  return Array.from(bytes).map((b) => CHARS[b % CHARS.length]).join('');
}

function signToken(userId: string, role: string, clubId?: string | null) {
  return jwt.sign(
    { userId, role, clubId: clubId ?? undefined },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' },
  );
}

const createSchema = z.object({
  role: z.enum([Role.ENTRAINEUR, Role.JOUEUR]),
  expiresInHours: z.number().int().min(1).max(168).default(24),
});

const useSchema = z.object({
  code: z.string().length(6),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  email: z.string().email(),
  password: z.string().min(8),
  birthDate: z.string().optional(),
});

// POST /api/join-codes — créer un code (GESTIONNAIRE ou ENTRAINEUR)
router.post('/', verifyToken, requireRole(Role.GESTIONNAIRE, Role.ENTRAINEUR), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Données invalides.', errors: parsed.error.flatten() });
  }
  const clubId = req.user!.clubId;
  if (!clubId) return res.status(400).json({ message: 'Club requis.' });

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + parsed.data.expiresInHours);

  const joinCode = await prisma.joinCode.create({
    data: {
      code: generateCode(),
      role: parsed.data.role,
      clubId,
      createdBy: req.user!.userId,
      expiresAt,
    },
    include: { creator: { select: { firstName: true, lastName: true } } },
  });
  return res.status(201).json(joinCode);
});

// GET /api/join-codes — lister les codes du club
router.get('/', verifyToken, requireRole(Role.GESTIONNAIRE, Role.ENTRAINEUR), async (req, res) => {
  const clubId = req.user!.clubId;
  const codes = await prisma.joinCode.findMany({
    where: { clubId: clubId ?? undefined },
    orderBy: { createdAt: 'desc' },
    include: { creator: { select: { firstName: true, lastName: true } } },
  });
  return res.json(codes);
});

// DELETE /api/join-codes/:id
router.delete('/:id', verifyToken, requireRole(Role.GESTIONNAIRE, Role.ENTRAINEUR), async (req, res) => {
  const code = await prisma.joinCode.findUnique({ where: { id: req.params.id } });
  if (!code) return res.status(404).json({ message: 'Code introuvable.' });
  if (code.clubId !== req.user!.clubId) return res.status(403).json({ message: 'Accès interdit.' });

  await prisma.joinCode.delete({ where: { id: req.params.id } });
  return res.json({ message: 'Code supprimé.' });
});

// GET /api/join-codes/validate/:code — public, valide le code
router.get('/validate/:code', async (req, res) => {
  const joinCode = await prisma.joinCode.findUnique({
    where: { code: req.params.code.toUpperCase() },
    include: { club: { select: { nom: true } } },
  });

  if (!joinCode) return res.status(404).json({ message: 'Code invalide.' });
  if (joinCode.expiresAt < new Date()) return res.status(410).json({ message: 'Ce code a expiré.' });

  return res.json({
    role: joinCode.role,
    clubNom: joinCode.club.nom,
    expiresAt: joinCode.expiresAt,
  });
});

// POST /api/join-codes/use — public, rejoindre avec un code
router.post('/use', async (req, res) => {
  const parsed = useSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Données invalides.', errors: parsed.error.flatten() });
  }

  const { code, firstName, lastName, email, password, birthDate } = parsed.data;

  const joinCode = await prisma.joinCode.findUnique({
    where: { code: code.toUpperCase() },
    include: { club: true },
  });
  if (!joinCode) return res.status(404).json({ message: 'Code invalide.' });
  if (joinCode.expiresAt < new Date()) return res.status(410).json({ message: 'Ce code a expiré.' });

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) return res.status(409).json({ message: 'Un compte avec cet email existe déjà.' });

  const hashed = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      password: hashed,
      firstName,
      lastName,
      role: joinCode.role,
      clubId: joinCode.clubId,
      birthDate: birthDate ? new Date(birthDate) : undefined,
    },
  });

  if (joinCode.role === Role.JOUEUR) {
    await prisma.joueur.create({
      data: { userId: user.id, clubId: joinCode.clubId, birthDate: user.birthDate ?? new Date() },
    });
  }
  if (joinCode.role === Role.ENTRAINEUR) {
    await prisma.entraineur.create({
      data: { userId: user.id, clubId: joinCode.clubId },
    });
  }

  await prisma.joinCode.update({
    where: { id: joinCode.id },
    data: { usedCount: { increment: 1 } },
  });

  const token = signToken(user.id, user.role, user.clubId);
  return res.status(201).json({
    token,
    user: {
      id: user.id, email: user.email, firstName: user.firstName,
      lastName: user.lastName, role: user.role, clubId: user.clubId,
    },
  });
});

export default router;
