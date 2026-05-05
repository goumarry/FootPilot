import client from './client';
import type { User } from '@/types';

interface AuthResponse {
  token: string;
  user: User;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const { data } = await client.post<AuthResponse>('/auth/login', { email, password });
  return data;
}

export async function getMe(): Promise<User> {
  const { data } = await client.get<User>('/auth/me');
  return data;
}

export async function getInvitation(token: string): Promise<{
  email?: string;
  firstName?: string;
  lastName?: string;
  role: string;
  clubNom?: string;
}> {
  const { data } = await client.get(`/auth/invitation/${token}`);
  return data;
}

export async function register(payload: {
  token: string;
  email?: string;
  firstName: string;
  lastName: string;
  password: string;
  birthDate?: string;
}): Promise<AuthResponse> {
  const { data } = await client.post<AuthResponse>('/auth/register', payload);
  return data;
}

export async function createClub(payload: {
  clubNom: string;
  clubVille: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}): Promise<{ message: string }> {
  const { data } = await client.post<{ message: string }>('/auth/create-club', payload);
  return data;
}

export async function verifyEmail(token: string): Promise<{ message: string }> {
  const { data } = await client.post<{ message: string }>('/auth/verify-email', { token });
  return data;
}
