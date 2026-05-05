import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { verifyToken, requireRole } from '../middleware/auth';
import { sendInvitationEmail } from '../lib/email';

const router = Router();
router.use(verifyToken);
router.use(requireRole(Role.GESTIONNAIRE, Role.ENTRAINEUR));

async function isClubOwner(userId: string, clubId: string): Promise<boolean> {
  const club = await prisma.club.findUnique({ where: { id: clubId }, select: { idOwner: true } });
  return club?.idOwner === userId;
}

const inviteSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  role: z.enum([Role.ENTRAINEUR, Role.JOUEUR, Role.GESTIONNAIRE]),
  expiresInDays: z.number().int().min(1).max(30).default(7),
});

// POST /api/gestionnaire/invitations
router.post('/invitations', async (req, res) => {
  const parsed = inviteSchema.safeParse(req.body);
  if (parsed.success && parsed.data.role === Role.GESTIONNAIRE && req.user!.role === Role.ENTRAINEUR) {
    return res.status(403).json({ message: 'Un entraîneur ne peut pas inviter un gestionnaire.' });
  }
  if (!parsed.success) {
    return res.status(400).json({ message: 'Données invalides.', errors: parsed.error.flatten() });
  }

  const clubId = req.user!.clubId;
  if (!clubId) return res.status(400).json({ message: 'Club requis.' });

  const { email, firstName, lastName, role, expiresInDays } = parsed.data;

  const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existingUser?.emailVerified) {
    return res.status(409).json({ message: 'Cet utilisateur possède déjà un compte actif.' });
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const invitation = await prisma.invitation.create({
    data: {
      email,
      firstName,
      lastName,
      role,
      createdBy: req.user!.userId,
      clubId,
      expiresAt,
    },
    include: { club: { select: { nom: true } } },
  });

  if (invitation.club) {
    sendInvitationEmail({
      to: email,
      firstName,
      lastName,
      role,
      clubNom: invitation.club.nom,
      token: invitation.token,
    }).catch(() => {});
  }

  return res.status(201).json(invitation);
});

// GET /api/gestionnaire/invitations
router.get('/invitations', async (req, res) => {
  const invitations = await prisma.invitation.findMany({
    where: { clubId: req.user!.clubId },
    orderBy: { createdAt: 'desc' },
    include: {
      creator: { select: { firstName: true, lastName: true } },
    },
  });
  return res.json(invitations);
});

// DELETE /api/gestionnaire/invitations/:id
router.delete('/invitations/:id', async (req, res) => {
  const inv = await prisma.invitation.findUnique({ where: { id: req.params.id } });
  if (!inv) return res.status(404).json({ message: 'Invitation introuvable.' });

  if (inv.clubId !== req.user!.clubId) {
    return res.status(403).json({ message: 'Accès interdit.' });
  }

  await prisma.invitation.delete({ where: { id: req.params.id } });
  return res.json({ message: 'Invitation supprimée.' });
});

// GET /api/gestionnaire/users
router.get('/users', async (req, res) => {
  const clubId = req.user!.clubId;
  if (!clubId) return res.status(400).json({ message: 'Club requis.' });

  const [club, users] = await Promise.all([
    prisma.club.findUnique({ where: { id: clubId }, select: { idOwner: true } }),
    prisma.user.findMany({
      where: { clubId, isManual: false },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        profilePic: true,
        createdAt: true,
      },
    }),
  ]);

  return res.json(users.map((u) => ({ ...u, isOwner: u.id === club?.idOwner })));
});

// PATCH /api/gestionnaire/users/:id/role — promotion ENTRAINEUR → GESTIONNAIRE uniquement
router.patch('/users/:id/role', requireRole(Role.GESTIONNAIRE), async (req, res) => {
  const roleSchema = z.object({ role: z.literal(Role.GESTIONNAIRE) });
  const parsed = roleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Seule la promotion au rang de gestionnaire est autorisée.' });

  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });
  if (user.clubId !== req.user!.clubId) return res.status(403).json({ message: 'Accès interdit.' });
  if (user.role !== Role.ENTRAINEUR) {
    return res.status(400).json({ message: 'Seul un entraîneur peut être promu gestionnaire.' });
  }

  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: { role: Role.GESTIONNAIRE },
    select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, profilePic: true },
  });
  return res.json(updated);
});

// PATCH /api/gestionnaire/users/:id/active
router.patch('/users/:id/active', async (req, res) => {
  const schema = z.object({ isActive: z.boolean() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Données invalides.' });

  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target) return res.status(404).json({ message: 'Utilisateur introuvable.' });
  if (target.clubId !== req.user!.clubId) return res.status(403).json({ message: 'Accès interdit.' });

  const actorRole = req.user!.role;
  const actorId = req.user!.userId;
  const clubId = req.user!.clubId!;

  // Hierarchy: ENTRAINEUR → JOUEUR only; GESTIONNAIRE non-owner → JOUEUR+ENTRAINEUR; owner → all
  if (actorRole === Role.ENTRAINEUR && target.role !== Role.JOUEUR) {
    return res.status(403).json({ message: 'Un entraîneur ne peut agir que sur les joueurs.' });
  }
  if (actorRole === Role.GESTIONNAIRE && target.role === Role.GESTIONNAIRE) {
    if (!(await isClubOwner(actorId, clubId))) {
      return res.status(403).json({ message: 'Seul le propriétaire peut agir sur un gestionnaire.' });
    }
  }

  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: { isActive: parsed.data.isActive },
    select: { id: true, isActive: true },
  });
  return res.json(updated);
});

// DELETE /api/gestionnaire/users/:id — hard delete User + Joueur/Entraineur liés
// GESTIONNAIRE : peut supprimer JOUEUR et ENTRAINEUR (owner → tous)
// ENTRAINEUR   : peut supprimer uniquement les comptes JOUEUR
router.delete('/users/:id', requireRole(Role.GESTIONNAIRE, Role.ENTRAINEUR), async (req, res) => {
  if (req.params.id === req.user!.userId) {
    return res.status(400).json({ message: 'Impossible de supprimer votre propre compte.' });
  }

  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: { joueurProfile: true, entraineurProfile: true },
  });
  if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });
  if (user.clubId !== req.user!.clubId) return res.status(403).json({ message: 'Accès interdit.' });

  const actorRole = req.user!.role;

  // Un entraîneur ne peut supprimer que des joueurs
  if (actorRole === Role.ENTRAINEUR && user.role !== Role.JOUEUR) {
    return res.status(403).json({ message: 'Un entraîneur ne peut supprimer que des comptes joueur.' });
  }

  // Seul le propriétaire peut supprimer un autre gestionnaire
  if (user.role === Role.GESTIONNAIRE) {
    if (!(await isClubOwner(req.user!.userId, req.user!.clubId!))) {
      return res.status(403).json({ message: 'Seul le propriétaire peut supprimer un gestionnaire.' });
    }
  }

  await prisma.$transaction(async (tx) => {
    if (user.joueurProfile) {
      await tx.joueur.delete({ where: { id: user.joueurProfile.id } });
    }
    if (user.entraineurProfile) {
      await tx.entraineur.delete({ where: { id: user.entraineurProfile.id } });
    }
    await tx.user.delete({ where: { id: req.params.id } });
  });

  return res.json({ message: 'Membre supprimé.' });
});

export default router;
