import { Router } from 'express';
import { z } from 'zod';
import { Role, ChatRoomType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { verifyToken } from '../middleware/auth';
import { requireSubscription } from '../middleware/billing';

const router = Router();
router.use(verifyToken);
router.use(requireSubscription);

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Trouve ou crée un salon STAFF ou DIRECTION pour le club. */
async function ensureGlobalRoom(type: ChatRoomType, clubId: string) {
  const existing = await prisma.chatRoom.findFirst({ where: { type, clubId } });
  if (existing) return existing;
  return prisma.chatRoom.create({ data: { type, clubId } });
}

/** Calcule les equipeIds accessibles selon le rôle. */
async function getAccessibleEquipeIds(userId: string, role: Role, clubId: string): Promise<string[]> {
  if (role === Role.GESTIONNAIRE) {
    const equipes = await prisma.equipe.findMany({ where: { clubId }, select: { id: true } });
    return equipes.map((e) => e.id);
  }
  if (role === Role.ENTRAINEUR) {
    const entraineur = await prisma.entraineur.findFirst({ where: { userId } });
    if (!entraineur) return [];
    const ees = await prisma.entraineurEquipe.findMany({
      where: { entraineurId: entraineur.id },
      select: { equipeId: true },
    });
    return ees.map((e) => e.equipeId);
  }
  // JOUEUR
  const joueur = await prisma.joueur.findFirst({ where: { userId } });
  if (!joueur) return [];
  const jes = await prisma.joueurEquipe.findMany({
    where: { joueurId: joueur.id, dateFin: null },
    select: { equipeId: true },
  });
  return jes.map((e) => e.equipeId);
}

/** Vérifie qu'un utilisateur peut accéder à un salon donné. */
async function assertRoomAccess(
  userId: string,
  role: Role,
  clubId: string,
  roomId: string,
): Promise<{ id: string; type: ChatRoomType; equipeId: string | null; clubId: string } | null> {
  const room = await prisma.chatRoom.findUnique({ where: { id: roomId } });
  if (!room || room.clubId !== clubId) return null;

  if (room.type === ChatRoomType.DIRECTION && role !== Role.GESTIONNAIRE) return null;
  if (room.type === ChatRoomType.STAFF && role === Role.JOUEUR) return null;

  if (room.type === ChatRoomType.EQUIPE) {
    if (role === Role.GESTIONNAIRE) return room;
    const ids = await getAccessibleEquipeIds(userId, role, clubId);
    if (!ids.includes(room.equipeId!)) return null;
  }

  return room;
}

// ── GET /api/chat/rooms ───────────────────────────────────────────────────────

router.get('/rooms', async (req, res) => {
  const { userId, role, clubId } = req.user!;
  if (!clubId) return res.status(400).json({ message: 'Vous devez appartenir à un club.' });

  const rooms = [];

  // Salons globaux
  if (role !== Role.JOUEUR) {
    rooms.push(await ensureGlobalRoom(ChatRoomType.STAFF, clubId));
  }
  if (role === Role.GESTIONNAIRE) {
    rooms.push(await ensureGlobalRoom(ChatRoomType.DIRECTION, clubId));
  }

  // Salons d'équipes
  const equipeIds = await getAccessibleEquipeIds(userId, role, clubId);
  for (const equipeId of equipeIds) {
    const room = await prisma.chatRoom.upsert({
      where: { equipeId },
      update: {},
      create: { type: ChatRoomType.EQUIPE, clubId, equipeId },
    });
    rooms.push(room);
  }

  // Enrichissement : nom de l'équipe + dernier message + nombre de non-lus
  const equipes = await prisma.equipe.findMany({
    where: { id: { in: equipeIds } },
    select: { id: true, nomEquipe: true, categorie: { select: { nom: true } } },
  });
  const equipeMap = new Map(equipes.map((e) => [e.id, e]));

  const receipts = await prisma.chatReadReceipt.findMany({
    where: { userId, roomId: { in: rooms.map((r) => r.id) } },
  });
  const receiptMap = new Map(receipts.map((r) => [r.roomId, r.lastReadAt]));

  const result = await Promise.all(
    rooms.map(async (room) => {
      const lastReadAt = receiptMap.get(room.id) ?? new Date(0);
      const unreadCount = await prisma.chatMessage.count({
        where: { roomId: room.id, createdAt: { gt: lastReadAt }, senderId: { not: userId } },
      });
      const lastMessage = await prisma.chatMessage.findFirst({
        where: { roomId: room.id },
        orderBy: { createdAt: 'desc' },
        include: { sender: { select: { firstName: true, lastName: true } } },
      });

      let nom: string;
      if (room.type === ChatRoomType.STAFF) nom = 'Staff';
      else if (room.type === ChatRoomType.DIRECTION) nom = 'Direction';
      else {
        const eq = equipeMap.get(room.equipeId!);
        nom = eq ? (eq.categorie?.nom ? `${eq.nomEquipe} · ${eq.categorie.nom}` : eq.nomEquipe) : 'Équipe';
      }

      return {
        id: room.id,
        type: room.type,
        nom,
        unreadCount,
        lastMessage: lastMessage
          ? {
              content: lastMessage.content,
              senderName: `${lastMessage.sender.firstName} ${lastMessage.sender.lastName[0]}.`,
              createdAt: lastMessage.createdAt,
            }
          : null,
      };
    }),
  );

  return res.json(result);
});

// ── GET /api/chat/rooms/:id/messages ─────────────────────────────────────────

router.get('/rooms/:id/messages', async (req, res) => {
  const { userId, role, clubId } = req.user!;
  if (!clubId) return res.status(400).json({ message: 'Aucun club.' });

  const room = await assertRoomAccess(userId, role, clubId, req.params.id);
  if (!room) return res.status(403).json({ message: 'Accès refusé.' });

  const cursor = req.query.cursor as string | undefined;
  const limit = 40;

  const messages = await prisma.chatMessage.findMany({
    where: { roomId: room.id, ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}) },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    include: { sender: { select: { id: true, firstName: true, lastName: true, profilePic: true } } },
  });

  const hasMore = messages.length > limit;
  const items = hasMore ? messages.slice(0, limit) : messages;

  return res.json({
    messages: items.reverse().map((m) => ({
      id: m.id,
      roomId: m.roomId,
      senderId: m.senderId,
      senderName: `${m.sender.firstName} ${m.sender.lastName}`,
      senderInitials: `${m.sender.firstName[0]}${m.sender.lastName[0]}`,
      senderPic: m.sender.profilePic,
      content: m.content,
      createdAt: m.createdAt,
      isOwn: m.senderId === userId,
    })),
    hasMore,
    nextCursor: hasMore ? items[0].createdAt.toISOString() : null,
  });
});

// ── POST /api/chat/rooms/:id/messages ────────────────────────────────────────

const sendSchema = z.object({ content: z.string().min(1).max(2000) });

router.post('/rooms/:id/messages', async (req, res) => {
  const { userId, role, clubId } = req.user!;
  if (!clubId) return res.status(400).json({ message: 'Aucun club.' });

  const room = await assertRoomAccess(userId, role, clubId, req.params.id);
  if (!room) return res.status(403).json({ message: 'Accès refusé.' });

  const parsed = sendSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Message invalide.' });

  const message = await prisma.chatMessage.create({
    data: { roomId: room.id, senderId: userId, content: parsed.data.content.trim() },
    include: { sender: { select: { id: true, firstName: true, lastName: true, profilePic: true } } },
  });

  // Marquer automatiquement comme lu pour l'expéditeur
  await prisma.chatReadReceipt.upsert({
    where: { userId_roomId: { userId, roomId: room.id } },
    update: { lastReadAt: message.createdAt },
    create: { userId, roomId: room.id, lastReadAt: message.createdAt },
  });

  return res.status(201).json({
    id: message.id,
    roomId: message.roomId,
    senderId: message.senderId,
    senderName: `${message.sender.firstName} ${message.sender.lastName}`,
    senderInitials: `${message.sender.firstName[0]}${message.sender.lastName[0]}`,
    senderPic: message.sender.profilePic,
    content: message.content,
    createdAt: message.createdAt,
    isOwn: true,
  });
});

// ── POST /api/chat/rooms/:id/read ─────────────────────────────────────────────

router.post('/rooms/:id/read', async (req, res) => {
  const { userId, role, clubId } = req.user!;
  if (!clubId) return res.status(400).json({ message: 'Aucun club.' });

  const room = await assertRoomAccess(userId, role, clubId, req.params.id);
  if (!room) return res.status(403).json({ message: 'Accès refusé.' });

  await prisma.chatReadReceipt.upsert({
    where: { userId_roomId: { userId, roomId: room.id } },
    update: { lastReadAt: new Date() },
    create: { userId, roomId: room.id },
  });

  return res.json({ ok: true });
});

export default router;
