import { test, expect } from '@playwright/test';
import { go } from './helpers';

test.describe('Calendario de reservas (BookingCalendar) - flujo real desde el navegador', () => {
  test('reserva un curso de la Academia eligiendo fecha desde el calendario', async ({ page }) => {
    // Cierra automáticamente cualquier pestaña nueva que abra WhatsApp (window.open) tras reservar.
    page.context().on('page', async (popup) => {
      try {
        await popup.close();
      } catch {
        // Ignorar si ya se cerró
      }
    });

    const ts = Date.now();
    const nombre = `E2E-TEST-Reserva-${ts}`;

    await go(page, '/academia');
    await expect(page.locator('#academia-view')).toBeVisible({ timeout: 10000 });

    // Selecciona el primer día disponible (no pasado, no ocupado, del mes actual)
    const availableDay = page.locator('button.aspect-square:not([disabled])').first();
    await expect(availableDay).toBeVisible({ timeout: 10000 });
    const dayLabel = (await availableDay.textContent())?.trim();
    expect(dayLabel).toBeTruthy();
    await availableDay.click();

    // Modal de reserva
    await expect(page.locator('text=Separar fecha')).toBeVisible({ timeout: 5000 });
    const modalForm = page.locator('form').first();
    await expect(modalForm).toBeVisible();

    await modalForm.locator('input[type="text"]').first().fill(nombre);
    await modalForm.locator('input[type="email"]').fill(`e2e-reserva-${ts}@example.com`);
    await modalForm.locator('input[type="tel"]').fill('3001234567');
    await modalForm.locator('input[type="number"]').fill('2');
    await modalForm.locator('textarea').fill('Reserva de prueba automatizada E2E.');

    const [postRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/reservas') && r.request().method() === 'POST'),
      modalForm.locator('button[type="submit"]').click(),
    ]);
    expect(postRes.status()).toBe(201);
    const postBody = await postRes.json();
    expect(postBody.success).toBe(true);
    expect(postBody.reservation.estado).toBe('pendiente');
    expect(postBody.reservation.nombre).toBe(nombre);

    // Feedback de éxito en la UI
    await expect(page.locator('text=¡Solicitud enviada!')).toBeVisible({ timeout: 10000 });

    // Espera a que se refresquen las fechas ocupadas tras la reserva exitosa
    await page.waitForResponse((r) => r.url().includes('/api/reservas/ocupadas'), { timeout: 10000 }).catch(() => {});

    await page.locator('button:has-text("Cerrar")').click();

    // La fecha reservada ahora debe aparecer como ocupada/no disponible
    const bookedDay = page.locator('button.aspect-square', { hasText: new RegExp(`^${dayLabel}$`) }).first();
    await expect(bookedDay).toBeDisabled({ timeout: 10000 });
  });
});
