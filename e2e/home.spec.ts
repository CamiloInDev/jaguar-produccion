import { test, expect } from '@playwright/test';
import { go } from './helpers';

test.describe('Home Page', () => {
  test('loads and displays title', async ({ page }) => {
    await go(page, '/');
    await expect(page).toHaveTitle(/Jaguar Coffee/);
  });

  test('displays hero carousel', async ({ page }) => {
    await go(page, '/');
    await expect(page.locator('#hero-carousel').first()).toBeVisible({ timeout: 5000 });
  });

  test('displays navigation bar', async ({ page }) => {
    await go(page, '/');
    const nav = page.locator('nav').first();
    await expect(nav).toBeVisible();
    await expect(nav.locator('a:has-text("Productos")').first()).toBeVisible();
    await expect(nav.locator('a:has-text("Experiencias")').first()).toBeVisible();
    await expect(nav.locator('a:has-text("Academia")').first()).toBeVisible();
  });

  test('navigation links work', async ({ page }) => {
    await go(page, '/');
    await page.locator('a:has-text("Productos")').first().click();
    await page.waitForURL(/\/tienda/);
  });

  test('footer is visible', async ({ page }) => {
    await go(page, '/');
    const footer = page.locator('footer').first();
    await expect(footer).toBeVisible();
  });
});
