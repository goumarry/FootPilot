import { test, expect } from '@playwright/test';
import {
  mockGestionnaire,
  mockJoueur,
  mockClub,
  setLoggedIn,
  mockAdminRoutes,
  mockJoueurRoutes,
} from './helpers';

test.describe('Dashboard joueur (authentifié)', () => {
  test.beforeEach(async ({ page }) => {
    await setLoggedIn(page, mockJoueur);
    await mockJoueurRoutes(page);
  });

  test('affiche le prénom et nom du joueur connecté', async ({ page }) => {
    await page.goto('/dashboard');
    // Cible le h1 spécifiquement — le nom apparaît aussi dans la sidebar
    await expect(
      page.getByRole('heading', { name: `${mockJoueur.firstName} ${mockJoueur.lastName}` }),
    ).toBeVisible();
  });
});

// Séparé du describe authentifié pour ne pas injecter de token
test('dashboard redirige vers /login si non authentifié', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL('/login');
});

test.describe('Dashboard admin (GESTIONNAIRE)', () => {
  test.beforeEach(async ({ page }) => {
    await setLoggedIn(page, mockGestionnaire);
    await mockAdminRoutes(page);
  });

  test('affiche le prénom et nom du gestionnaire', async ({ page }) => {
    await page.goto('/admin');
    await expect(
      page.getByText(`${mockGestionnaire.firstName} ${mockGestionnaire.lastName}`),
    ).toBeVisible();
  });

  test('affiche le nom du club dans la sidebar', async ({ page }) => {
    await page.goto('/admin');
    // L'aside (sidebar) contient un <span> avec le nom du club
    await expect(page.locator('aside').getByText(mockClub.nom).first()).toBeVisible();
  });
});
