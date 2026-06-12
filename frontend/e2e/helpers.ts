import type { Page } from '@playwright/test';

export const mockGestionnaire = {
  id: 'user-1',
  email: 'gestionnaire@test.com',
  firstName: 'Jean',
  lastName: 'Dupont',
  role: 'GESTIONNAIRE' as const,
  clubId: 'club-1',
};

export const mockJoueur = {
  id: 'user-2',
  email: 'joueur@test.com',
  firstName: 'Marc',
  lastName: 'Martin',
  role: 'JOUEUR' as const,
  clubId: 'club-1',
};

export const mockClub = {
  id: 'club-1',
  nom: 'FC Test',
  ville: 'Paris',
  logoUrl: null,
};

export const mockStats = {
  categories: 2,
  equipes: 3,
  joueurs: 20,
  membres: 25,
  entraineurs: 2,
  matchs: 5,
  entrainements: 10,
};

// Injecte le token dans localStorage avant le chargement de la page
export async function setLoggedIn(
  page: Page,
  user: typeof mockGestionnaire | typeof mockJoueur,
  token = 'fake_jwt_token',
) {
  await page.addInitScript(
    ({ t, u }) => {
      localStorage.setItem('fp_token', t);
      localStorage.setItem('fp_user', JSON.stringify(u));
    },
    { t: token, u: user },
  );
}

// Mock GET /api/auth/me — appelé par AuthContext à chaque chargement si token présent
export async function mockAuthMe(
  page: Page,
  user: typeof mockGestionnaire | typeof mockJoueur,
) {
  await page.route('/api/auth/me', (route) => route.fulfill({ json: user }));
}

// Mock les routes API communes aux pages admin
export async function mockAdminRoutes(page: Page) {
  await mockAuthMe(page, mockGestionnaire);
  await page.route('/api/clubs/**', (route) => route.fulfill({ json: mockClub }));
  await page.route('/api/statistiques/**', (route) => route.fulfill({ json: mockStats }));
  await page.route('/api/equipes', (route) => route.fulfill({ json: [] }));
  await page.route('/api/evenements', (route) => route.fulfill({ json: [] }));
  await page.route('/api/actualites', (route) =>
    route.fulfill({ json: { data: [], total: 0 } }),
  );
}

// Mock les routes API communes à la page joueur
export async function mockJoueurRoutes(page: Page) {
  await mockAuthMe(page, mockJoueur);
  await page.route('/api/clubs/**', (route) => route.fulfill({ json: mockClub }));
  await page.route('/api/evenements', (route) => route.fulfill({ json: [] }));
  await page.route('/api/actualites', (route) =>
    route.fulfill({ json: { data: [], total: 0 } }),
  );
}
