import { test, expect } from '@playwright/test';
import { mockGestionnaire, setLoggedIn, mockAdminRoutes } from './helpers';

test.describe('Navigation sidebar (GESTIONNAIRE)', () => {
  test.beforeEach(async ({ page }) => {
    await setLoggedIn(page, mockGestionnaire);
    await mockAdminRoutes(page);
    await page.route('/api/membres', (route) => route.fulfill({ json: [] }));
    await page.route('/api/joueurs', (route) => route.fulfill({ json: [] }));
    await page.route('/api/matchs', (route) => route.fulfill({ json: [] }));
  });

  test('lien Membres navigue vers /admin/membres', async ({ page }) => {
    await page.goto('/admin');
    // Cibler par href — plus robuste que getByRole quand la sidebar utilise render props
    await page.locator('a[href="/admin/membres"]').click();
    await expect(page).toHaveURL('/admin/membres');
  });

  test('lien Équipes navigue vers /admin/equipes', async ({ page }) => {
    await page.goto('/admin');
    await page.locator('a[href="/admin/equipes"]').click();
    await expect(page).toHaveURL('/admin/equipes');
  });

  test('bouton Déconnexion redirige vers /', async ({ page }) => {
    await page.goto('/admin');
    // Scoper à l'aside pour éviter les doublons mobile/desktop
    await page.locator('aside').locator('button', { hasText: 'Déconnexion' }).click();
    await expect(page).toHaveURL('/');
  });
});
