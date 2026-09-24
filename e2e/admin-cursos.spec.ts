import path from 'path';
import { fileURLToPath } from 'url';
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_IMAGE = path.join(__dirname, 'fixtures', 'test-image.png');

test.describe('Admin - Cursos Academia CRUD real', () => {
  test('crea, edita, sube imagen y borra un curso', async ({ page }) => {
    page.on('dialog', (dialog) => dialog.accept());

    await loginAs(page, 'admin@jaguarcoffee.com', 'Admin123456');
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    await page.locator('button:has-text("Cursos Academia")').click();
    await page.waitForTimeout(300);

    const ts = Date.now();
    const title = `E2E-TEST-Curso-${ts}`;

    // --- Crear ---
    await page.locator('button:has-text("Crear Curso")').click();

    const form = page.locator('form').first();
    await expect(form).toBeVisible();

    // Inputs de texto en orden de aparición: Título, Nivel, Duración, Precio, Detalle de precio, imagen_url
    const textInputs = form.locator('input[type="text"]');
    await textInputs.nth(0).fill(title); // Título
    await textInputs.nth(1).fill('Principiante'); // Nivel
    await textInputs.nth(2).fill('12 horas'); // Duración
    await textInputs.nth(3).fill('$120.000'); // Precio
    await textInputs.nth(4).fill('Detalle de precio E2E'); // Detalle de precio (opcional)

    await form.locator('textarea').nth(0).fill('Descripción de prueba automatizada E2E para el curso de test.');

    // Subida real de imagen vía ImageUploadField
    const fileInput = form.locator('input[type="file"]').first();
    await fileInput.setInputFiles(FIXTURE_IMAGE);
    // Esperar a que el botón vuelva de "Subiendo..." a "Subir imagen" (subida terminada)
    await expect(form.locator('button:has-text("Subir imagen")')).toBeVisible({ timeout: 15000 });
    const imagenUrlInput = textInputs.nth(5); // input de imagen_url del ImageUploadField
    await expect(imagenUrlInput).toHaveValue(/^\/uploads\/.+\.webp$/, { timeout: 5000 });

    await form.locator('textarea').nth(1).fill('Historia del café E2E.\nPráctica de barismo E2E.');

    const [createRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/cursos') && r.request().method() === 'POST'),
      form.locator('button:has-text("Guardar Curso")').click(),
    ]);
    expect(createRes.status()).toBe(201);

    const row = page.locator('div.divide-y > div', { hasText: title });
    await expect(row).toBeVisible({ timeout: 10000 });
    await expect(row).toContainText('Principiante • 12 horas • $120.000');

    // --- Editar ---
    await row.locator('button').nth(0).click(); // Editar (Edit2)

    const editForm = page.locator('form').first();
    await expect(editForm).toBeVisible();
    const editedDuration = `E2E-EDITADO-${ts} horas`;
    await editForm.locator('input[type="text"]').nth(2).fill(editedDuration); // Duración

    const [editRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/cursos/') && r.request().method() === 'PUT'),
      editForm.locator('button:has-text("Guardar Curso")').click(),
    ]);
    expect(editRes.status()).toBe(200);

    const rowAfterFirstEdit = page.locator('div.divide-y > div', { hasText: title });
    await expect(rowAfterFirstEdit).toContainText(editedDuration);

    // --- Borrar (limpieza) ---
    const rowAfterEdit = page.locator('div.divide-y > div', { hasText: title });
    const [deleteRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/cursos/') && r.request().method() === 'DELETE'),
      rowAfterEdit.locator('button').nth(1).click(), // Eliminar (Trash2)
    ]);
    expect(deleteRes.status()).toBe(200);

    await expect(page.locator(`text=${title}`)).not.toBeVisible({ timeout: 10000 });
  });
});
