import { Router } from 'express';
import Stripe from 'stripe';
import { prisma } from '../lib/prisma';

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_test_placeholder');

// POST /api/webhooks/stripe — corps brut requis (monté avant express.json dans index.ts)
router.post('/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;

  let event: ReturnType<typeof stripe.webhooks.constructEvent>;
  try {
    event = stripe.webhooks.constructEvent(
      req.body as Buffer,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET ?? ''
    );
  } catch {
    return res.status(400).json({ message: 'Signature Stripe invalide.' });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as {
      mode: string;
      metadata?: Record<string, string> | null;
    };
    const clubId = session.metadata?.clubId;
    if (!clubId) return res.status(400).json({ message: 'clubId manquant dans les métadonnées.' });

    await prisma.$transaction(async (tx) => {
      if (session.mode === 'subscription') {
        await tx.club.update({ where: { id: clubId }, data: { subscriptionStatus: 'active' } });
      } else if (session.mode === 'payment') {
        await tx.club.update({ where: { id: clubId }, data: { hasUnlockedLimits: true } });
      }
    });
  }

  if (
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted'
  ) {
    const subscription = event.data.object as { customer: string; status: string };

    const newStatus =
      subscription.status === 'active'
        ? 'active'
        : subscription.status === 'past_due'
        ? 'past_due'
        : 'canceled';

    await prisma.club.updateMany({
      where: { stripeCustomerId: subscription.customer },
      data: { subscriptionStatus: newStatus },
    });
  }

  return res.json({ received: true });
});

export default router;
