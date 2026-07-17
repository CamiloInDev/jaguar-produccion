import { test, expect } from '@playwright/test';

test.describe('Contact Page', () => {
  test('contact page loads with form', async ({ page }) => {
    await page.goto('/contacto');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 5000 });
  });

  test('submits contact form via API', async ({ page }) => {
    await page.goto('/contacto');
    await page.waitForLoadState('networkidle');

    const result = await page.evaluate(async () => {
      const res = await fetch('/api/contacto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: 'Test User',
          email: 'test@example.com',
          asunto: 'Test Subject',
          mensaje: 'E2E test message for contact form submission validation.'
        })
      });
      return await res.json();
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain('Mensaje recibido');
  });
});
