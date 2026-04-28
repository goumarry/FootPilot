import client from './client';
import type { Invitation, User, Role } from '@/types';

export async function getUsers(): Promise<User[]> {
  const { data } = await client.get<User[]>('/admin/users');
  return data;
}

export async function updateUserRole(userId: string, role: Role): Promise<User> {
  const { data } = await client.patch<User>(`/admin/users/${userId}/role`, { role });
  return data;
}

export async function toggleUserActive(id: string, isActive: boolean): Promise<User> {
  const { data } = await client.patch<User>(`/admin/users/${id}/active`, { isActive });
  return data;
}

export async function deleteUser(userId: string): Promise<void> {
  await client.delete(`/admin/users/${userId}`);
}

export async function getInvitations(): Promise<Invitation[]> {
  const { data } = await client.get<Invitation[]>('/admin/invitations');
  return data;
}

export async function createInvitation(payload: {
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  expiresInDays?: number;
}): Promise<Invitation> {
  const { data } = await client.post<Invitation>('/admin/invitations', payload);
  return data;
}

export async function deleteInvitation(id: string): Promise<void> {
  await client.delete(`/admin/invitations/${id}`);
}
