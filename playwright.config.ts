import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    launchOptions: {
      args: ['--disable-background-networking'],
    },
  },

  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        locale: 'es-CO',
        timezoneId: 'America/Bogota',
      },
      dependencies: ['setup'],
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000/api/health',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
    // NODE_ENV=test desactiva el rate limiting (ver server/middleware/rateLimiter.ts) —
    // sin esto, correr toda la suite e2e de un tirón agota el límite de intentos de
    // auth (10/15min) y los tests que verifican mensajes de error específicos fallan
    // con 429 en vez del error esperado. Usa jaguar_dev igual (DB_NAME no cambia aquí).
    env: { NODE_ENV: 'test' },
  },
});
