import client from './client';
import type { JoinCode } from '@/types';

export async function getJoinCodes(): Promise<JoinCode[]> {
  const { data } = await client.get<JoinCode[]>('/join-codes');
  return data;
}

export async function createJoinCode(payload: {
  role: 'ENTRAINEUR' | 'JOUEUR';
  expiresInHours: number;
}): Promise<JoinCode> {
  const { data } = await client.post<JoinCode>('/join-codes', payload);
  return data;
}

export async function deleteJoinCode(id: string): Promise<void> {
  await client.delete(`/join-codes/${id}`);
}

export async function validateJoinCode(code: string): Promise<{
  role: 'ENTRAINEUR' | 'JOUEUR';
  clubNom: string;
  expiresAt: string;
}> {
  const { data } = await client.get(`/join-codes/validate/${code.toUpperCase()}`);
  return data;
}

export async function redeemJoinCode(payload: {
  code: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  birthDate?: string;
}): Promise<{ message: string }> {
  const { data } = await client.post<{ message: string }>('/join-codes/use', {
    ...payload,
    code: payload.code.toUpperCase(),
  });
  return data;
}
