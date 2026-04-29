import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { verifyToken } from '../middleware/auth';
import { upload, processImage } from '../lib/upload';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const createClubSchema = z.object({
  clubNom: z.string().min(2).max(100),
  clubVille: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
});

const registerSchema = z.object({
  token: z.string(),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  password: z.string().min(8),
  birthDate: z.string().optional(),
});

function signToken(userId: string, role: string, clubId?: string | null) {
  return jwt.sign(
    { userId, role, clubId: clubId ?? undefined },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Données invalides.', errors: parsed.error.flatten() });
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !user.isActive) {
    return res.status(401).json({ message: 'Email ou mot de passe incorrect.' });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ message: 'Email ou mot de passe incorrect.' });
  }

  const token = signToken(user.id, user.role, user.clubId);
  return res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      clubId: user.clubId,
      profilePic: user.profilePic,
    },
  });
});

// POST /api/auth/create-club — public, crée un Club + Gestionnaire
router.post('/create-club', async (req, res) => {
  const parsed = createClubSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Données invalides.', errors: parsed.error.flatten() });
  }

  const { clubNom, clubVille, email, password, firstName, lastName } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    return res.status(409).json({ message: 'Un compte avec cet email existe déjà.' });
  }

  const hashed = await bcrypt.hash(password, 12);

  const { user, club } = await prisma.$transaction(async (tx) => {
    const club = await tx.club.create({
      data: { nom: clubNom, ville: clubVille },
    });
    const user = await tx.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashed,
        firstName,
        lastName,
        role: 'GESTIONNAIRE',
        clubId: club.id,
      },
    });
    return { user, club };
  });

  const token = signToken(user.id, user.role, user.clubId);
  return res.status(201).json({
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      clubId: user.clubId,
    },
    club: { id: club.id, nom: club.nom, ville: club.ville },
  });
});

// GET /api/auth/invitation/:token
router.get('/invitation/:token', async (req, res) => {
  const invitation = await prisma.invitation.findUnique({
    where: { token: req.params.token },
    include: { club: { select: { nom: true } } },
  });

  if (!invitation) return res.status(404).json({ message: "Lien d'invitation invalide." });
  if (invitation.usedAt) return res.status(410).json({ message: "Ce lien a déjà été utilisé." });
  if (invitation.expiresAt < new Date()) return res.status(410).json({ message: "Ce lien a expiré." });

  return res.json({
    email: invitation.email,
    firstName: invitation.firstName,
    lastName: invitation.lastName,
    role: invitation.role,
    clubNom: invitation.club?.nom,
  });
});

// POST /api/auth/register — via token d'invitation
router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Données invalides.', errors: parsed.error.flatten() });
  }

  const { token, firstName, lastName, password, birthDate } = parsed.data;

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { club: true },
  });
  if (!invitation) return res.status(404).json({ message: "Lien d'invitation invalide." });
  if (invitation.usedAt) return res.status(410).json({ message: "Ce lien a déjà été utilisé." });
  if (invitation.expiresAt < new Date()) return res.status(410).json({ message: "Ce lien a expiré." });

  const email = ((req.body.email as string | undefined) || invitation.email || '').toLowerCase();
  if (!email) return res.status(400).json({ message: 'Email requis.' });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ message: 'Un compte avec cet email existe déjà.' });

  const hashed = await bcrypt.hash(password, 12);

  const [user] = await prisma.$transaction([
    prisma.user.create({
      data: {
        email,
        password: hashed,
        firstName,
        lastName,
        role: invitation.role,
        clubId: invitation.clubId ?? undefined,
        birthDate: birthDate ? new Date(birthDate) : undefined,
      },
    }),
    prisma.invitation.update({ where: { token }, data: { usedAt: new Date() } }),
  ]);

  // Le profil joueur est lié au User via userId — firstName/lastName viennent de User
  if (invitation.role === 'JOUEUR' && invitation.clubId) {
    await prisma.joueur.create({
      data: {
        userId: user.id,
        clubId: invitation.clubId,
        birthDate: user.birthDate ?? new Date(),
      },
    });
  }

  // Le profil entraineur est lié au User via userId — firstName/lastName viennent de User
  if (invitation.role === 'ENTRAINEUR' && invitation.clubId) {
    await prisma.entraineur.create({
      data: {
        userId: user.id,
        clubId: invitation.clubId,
      },
    });
  }

  const authToken = signToken(user.id, user.role, user.clubId);
  return res.status(201).json({
    token: authToken,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      clubId: user.clubId,
    },
  });
});

// POST /api/auth/me/profile-pic — upload photo de profil (authentifié)
router.post('/me/profile-pic', verifyToken, upload.single('photo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Fichier requis.' });
  try {
    const { data, mimeType, size } = await processImage(req.file.buffer, 400, 400);
    const image = await prisma.image.create({ data: { data, mimeType, size } });
    const profilePic = `/api/images/${image.id}`;
    await prisma.user.update({
      where: { id: req.user!.userId },
      data: { profilePic },
    });
    return res.json({ profilePic });
  } catch {
    return res.status(422).json({ message: "Impossible de traiter l'image." });
  }
});

// GET /api/auth/me
router.get('/me', verifyToken, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      clubId: true,
      profilePic: true,
      phone: true,
      birthDate: true,
      createdAt: true,
    },
  });
  if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });
  return res.json(user);
});

export default router;
