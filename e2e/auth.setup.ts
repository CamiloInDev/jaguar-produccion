import { test as setup, expect } from '@playwright/test';
import { loginAs } from './helpers';

const authFile = 'e2e/.auth/user.json';

setup('authenticate as admin', async ({ page }) => {
  await loginAs(page, 'admin@jaguarcoffee.com', 'admin123');
  await page.waitForLoadState('networkidle');
  // Set privacy consent in localStorage
  await page.evaluate(() => {
    localStorage.setItem('jaguar_privacy_consent', JSON.stringify({ accepted: true, date: new Date().toISOString() }));
  });
  await page.context().storageState({ path: authFile });
});

setup('authenticate as regular user', async ({ page }) => {
  await loginAs(page, 'cliente@jaguarcoffee.com', 'cliente123');
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => {
    localStorage.setItem('jaguar_privacy_consent', JSON.stringify({ accepted: true, date: new Date().toISOString() }));
  });
  await page.context().storageState({ path: 'e2e/.auth/user.json' });
});
