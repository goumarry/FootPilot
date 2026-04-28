import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { verifyToken, requireRole } from '../middleware/auth';
import { sendInvitationEmail } from '../lib/email';

const router = Router();
router.use(verifyToken);
router.use(requireRole(Role.ADMIN, Role.GESTIONNAIRE));

const inviteSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  role: z.nativeEnum(Role),
  expiresInDays: z.number().int().min(1).max(30).default(7),
});

// POST /api/admin/invitations
router.post('/invitations', async (req, res) => {
  const parsed = inviteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Données invalides.', errors: parsed.error.flatten() });
  }

  if (req.user!.role === Role.GESTIONNAIRE && parsed.data.role === Role.ADMIN) {
    return res.status(403).json({ message: 'Vous ne pouvez pas inviter un administrateur.' });
  }
  if (req.user!.role === Role.GESTIONNAIRE && parsed.data.role === Role.GESTIONNAIRE) {
    // Gestionnaire peut créer d'autres gestionnaires pour son club
  }

  const clubId = req.user!.clubId ?? undefined;
  const { email, firstName, lastName, role, expiresInDays } = parsed.data;

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

  // Envoi email async
  if (clubId && invitation.club) {
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

// GET /api/admin/invitations
router.get('/invitations', async (req, res) => {
  const where = req.user!.role === Role.ADMIN
    ? {}
    : { clubId: req.user!.clubId };

  const invitations = await prisma.invitation.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      creator: { select: { firstName: true, lastName: true } },
    },
  });
  return res.json(invitations);
});

// DELETE /api/admin/invitations/:id
router.delete('/invitations/:id', async (req, res) => {
  const inv = await prisma.invitation.findUnique({ where: { id: req.params.id } });
  if (!inv) return res.status(404).json({ message: 'Invitation introuvable.' });

  if (req.user!.role === Role.GESTIONNAIRE && inv.clubId !== req.user!.clubId) {
    return res.status(403).json({ message: 'Accès interdit.' });
  }

  await prisma.invitation.delete({ where: { id: req.params.id } });
  return res.json({ message: 'Invitation supprimée.' });
});

// GET /api/admin/users
router.get('/users', async (req, res) => {
  const where = req.user!.role === Role.ADMIN
    ? {}
    : { clubId: req.user!.clubId };

  const users = await prisma.user.findMany({
    where,
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
  });
  return res.json(users);
});

// PATCH /api/admin/users/:id/role — ADMIN only
router.patch('/users/:id/role', requireRole(Role.ADMIN), async (req, res) => {
  const roleSchema = z.object({ role: z.nativeEnum(Role) });
  const parsed = roleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Rôle invalide.' });

  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });

  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: { role: parsed.data.role },
    select: { id: true, email: true, firstName: true, lastName: true, role: true },
  });
  return res.json(updated);
});

// PATCH /api/admin/users/:id/active
router.patch('/users/:id/active', async (req, res) => {
  const schema = z.object({ isActive: z.boolean() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Données invalides.' });

  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });

  if (req.user!.role === Role.GESTIONNAIRE && user.clubId !== req.user!.clubId) {
    return res.status(403).json({ message: 'Accès interdit.' });
  }

  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: { isActive: parsed.data.isActive },
    select: { id: true, isActive: true },
  });
  return res.json(updated);
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', requireRole(Role.ADMIN), async (req, res) => {
  if (req.params.id === req.user!.userId) {
    return res.status(400).json({ message: 'Impossible de supprimer votre propre compte.' });
  }
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });
  await prisma.user.delete({ where: { id: req.params.id } });
  return res.json({ message: 'Utilisateur supprimé.' });
});

export default router;
