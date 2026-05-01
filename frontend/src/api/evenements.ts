import client from './client';
import type { Evenement, Presence } from '@/types';

export async function getEvenements(params?: {
  equipeId?: string;
  from?: string;
  to?: string;
  type?: 'MATCH' | 'ENTRAINEMENT';
}): Promise<Evenement[]> {
  const { data } = await client.get<Evenement[]>('/evenements', { params });
  return data;
}

export async function getEvenement(id: string): Promise<Evenement> {
  const { data } = await client.get<Evenement>(`/evenements/${id}`);
  return data;
}

export async function createEvenement(payload: Record<string, unknown>): Promise<Evenement> {
  const { data } = await client.post<Evenement>('/evenements', payload);
  return data;
}

export async function updateEvenement(
  id: string,
  payload: Record<string, unknown>
): Promise<Evenement> {
  const { data } = await client.put<Evenement>(`/evenements/${id}`, payload);
  return data;
}

export async function deleteEvenement(id: string): Promise<void> {
  await client.delete(`/evenements/${id}`);
}

export async function saisirScore(
  evenementId: string,
  payload: { scoreDom: number; scoreExt: number }
): Promise<void> {
  await client.put(`/evenements/${evenementId}/score`, payload);
}

export async function getAppel(evenementId: string): Promise<Presence[]> {
  const { data } = await client.get<Presence[]>(`/evenements/${evenementId}/appel`);
  return data;
}

export async function saisirAppel(
  evenementId: string,
  presences: Array<{
    joueurId: string;
    statut: string;
    note?: number | null;
    buts?: number | null;
    commentaire?: string;
  }>
): Promise<void> {
  await client.post(`/evenements/${evenementId}/appel`, { presences });
}
