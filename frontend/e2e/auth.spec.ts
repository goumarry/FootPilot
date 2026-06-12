import { test, expect } from '@playwright/test';
import { mockGestionnaire, mockJoueur, mockAdminRoutes, mockJoueurRoutes } from './helpers';

test.describe('Authentification', () => {
  test('affiche le formulaire de connexion', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByPlaceholder('votre@email.com')).toBeVisible();
    await expect(page.getByPlaceholder('••••••••')).toBeVisible();
  });

  test('connexion GESTIONNAIRE redirige vers /admin', async ({ page }) => {
    await page.route('/api/auth/login', (route) =>
      route.fulfill({ json: { token: 'fake_jwt_token', user: mockGestionnaire } }),
    );
    await mockAdminRoutes(page);

    await page.goto('/login');
    await page.getByPlaceholder('votre@email.com').fill('gestionnaire@test.com');
    await page.getByPlaceholder('••••••••').fill('password123');
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL('/admin');
  });

  test('connexion JOUEUR redirige vers /dashboard', async ({ page }) => {
    await page.route('/api/auth/login', (route) =>
      route.fulfill({ json: { token: 'fake_jwt_token', user: mockJoueur } }),
    );
    await mockJoueurRoutes(page);

    await page.goto('/login');
    await page.getByPlaceholder('votre@email.com').fill('joueur@test.com');
    await page.getByPlaceholder('••••••••').fill('password123');
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL('/dashboard');
  });

  test("identifiants incorrects affiche un message d'erreur", async ({ page }) => {
    await page.route('/api/auth/login', (route) =>
      route.fulfill({
        status: 401,
        json: { message: 'Email ou mot de passe incorrect' },
      }),
    );

    await page.goto('/login');
    await page.getByPlaceholder('votre@email.com').fill('mauvais@test.com');
    await page.getByPlaceholder('••••••••').fill('mauvais');
    await page.locator('button[type="submit"]').click();

    await expect(page.getByText('Email ou mot de passe incorrect')).toBeVisible();
    await expect(page).toHaveURL('/login');
  });
});
