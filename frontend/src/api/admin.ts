import client from './client';
import type { Invitation, User, Role } from '@/types';

export async function getUsers(): Promise<User[]> {
  const { data } = await client.get<User[]>('/gestionnaire/users');
  return data;
}

export async function updateUserRole(userId: string, role: Role): Promise<User> {
  const { data } = await client.patch<User>(`/gestionnaire/users/${userId}/role`, { role });
  return data;
}

export async function toggleUserActive(id: string, isActive: boolean): Promise<User> {
  const { data } = await client.patch<User>(`/gestionnaire/users/${id}/active`, { isActive });
  return data;
}

export async function deleteUser(userId: string): Promise<void> {
  await client.delete(`/gestionnaire/users/${userId}`);
}

export async function getInvitations(): Promise<Invitation[]> {
  const { data } = await client.get<Invitation[]>('/gestionnaire/invitations');
  return data;
}

export async function createInvitation(payload: {
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  expiresInDays?: number;
}): Promise<Invitation> {
  const { data } = await client.post<Invitation>('/gestionnaire/invitations', payload);
  return data;
}

export async function deleteInvitation(id: string): Promise<void> {
  await client.delete(`/gestionnaire/invitations/${id}`);
}
