import path from 'path';
import { fileURLToPath } from 'url';
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_IMAGE = path.join(__dirname, 'fixtures', 'test-image.png');

test.describe('Admin - Estadías (Haciendas) CRUD real', () => {
  test('crea, edita, sube imagen a la galería y borra una estadía', async ({ page }) => {
    page.on('dialog', (dialog) => dialog.accept());

    await loginAs(page, 'admin@jaguarcoffee.com', 'Admin123456');
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    await page.locator('button:has-text("Estadías")').click();
    await page.waitForTimeout(300);

    const ts = Date.now();
    const nombre = `E2E-TEST-Hacienda-${ts}`;

    // --- Crear ---
    await page.locator('button:has-text("Crear Estadía")').click();

    const form = page.locator('form').first();
    await expect(form).toBeVisible();

    // Inputs de texto en orden: Nombre, Tipo, Descripción corta, Ubicación, imagen_url, Airbnb, Booking, GoogleMaps
    const textInputs = form.locator('input[type="text"]');
    await textInputs.nth(0).fill(nombre); // Nombre
    await textInputs.nth(1).fill('E2E-Glamping'); // Tipo
    await textInputs.nth(2).fill('Estadía de prueba automatizada E2E.'); // Descripción corta
    await textInputs.nth(3).fill('E2E Test, Cundinamarca'); // Ubicación
    await textInputs.nth(4).fill('/images/e2e-test-main.jpg'); // Imagen principal (ruta simple, no requiere subida real aquí)

    await form.locator('textarea').nth(0).fill('Descripción completa de prueba automatizada para la estadía E2E. Incluye detalles de la finca cafetera de prueba.');

    const numberInputs = form.locator('input[type="number"]');
    await numberInputs.nth(1).fill('250000'); // Precio por noche (Capacidad máxima ya trae default 8)

    // Subida real de imagen en la GALERÍA (input de archivo dedicado, separado del ImageUploadField principal)
    const galleryFileInput = form.locator('input[type="file"]').nth(1);
    await galleryFileInput.setInputFiles(FIXTURE_IMAGE);
    await expect(form.locator('button:has-text("Subir y agregar a la galería")')).toBeVisible({ timeout: 15000 });
    const galeriaTextarea = form.locator('textarea').nth(1);
    await expect(galeriaTextarea).toHaveValue(/^\/uploads\/.+\.webp$/, { timeout: 5000 });

    const [createRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/haciendas') && r.request().method() === 'POST'),
      form.locator('button:has-text("Guardar Estadía")').click(),
    ]);
    expect(createRes.status()).toBe(201);

    await expect(page.locator(`text=${nombre}`)).toBeVisible({ timeout: 10000 });

    // --- Editar ---
    const row = page.locator('div.divide-y > div', { hasText: nombre });
    await row.locator('button').nth(0).click(); // Editar

    const editForm = page.locator('form').first();
    await expect(editForm).toBeVisible();
    // Capacidad máxima a un valor distintivo para verificar la edición en la lista
    await editForm.locator('input[type="number"]').nth(0).fill('77');

    const [editRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/haciendas/') && r.request().method() === 'PUT'),
      editForm.locator('button:has-text("Guardar Estadía")').click(),
    ]);
    expect(editRes.status()).toBe(200);

    const rowAfterFirstEdit = page.locator('div.divide-y > div', { hasText: nombre });
    await expect(rowAfterFirstEdit).toContainText('Máx 77');

    // --- Borrar (limpieza) ---
    const rowAfterEdit = page.locator('div.divide-y > div', { hasText: nombre });
    const [deleteRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/haciendas/') && r.request().method() === 'DELETE'),
      rowAfterEdit.locator('button').nth(1).click(), // Eliminar
    ]);
    expect(deleteRes.status()).toBe(200);

    await expect(page.locator(`text=${nombre}`)).not.toBeVisible({ timeout: 10000 });
  });
});
