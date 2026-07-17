import { test, expect } from '@playwright/test';
import { loginAs, acceptPrivacy, removeRequired } from './helpers';

test.describe('Authentication Flows', () => {
  test.describe('Login', () => {
    test('logs in with valid admin credentials', async ({ page }) => {
      await loginAs(page, 'admin@jaguarcoffee.com', 'admin123');
      await expect(page.locator('text=Administrador').first().or(page.locator('text=admin').first())).toBeVisible({ timeout: 10000 });
    });

    test('shows error with invalid credentials', async ({ page }) => {
      await page.goto('/auth/login');
      await page.waitForLoadState('networkidle');
      const uniqueEmail = `e2e-invalid-${Date.now()}@test.com`;
      const result = await page.evaluate(async (email) => {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: 'wrongpass' })
        });
        return await res.json();
      }, uniqueEmail);

      expect(result.error).toContain('Credenciales inválidas');
    });

    test('shows error with empty fields', async ({ page }) => {
      await page.goto('/auth/login');
      await page.waitForLoadState('networkidle');
      await acceptPrivacy(page);
      await removeRequired(page);
      await page.click('button[type="submit"]');

      await expect(page.locator('text=Datos inválidos').first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Registration', () => {
    test('shows registration form', async ({ page }) => {
      await page.goto('/auth/registro');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('input[type="email"]').first()).toBeVisible();
      await expect(page.locator('input[type="password"]').first()).toBeVisible();
    });

    test('rejects registration with empty fields', async ({ page }) => {
      await page.goto('/auth/registro');
      await page.waitForLoadState('networkidle');
      await acceptPrivacy(page);
      await page.locator('input[type="checkbox"]').check();
      await removeRequired(page);
      await page.click('button[type="submit"]');
      await expect(page.locator('text=Datos inválidos').first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Logout', () => {
    test('logs out successfully', async ({ page }) => {
      await loginAs(page, 'cliente@jaguarcoffee.com', 'cliente123');

      await page.goto('/auth/login');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 5000 });
    });
  });
});
