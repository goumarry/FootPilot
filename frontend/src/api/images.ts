import client from './client';

export async function uploadProfilePic(file: File): Promise<{ profilePic: string }> {
  const form = new FormData();
  form.append('photo', file);
  const { data } = await client.post<{ profilePic: string }>('/auth/me/profile-pic', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function uploadClubLogo(clubId: string, file: File): Promise<{ logoUrl: string }> {
  const form = new FormData();
  form.append('logo', file);
  const { data } = await client.post<{ logoUrl: string }>(`/clubs/${clubId}/logo`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}
