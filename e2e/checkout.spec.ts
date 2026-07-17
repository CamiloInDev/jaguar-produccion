import { test, expect } from '@playwright/test';
import { loginAs, go, removeRequired } from './helpers';

const CART_ITEM = {
  product_id: 1,
  cantidad: 1,
  product: { id: 1, nombre: 'Café Test', precio: 45000, stock: 10, categoria: '250gr', descripcion: 'Test', origen: 'Huila', tueste: 'Medio', imagen_url: 'https://example.com/img.jpg', precio_antes: null }
};

async function setupCart(page: any) {
  await page.addInitScript(() => {
    localStorage.setItem('jaguar_cart', JSON.stringify([{
      product_id: 1,
      cantidad: 1,
      product: { id: 1, nombre: 'Café Test', precio: 45000, stock: 10, categoria: '250gr', descripcion: 'Test', origen: 'Huila', tueste: 'Medio', imagen_url: 'https://example.com/img.jpg', precio_antes: null }
    }]));
  });
}

test.describe('Checkout Flow', () => {
  test('checkout page loads when unauthenticated', async ({ page }) => {
    await page.context().clearCookies();
    await go(page, '/checkout');
    await expect(page.locator('text=No hay artículos').first()).toBeVisible({ timeout: 5000 });
  });

  test('authenticated user can access checkout', async ({ page }) => {
    setupCart(page);
    await loginAs(page, 'cliente@jaguarcoffee.com', 'cliente123');
    await go(page, '/checkout');
    await expect(page.locator('#checkout-view').first()).toBeVisible({ timeout: 10000 });
  });

  test('checkout has shipping form', async ({ page }) => {
    setupCart(page);
    await loginAs(page, 'cliente@jaguarcoffee.com', 'cliente123');
    await go(page, '/checkout');
    await expect(page.locator('#checkout-view select').first()).toBeVisible({ timeout: 5000 });
  });

  test('confirmation page loads', async ({ page }) => {
    await page.goto('/checkout/confirmacion');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Confirmación').or(page.locator('text=confirmacion')).or(page.locator('text=gracias')).first()).toBeVisible({ timeout: 5000 });
  });
});
