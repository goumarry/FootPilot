import client from './client';
import type { SubscriptionStatus } from '@/types';

export interface BillingStatus {
  subscriptionStatus: SubscriptionStatus;
  hasUnlockedLimits: boolean;
  isFounder: boolean;
  _count: { equipes: number; joueurs: number };
}

export async function getBillingStatus(): Promise<BillingStatus> {
  const { data } = await client.get<BillingStatus>('/billing/status');
  return data;
}

export async function createSubscriptionCheckout(): Promise<{ url: string }> {
  const { data } = await client.post<{ url: string }>('/billing/checkout/subscription');
  return data;
}

export async function createPaymentCheckout(): Promise<{ url: string }> {
  const { data } = await client.post<{ url: string }>('/billing/checkout/payment');
  return data;
}

export async function createPortalSession(): Promise<{ url: string }> {
  const { data } = await client.post<{ url: string }>('/billing/portal');
  return data;
}
