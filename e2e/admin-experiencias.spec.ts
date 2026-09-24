import { test, expect } from '@playwright/test';
import { loginAs } from './helpers';

test.describe('Admin - Experiencias CRUD real', () => {
  test('crea, edita y borra una experiencia', async ({ page }) => {
    page.on('dialog', (dialog) => dialog.accept());

    await loginAs(page, 'admin@jaguarcoffee.com', 'Admin123456');
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    await page.locator('button:has-text("Experiencias")').click();
    await page.waitForTimeout(300);

    const ts = Date.now();
    const nombre = `E2E-TEST-Experiencia-${ts}`;

    // --- Crear ---
    await page.locator('button:has-text("Crear Experiencia")').click();

    const form = page.locator('form').first();
    await expect(form).toBeVisible();

    // Inputs de texto en orden: Nombre, imagen_url (ImageUploadField)
    const textInputs = form.locator('input[type="text"]');
    await textInputs.nth(0).fill(nombre); // Nombre
    await textInputs.nth(1).fill('/images/e2e-test-experiencia.jpg'); // Imagen principal

    await form.locator('textarea').nth(0).fill('Descripción de prueba automatizada E2E para la experiencia de test.');

    // Inputs numéricos en orden: Precio, Duración (min), Capacidad máxima
    const numberInputs = form.locator('input[type="number"]');
    await numberInputs.nth(0).fill('95000'); // Precio
    await numberInputs.nth(1).fill('45'); // Duración minutos
    await numberInputs.nth(2).fill('8'); // Capacidad máxima

    const [createRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/experiencias') && r.request().method() === 'POST'),
      form.locator('button:has-text("Guardar Experiencia")').click(),
    ]);
    expect(createRes.status()).toBe(201);

    const row = page.locator('div.divide-y > div', { hasText: nombre });
    await expect(row).toBeVisible({ timeout: 10000 });
    await expect(row).toContainText('45 min');

    // --- Editar ---
    await row.locator('button').nth(0).click(); // Editar

    const editForm = page.locator('form').first();
    await expect(editForm).toBeVisible();
    // Duración distintiva para verificar la edición en la lista
    await editForm.locator('input[type="number"]').nth(1).fill('137');

    const [editRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/experiencias/') && r.request().method() === 'PUT'),
      editForm.locator('button:has-text("Guardar Experiencia")').click(),
    ]);
    expect(editRes.status()).toBe(200);

    const rowAfterFirstEdit = page.locator('div.divide-y > div', { hasText: nombre });
    await expect(rowAfterFirstEdit).toContainText('137 min');

    // --- Borrar (limpieza) ---
    const rowAfterEdit = page.locator('div.divide-y > div', { hasText: nombre });
    const [deleteRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/experiencias/') && r.request().method() === 'DELETE'),
      rowAfterEdit.locator('button').nth(1).click(), // Eliminar
    ]);
    expect(deleteRes.status()).toBe(200);

    await expect(page.locator(`text=${nombre}`)).not.toBeVisible({ timeout: 10000 });
  });
});
