import client from './client';
import type { Equipe, EquipeDetail } from '@/types';

export async function getEquipes(): Promise<Equipe[]> {
  const { data } = await client.get<Equipe[]>('/equipes');
  return data;
}

export async function getEquipe(id: string): Promise<EquipeDetail> {
  const { data } = await client.get<EquipeDetail>(`/equipes/${id}`);
  return data;
}

export async function createEquipe(payload: {
  categorieId: string;
  nomEquipe: string;
  niveauChampionnat?: string;
}): Promise<Equipe> {
  const { data } = await client.post<Equipe>('/equipes', payload);
  return data;
}

export async function updateEquipe(
  id: string,
  payload: Partial<{ nomEquipe: string; niveauChampionnat: string; categorieId: string }>
): Promise<Equipe> {
  const { data } = await client.put<Equipe>(`/equipes/${id}`, payload);
  return data;
}

export async function deleteEquipe(id: string): Promise<void> {
  await client.delete(`/equipes/${id}`);
}

export async function assignJoueur(equipeId: string, joueurId: string): Promise<void> {
  await client.post(`/equipes/${equipeId}/joueurs`, { joueurId });
}

export async function removeJoueur(equipeId: string, joueurId: string): Promise<void> {
  await client.delete(`/equipes/${equipeId}/joueurs/${joueurId}`);
}

export async function assignEntraineur(equipeId: string, entraineurId: string): Promise<void> {
  await client.post(`/equipes/${equipeId}/entraineurs`, { entraineurId });
}

export async function removeEntraineur(equipeId: string, entraineurId: string): Promise<void> {
  await client.delete(`/equipes/${equipeId}/entraineurs/${entraineurId}`);
}
