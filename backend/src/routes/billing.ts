import { Router } from 'express';
import Stripe from 'stripe';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { verifyToken, requireRole } from '../middleware/auth';

const router = Router();
router.use(verifyToken);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_test_placeholder');

async function getOrCreateStripeCustomer(clubId: string, email: string): Promise<string> {
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { stripeCustomerId: true, nom: true },
  });
  if (!club) throw new Error('Club introuvable.');

  if (club.stripeCustomerId) return club.stripeCustomerId;

  const customer = await stripe.customers.create({ email, name: club.nom });
  await prisma.club.update({ where: { id: clubId }, data: { stripeCustomerId: customer.id } });
  return customer.id;
}

// GET /api/billing/status
router.get('/status', async (req, res) => {
  const clubId = req.user!.clubId;
  if (!clubId) return res.status(400).json({ message: 'Club requis.' });

  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: {
      subscriptionStatus: true,
      hasUnlockedLimits: true,
      isFounder: true,
      _count: { select: { equipes: true, joueurs: true } },
    },
  });
  if (!club) return res.status(404).json({ message: 'Club introuvable.' });

  return res.json(club);
});

// POST /api/billing/checkout/subscription
router.post('/checkout/subscription', requireRole(Role.GESTIONNAIRE), async (req, res) => {
  const clubId = req.user!.clubId;
  if (!clubId) return res.status(400).json({ message: 'Club requis.' });

  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { email: true },
  });
  if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });

  const customerId = await getOrCreateStripeCustomer(clubId, user.email);

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: process.env.STRIPE_SUBSCRIPTION_PRICE_ID!, quantity: 1 }],
    success_url: `${process.env.APP_URL}/admin/club?tab=abonnement&success=1`,
    cancel_url: `${process.env.APP_URL}/admin/club?tab=abonnement`,
    metadata: { clubId },
  });

  return res.json({ url: session.url });
});

// POST /api/billing/checkout/payment
router.post('/checkout/payment', requireRole(Role.GESTIONNAIRE), async (req, res) => {
  const clubId = req.user!.clubId;
  if (!clubId) return res.status(400).json({ message: 'Club requis.' });

  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { email: true },
  });
  if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });

  const customerId = await getOrCreateStripeCustomer(clubId, user.email);

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'payment',
    line_items: [{ price: process.env.STRIPE_PAYMENT_PRICE_ID!, quantity: 1 }],
    success_url: `${process.env.APP_URL}/admin/club?tab=abonnement&success=1`,
    cancel_url: `${process.env.APP_URL}/admin/club?tab=abonnement`,
    metadata: { clubId },
  });

  return res.json({ url: session.url });
});

// POST /api/billing/portal
router.post('/portal', requireRole(Role.GESTIONNAIRE), async (req, res) => {
  const clubId = req.user!.clubId;
  if (!clubId) return res.status(400).json({ message: 'Club requis.' });

  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { stripeCustomerId: true },
  });
  if (!club?.stripeCustomerId) {
    return res.status(400).json({ message: 'Aucun abonnement actif.' });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: club.stripeCustomerId,
    return_url: `${process.env.APP_URL}/admin/club?tab=abonnement`,
  });

  return res.json({ url: session.url });
});

export default router;
