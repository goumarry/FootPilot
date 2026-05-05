import { Router } from 'express';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { verifyToken, requireRole } from '../middleware/auth';
import { sendEmailVerificationMail } from '../lib/email';

const router = Router();

const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function generateCode(): string {
  const bytes = randomBytes(6);
  return Array.from(bytes).map((b) => CHARS[b % CHARS.length]).join('');
}

// --- Rate limiting in-memory ---
const IP_MAX = 5;
const IP_WINDOW_MS = 60 * 60 * 1000; // 1 heure
const EMAIL_MAX = 3;
const EMAIL_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

const ipAttempts = new Map<string, number[]>();
const emailAttempts = new Map<string, number[]>();

function isRateLimited(store: Map<string, number[]>, key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (store.get(key) ?? []).filter((t) => now - t < windowMs);
  store.set(key, recent);
  if (recent.length >= max) return true;
  recent.push(now);
  return false;
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
  confirmPassword: z.string().min(1),
  birthDate: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas.',
  path: ['confirmPassword'],
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
  const clientIp = req.ip ?? 'unknown';
  const normalizedEmail = email.toLowerCase();

  // Rate limiting : IP (5/heure) puis email (3/15min)
  if (isRateLimited(ipAttempts, clientIp, IP_MAX, IP_WINDOW_MS)) {
    return res.status(429).json({ message: "Trop de tentatives d'inscription depuis cette adresse IP. Réessayez dans une heure." });
  }
  if (isRateLimited(emailAttempts, normalizedEmail, EMAIL_MAX, EMAIL_WINDOW_MS)) {
    return res.status(429).json({ message: 'Trop de demandes pour cette adresse e-mail. Réessayez dans 15 minutes.' });
  }

  const joinCode = await prisma.joinCode.findUnique({
    where: { code: code.toUpperCase() },
    include: { club: true },
  });
  if (!joinCode) return res.status(404).json({ message: 'Code invalide.' });
  if (joinCode.expiresAt < new Date()) return res.status(410).json({ message: 'Ce code a expiré.' });

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  // Compte vérifié : blocage strict
  if (existing?.emailVerified) {
    return res.status(409).json({ message: 'Un compte vérifié existe déjà avec cette adresse e-mail.' });
  }

  const hashed = await bcrypt.hash(password, 12);

  // Transaction atomique : écrasement éventuel + création du nouveau compte
  const { user, verifToken } = await prisma.$transaction(async (tx) => {
    if (existing) {
      // Compte non vérifié existant : hard-delete des profils puis du user
      // (EmailVerificationToken cascade via onDelete: Cascade)
      await tx.joueur.deleteMany({ where: { userId: existing.id } });
      await tx.entraineur.deleteMany({ where: { userId: existing.id } });
      await tx.user.delete({ where: { id: existing.id } });
    }

    const user = await tx.user.create({
      data: {
        email: normalizedEmail,
        password: hashed,
        firstName,
        lastName,
        role: joinCode.role,
        clubId: joinCode.clubId,
        birthDate: birthDate ? new Date(birthDate) : undefined,
        emailVerified: false,
      },
    });

    if (joinCode.role === Role.JOUEUR) {
      await tx.joueur.create({
        data: { userId: user.id, clubId: joinCode.clubId, birthDate: user.birthDate ?? new Date() },
      });
    }
    if (joinCode.role === Role.ENTRAINEUR) {
      await tx.entraineur.create({
        data: { userId: user.id, clubId: joinCode.clubId },
      });
    }

    await tx.joinCode.update({
      where: { id: joinCode.id },
      data: { usedCount: { increment: 1 } },
    });

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const verif = await tx.emailVerificationToken.create({
      data: { userId: user.id, expiresAt },
    });

    return { user, verifToken: verif.token };
  });

  sendEmailVerificationMail({ to: user.email, firstName: user.firstName, token: verifToken }).catch(() => {});

  const message = existing
    ? 'Inscription mise à jour. Un nouveau lien de confirmation a été envoyé à votre adresse e-mail.'
    : 'Compte créé. Vérifiez votre boîte mail pour activer votre compte.';

  return res.status(201).json({ message });
});

export default router;
