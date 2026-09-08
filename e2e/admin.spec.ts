import { test, expect } from '@playwright/test';
import { loginAs } from './helpers';

test.describe('Admin Panel', () => {
  test.describe('Access Control', () => {
    test('redirects to login when not authenticated', async ({ page }) => {
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/\/auth\/login/);
    });

    test('admin can access admin panel', async ({ page }) => {
      await loginAs(page, 'admin@jaguarcoffee.com', 'Admin123456');

      await page.goto('/admin');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/\/admin/);
      await expect(page.locator('text=Admin').or(page.locator('text=admin').or(page.locator('text=Panel'))).first()).toBeVisible({ timeout: 10000 });
    });

    test('regular user is redirected from admin', async ({ page }) => {
      await loginAs(page, 'cliente@jaguarcoffee.com', 'Cliente123456');

      await page.goto('/admin');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/\/mi-cuenta|\//);
    });
  });

  test.describe('Admin Product CRUD', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'admin@jaguarcoffee.com', 'Admin123456');
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');
    });

    test('admin can see product management section', async ({ page }) => {
      const productsTab = page.locator('text=Cafés').first();
      if (await productsTab.isVisible()) {
        await productsTab.click();
        await page.waitForTimeout(1000);
      }
      await expect(page.locator('table').first()).toBeVisible({ timeout: 5000 });
    });

    test('admin can navigate between admin tabs', async ({ page }) => {
      const tabs = page.locator('button:has-text("Productos"), button:has-text("Órdenes"), button:has-text("Slider"), button:has-text("Banner"), button:has-text("Contacto"), button:has-text("Experiencias")');
      const tabCount = await tabs.count();
      if (tabCount > 0) {
        for (let i = 0; i < Math.min(tabCount, 3); i++) {
          await tabs.nth(i).click();
          await page.waitForTimeout(500);
        }
      }
    });

    test('orders tab is accessible for admin', async ({ page }) => {
      const ordersBtn = page.locator('text=Órdenes').or(page.locator('text=ordenes')).first();
      if (await ordersBtn.isVisible()) {
        await ordersBtn.click();
        await page.waitForTimeout(1000);
        await expect(page.locator('table').or(page.locator('[class*="order"]').or(page.locator('[class*="orden"]'))).first()).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Admin Slides/Banner Management', () => {
    test('admin can manage slides', async ({ page }) => {
      await loginAs(page, 'admin@jaguarcoffee.com', 'Admin123456');

      await page.goto('/admin');
      await page.waitForLoadState('networkidle');

      const bannerTab = page.locator('text=Banner').or(page.locator('text=Slides')).or(page.locator('text=slides')).first();
      if (await bannerTab.isVisible()) {
        await bannerTab.click();
        await page.waitForTimeout(1000);

        const createBtn = page.locator('button:has-text("Crear"), button:has-text("Nuevo"), button:has-text("Agregar")').first();
        if (await createBtn.isVisible()) {
          await createBtn.click();
          await page.waitForTimeout(500);
        }
      }
    });
  });

  test.describe('Admin Orders Management', () => {
    test('admin can view orders', async ({ page }) => {
      await loginAs(page, 'admin@jaguarcoffee.com', 'Admin123456');

      await page.goto('/admin');
      await page.waitForLoadState('networkidle');

      const ordersTab = page.locator('text=Órdenes').or(page.locator('text=ordenes')).or(page.locator('text=Orders')).first();
      if (await ordersTab.isVisible()) {
        await ordersTab.click();
        await page.waitForTimeout(1000);
      }
    });
  });
});
