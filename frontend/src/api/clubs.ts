import client from './client';
import type { Club, User } from '@/types';

export async function getClub(id: string): Promise<Club> {
  const { data } = await client.get<Club>(`/clubs/${id}`);
  return data;
}

export async function updateClub(
  id: string,
  payload: Partial<Pick<Club, 'nom' | 'ville' | 'logoUrl' | 'description'>>
): Promise<Club> {
  const { data } = await client.put<Club>(`/clubs/${id}`, payload);
  return data;
}

export async function getClubMembres(id: string): Promise<User[]> {
  const { data } = await client.get<User[]>(`/clubs/${id}/membres`);
  return data;
}
