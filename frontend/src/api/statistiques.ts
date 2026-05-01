import client from './client';

export async function getMyStats() {
  const { data } = await client.get('/statistiques/joueurs/moi');
  return data;
}

export async function getStatsJoueur(id: string) {
  const { data } = await client.get(`/statistiques/joueurs/${id}`);
  return data;
}

export async function getStatsEquipe(id: string) {
  const { data } = await client.get(`/statistiques/equipes/${id}`);
  return data;
}

export async function getStatsClub(id: string) {
  const { data } = await client.get(`/statistiques/clubs/${id}`);
  return data;
}
