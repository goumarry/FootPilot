import { test, expect } from '@playwright/test';
import {
  mockGestionnaire,
  mockJoueur,
  mockClub,
  setLoggedIn,
  mockAdminRoutes,
  mockJoueurRoutes,
} from './helpers';

test.describe('Dashboard joueur', () => {
  test.beforeEach(async ({ page }) => {
    await setLoggedIn(page, mockJoueur);
    await mockJoueurRoutes(page);
  });

  test('affiche le prénom et nom du joueur connecté', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByText(`${mockJoueur.firstName} ${mockJoueur.lastName}`)).toBeVisible();
  });

  test('redirige vers /login si non authentifié', async ({ page }) => {
    // Pas de localStorage injecté, pas de mock /auth/me
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login');
  });
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
    await expect(page.getByText(mockClub.nom)).toBeVisible();
  });
});
