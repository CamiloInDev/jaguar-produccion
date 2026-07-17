export async function acceptPrivacy(page: any) {
  const btn = page.locator('button:has-text("Acepto la política")');
  try {
    await btn.waitFor({ state: 'visible', timeout: 3000 });
    await btn.click();
  } catch {
    // Modal not shown, proceed
  }
}

export async function go(page: any, url: string) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  try {
    await page.waitForLoadState('networkidle', { timeout: 8000 });
  } catch {
    // Proceed even if network doesn't become idle
  }
  await acceptPrivacy(page);
}

export async function fillInput(page: any, selector: string, value: string) {
  await page.locator(selector).click();
  await page.locator(selector).fill(value);
}

export async function removeRequired(page: any) {
  await page.evaluate(() => {
    document.querySelectorAll('[required]').forEach(el => el.removeAttribute('required'));
  });
}

export async function submitForm(page: any) {
  await removeRequired(page);
  await page.locator('button[type="submit"]').click();
}

export async function loginAs(page: any, email: string, password: string) {
  await page.goto('/auth/login?returnUrl=/mi-cuenta');
  await page.waitForLoadState('networkidle');
  await acceptPrivacy(page);

  // Use sandbox preset buttons to fill credentials
  if (email.includes('admin')) {
    await page.locator('button:has-text("Cargar Administrador")').click();
  } else {
    await page.locator('button:has-text("Cargar Cliente de Prueba")').click();
  }
  await page.waitForTimeout(300);

  // Submit
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/mi-cuenta', { timeout: 15000 });
}
