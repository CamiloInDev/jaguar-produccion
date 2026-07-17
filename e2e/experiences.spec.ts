import { test, expect } from '@playwright/test';
import { go } from './helpers';

test.describe('Experiences', () => {
  test('experiences page loads', async ({ page }) => {
    await page.goto('/experiencias');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Experiencias Sensoriales').first()).toBeVisible({ timeout: 5000 });
  });

  test('experience cards are visible', async ({ page }) => {
    await go(page, '/experiencias');
    await expect(page.locator('text=Ver Detalles').first()).toBeVisible({ timeout: 5000 });
  });

  test('navigates to experience detail', async ({ page }) => {
    await go(page, '/experiencias');
    const detailLink = page.locator('a[href*="/experiencias/"]').first();
    if (await detailLink.isVisible()) {
      await detailLink.click();
      await page.waitForURL(/\/experiencias\/.+/);
    }
  });
});
