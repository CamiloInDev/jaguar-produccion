import { test, expect } from '@playwright/test';
import { loginAs, acceptPrivacy } from './helpers';

test.describe('Admin - Gestión de Usuarios real', () => {
  test('lista usuarios reales y permite cambiar el rol de un usuario de prueba', async ({ page }) => {
    page.on('dialog', (dialog) => dialog.accept());

    const ts = Date.now();
    const email = `e2e-test-user-${ts}@example.com`;

    // Registrar un usuario de prueba único vía API (no tocamos admin/cliente fijos)
    await page.goto('/auth/registro');
    await page.waitForLoadState('networkidle');
    await acceptPrivacy(page);

    const registerResult = await page.evaluate(async (userEmail) => {
      const res = await fetch('/api/auth/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          password: 'E2ETest123456',
          nombre: 'E2E',
          apellido: 'TestUser',
        }),
      });
      return { status: res.status, body: await res.json() };
    }, email);
    expect(registerResult.status).toBe(201);

    // Login como admin y navegar a la pestaña de Usuarios
    await loginAs(page, 'admin@jaguarcoffee.com', 'Admin123456');
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    await page.locator('button:has-text("Usuarios")').click();
    await page.waitForTimeout(300);

    // Fuerza un refresco de los datos del panel para asegurar que el usuario recién
    // registrado ya aparezca (evita una carrera con el loadData() inicial del montaje).
    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/usuarios') && r.request().method() === 'GET'),
      page.locator('button:has-text("Refrescar Panel")').click(),
    ]);

    // Verificar que la lista muestra usuarios reales (al menos el admin y el nuevo registrado)
    await expect(page.locator('table').first()).toBeVisible({ timeout: 10000 });
    const row = page.locator('tbody tr', { hasText: email });
    await expect(row).toBeVisible({ timeout: 15000 });

    const roleSelect = row.locator('select');
    await expect(roleSelect).toHaveValue('cliente');

    // Cambiar el rol del usuario de prueba (nunca admin/cliente fijos)
    const [roleRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/rol') && r.request().method() === 'PUT'),
      roleSelect.selectOption('editor'),
    ]);
    expect(roleRes.status()).toBe(200);

    // Confirmar que persiste tras refrescar los datos del panel
    await expect(page.locator('tbody tr', { hasText: email }).locator('select')).toHaveValue('editor', { timeout: 10000 });

    // Limpieza: eliminar el usuario de prueba (no es admin ni cliente fijo)
    const rowAfterRoleChange = page.locator('tbody tr', { hasText: email });
    const [deleteRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/usuarios/') && r.request().method() === 'DELETE'),
      rowAfterRoleChange.locator('button').click(),
    ]);
    expect(deleteRes.status()).toBe(200);

    await expect(page.locator('tbody tr', { hasText: email })).not.toBeVisible({ timeout: 10000 });
  });
});
