import { test, expect } from '@playwright/test';
import { mockGestionnaire, setLoggedIn, mockAdminRoutes } from './helpers';

test.describe('Navigation sidebar (GESTIONNAIRE)', () => {
  test.beforeEach(async ({ page }) => {
    await setLoggedIn(page, mockGestionnaire);
    await mockAdminRoutes(page);
    // Les pages de destination font aussi des appels API — on les laisse passer (404 mock ignoré)
    await page.route('/api/membres', (route) => route.fulfill({ json: [] }));
    await page.route('/api/joueurs', (route) => route.fulfill({ json: [] }));
    await page.route('/api/matchs', (route) => route.fulfill({ json: [] }));
  });

  test('lien Membres navigue vers /admin/membres', async ({ page }) => {
    await page.goto('/admin');
    await page.getByRole('link', { name: /membres/i }).click();
    await expect(page).toHaveURL('/admin/membres');
  });

  test('lien Équipes navigue vers /admin/equipes', async ({ page }) => {
    await page.goto('/admin');
    await page.route('/api/equipes', (route) => route.fulfill({ json: [] }));
    await page.getByRole('link', { name: /équipes/i }).click();
    await expect(page).toHaveURL('/admin/equipes');
  });

  test('bouton Déconnexion redirige vers /', async ({ page }) => {
    await page.goto('/admin');
    await page.getByRole('button', { name: /déconnexion/i }).click();
    await expect(page).toHaveURL('/');
  });
});
