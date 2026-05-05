import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

const EQUIPES_LIMIT = 3;
const JOUEURS_LIMIT = 30;

export async function requireSubscription(req: Request, res: Response, next: NextFunction) {
  const clubId = req.user?.clubId;
  if (!clubId) return res.status(403).json({ message: 'Club requis.' });

  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { subscriptionStatus: true, isFounder: true },
  });
  if (!club) return res.status(403).json({ message: 'Club introuvable.' });

  if (club.isFounder || club.subscriptionStatus === 'active') return next();

  return res.status(402).json({
    message: 'Abonnement requis pour accéder à cette fonctionnalité.',
    code: 'SUBSCRIPTION_REQUIRED',
  });
}

export function checkClubLimits(resource: 'equipes' | 'joueurs') {
  return async (req: Request, res: Response, next: NextFunction) => {
    const clubId = req.user?.clubId;
    if (!clubId) return res.status(403).json({ message: 'Club requis.' });

    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: {
        isFounder: true,
        hasUnlockedLimits: true,
        _count: { select: { equipes: true, joueurs: true } },
      },
    });
    if (!club) return res.status(403).json({ message: 'Club introuvable.' });

    if (club.isFounder || club.hasUnlockedLimits) return next();

    const count = resource === 'equipes' ? club._count.equipes : club._count.joueurs;
    const limit = resource === 'equipes' ? EQUIPES_LIMIT : JOUEURS_LIMIT;

    if (count >= limit) {
      return res.status(403).json({
        message:
          resource === 'equipes'
            ? `Limite atteinte : ${EQUIPES_LIMIT} équipes maximum. Passez au Pack Illimité.`
            : `Limite atteinte : ${JOUEURS_LIMIT} joueurs maximum. Passez au Pack Illimité.`,
        code: 'LIMITS_REACHED',
        limit,
        current: count,
      });
    }

    return next();
  };
}
