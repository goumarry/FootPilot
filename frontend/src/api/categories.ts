import client from './client';
import type { Categorie } from '@/types';

export async function getCategories(clubId?: string): Promise<Categorie[]> {
  const { data } = await client.get<Categorie[]>('/categories', { params: clubId ? { clubId } : {} });
  return data;
}

export async function createCategorie(nom: string): Promise<Categorie> {
  const { data } = await client.post<Categorie>('/categories', { nom });
  return data;
}

export async function updateCategorie(id: string, nom: string): Promise<Categorie> {
  const { data } = await client.put<Categorie>(`/categories/${id}`, { nom });
  return data;
}

export async function deleteCategorie(id: string): Promise<void> {
  await client.delete(`/categories/${id}`);
}
