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

function fakeOrder(estado: string, id = 'JC-e2e-1') {
  return {
    id, user_id: 'usr', estado, total: 45000, payment_id: estado === 'pagado' ? '123456' : undefined,
    direccion_envio: { direccion: 'Calle 10 # 43A-12', ciudad: 'Bogotá', departamento: 'Cundinamarca', telefono: '3000000000' },
    items: [{ product_id: 1, nombre: 'Café Test', precio_unit: 45000, cantidad: 1 }],
    created_at: new Date().toISOString(),
  };
}

test.describe('Checkout Flow', () => {
  test('checkout page loads when unauthenticated', async ({ page }) => {
    await page.context().clearCookies();
    await go(page, '/checkout');
    await expect(page.locator('text=No hay artículos').first()).toBeVisible({ timeout: 5000 });
  });

  test('authenticated user can access checkout', async ({ page }) => {
    setupCart(page);
    await loginAs(page, 'cliente@jaguarcoffee.com', 'Cliente123456');
    await go(page, '/checkout');
    await expect(page.locator('#checkout-view').first()).toBeVisible({ timeout: 10000 });
  });

  test('checkout has shipping form', async ({ page }) => {
    setupCart(page);
    await loginAs(page, 'cliente@jaguarcoffee.com', 'Cliente123456');
    await go(page, '/checkout');
    await expect(page.locator('#checkout-view select').first()).toBeVisible({ timeout: 5000 });
  });

  test('pay button sends only product_id + cantidad and redirects to the Mercado Pago init_point', async ({ page }) => {
    await setupCart(page);
    await loginAs(page, 'cliente@jaguarcoffee.com', 'Cliente123456');

    // Sin credenciales reales no se puede hablar con Mercado Pago: se intercepta el backend de
    // pagos y el "init_point" apunta de vuelta a la confirmación, como haría auto_return.
    let sentBody: any = null;
    await page.route('**/api/ordenes/crear-pago', async (route) => {
      sentBody = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        json: { orderId: 'JC-e2e-1', init_point: '/checkout/confirmacion?ref=JC-e2e-1&payment_id=123456&status=approved' },
      });
    });
    let verifiedPaymentId: string | null = null;
    await page.route('**/api/ordenes/JC-e2e-1/verificar-pago', async (route) => {
      verifiedPaymentId = route.request().postDataJSON()?.payment_id;
      await route.fulfill({ status: 200, json: { order: fakeOrder('pagado') } });
    });
    await page.route('**/api/ordenes/JC-e2e-1', (route) => route.fulfill({ status: 200, json: fakeOrder('pagado') }));

    await go(page, '/checkout');
    await page.locator('input[placeholder^="Ej. Calle"]').fill('Calle 10 # 43A-12');
    await page.locator('#checkout-view input[type="checkbox"]').check();
    await page.locator('button:has-text("Pagar con Mercado Pago")').click();

    await expect(page.locator('text=Pago Aprobado').first()).toBeVisible({ timeout: 10000 });
    expect(sentBody.items).toEqual([{ product_id: 1, cantidad: 1 }]); // sin precio ni total
    expect(sentBody.direccion_envio.direccion).toBe('Calle 10 # 43A-12');
    expect(verifiedPaymentId).toBe('123456');
  });

  test('confirmation shows a rejected payment and offers to retry', async ({ page }) => {
    await loginAs(page, 'cliente@jaguarcoffee.com', 'Cliente123456');
    await page.route('**/api/ordenes/JC-e2e-2/verificar-pago', (route) => route.fulfill({ status: 200, json: { order: fakeOrder('pendiente', 'JC-e2e-2') } }));
    await page.route('**/api/ordenes/JC-e2e-2', (route) => route.fulfill({ status: 200, json: fakeOrder('pendiente', 'JC-e2e-2') }));

    await go(page, '/checkout/confirmacion?ref=JC-e2e-2&payment_id=999&status=rejected');
    await expect(page.locator('text=Pago No Aprobado').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('a:has-text("Intentar de Nuevo")')).toBeVisible();
  });

  test('confirmation shows a pending (PSE/Efecty) payment as in process', async ({ page }) => {
    await loginAs(page, 'cliente@jaguarcoffee.com', 'Cliente123456');
    await page.route('**/api/ordenes/JC-e2e-3/verificar-pago', (route) => route.fulfill({ status: 200, json: { order: fakeOrder('pendiente', 'JC-e2e-3') } }));
    await page.route('**/api/ordenes/JC-e2e-3', (route) => route.fulfill({ status: 200, json: fakeOrder('pendiente', 'JC-e2e-3') }));

    await go(page, '/checkout/confirmacion?ref=JC-e2e-3&payment_id=998&status=pending');
    await expect(page.locator('text=Pago en Proceso').first()).toBeVisible({ timeout: 10000 });
  });

  test('confirmation page loads', async ({ page }) => {
    await page.goto('/checkout/confirmacion');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Confirmación').or(page.locator('text=confirmacion')).or(page.locator('text=gracias')).first()).toBeVisible({ timeout: 5000 });
  });
});
