import client from './client';
import type { Entraineur } from '@/types';

export async function getEntraineurs(): Promise<Entraineur[]> {
  const { data } = await client.get<Entraineur[]>('/entraineurs');
  return data;
}
