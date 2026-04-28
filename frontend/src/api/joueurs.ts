import client from './client';
import type { Joueur, Poste } from '@/types';

export async function getJoueurs(): Promise<Joueur[]> {
  const { data } = await client.get<Joueur[]>('/joueurs');
  return data;
}

export async function getJoueur(id: string): Promise<Joueur> {
  const { data } = await client.get<Joueur>(`/joueurs/${id}`);
  return data;
}

export async function createJoueur(payload: {
  firstName: string;
  lastName: string;
  birthDate: string;
  poste?: Poste;
  numeroMaillot?: number;
}): Promise<Joueur> {
  const { data } = await client.post<Joueur>('/joueurs', payload);
  return data;
}

export async function updateJoueur(
  id: string,
  payload: Partial<{
    firstName: string;
    lastName: string;
    birthDate: string;
    poste: Poste;
    numeroMaillot: number;
    photoUrl: string;
  }>
): Promise<Joueur> {
  const { data } = await client.put<Joueur>(`/joueurs/${id}`, payload);
  return data;
}

export async function deleteJoueur(id: string): Promise<void> {
  await client.delete(`/joueurs/${id}`);
}
