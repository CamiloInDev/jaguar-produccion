import { test, expect } from '@playwright/test';
import { go } from './helpers';

test.describe('Cart Flow', () => {
  test('cart page loads', async ({ page }) => {
    await go(page, '/carrito');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Carrito').or(page.locator('text=carrito'))).toBeVisible({ timeout: 5000 });
  });

  test('navigation cart icon is visible', async ({ page }) => {
    await go(page, '/');
    const cartIcon = page.locator('a[href*="carrito"], button[aria-label*="carrito"], [class*="cart"]').first();
    await expect(cartIcon).toBeVisible({ timeout: 5000 });
  });

  test('cart link navigates to cart page', async ({ page }) => {
    await go(page, '/');
    const cartLink = page.locator('a[href*="carrito"]').first();
    if (await cartLink.isVisible()) {
      await cartLink.click();
      await page.waitForURL(/\/carrito/);
    }
  });
});
