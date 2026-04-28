import client from './client';
import type { Evenement } from '@/types';

export async function getEvenements(params?: {
  equipeId?: string;
  from?: string;
  to?: string;
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
  matchId: string,
  payload: { scoreDom: number; scoreExt: number }
): Promise<void> {
  await client.put(`/matchs/${matchId}/score`, payload);
}

export async function saisirAppel(
  entrainementId: string,
  presences: Array<{ joueurId: string; statut: string; commentaire?: string }>
): Promise<void> {
  await client.post(`/entrainements/${entrainementId}/appel`, { presences });
}

export async function getAppel(entrainementId: string) {
  const { data } = await client.get(`/entrainements/${entrainementId}/appel`);
  return data;
}
