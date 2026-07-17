import { test, expect } from '@playwright/test';
import { go } from './helpers';

test.describe('Tienda (Store)', () => {
  test('loads product listing', async ({ page }) => {
    await go(page, '/tienda');
    await expect(page.locator('#shop-view').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Catálogo de Café').first()).toBeVisible({ timeout: 5000 });
  });

  test('has category filters', async ({ page }) => {
    await go(page, '/tienda');
    const activeFilter = page.locator('button:has-text("Todos"), button:has-text("250 gr")').first();
    await expect(activeFilter).toBeVisible({ timeout: 5000 });
  });

  test('product links go to detail page', async ({ page }) => {
    await go(page, '/tienda');
    const productLink = page.locator('a[href*="/tienda/"]').first();
    if (await productLink.isVisible()) {
      await productLink.click();
      await page.waitForURL(/\/tienda\/.+/);
    }
  });

  test('search input is visible', async ({ page }) => {
    await go(page, '/tienda');
    const searchInput = page.locator('input[placeholder*="origen"]').first();
    await expect(searchInput).toBeVisible({ timeout: 5000 });
  });
});
