import client from './client';
import type { Actualite } from '@/types';

interface ActualitesResponse {
  data: Actualite[];
  total: number;
  page: number;
  totalPages: number;
}

export async function getActualites(page = 1): Promise<ActualitesResponse> {
  const { data } = await client.get<ActualitesResponse>('/actualites', { params: { page } });
  return data;
}

export async function createActualite(payload: {
  titre: string;
  contenu: string;
  equipeId?: string;
}): Promise<Actualite> {
  const { data } = await client.post<Actualite>('/actualites', payload);
  return data;
}

export async function deleteActualite(id: string): Promise<void> {
  await client.delete(`/actualites/${id}`);
}
