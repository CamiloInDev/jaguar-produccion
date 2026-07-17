import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    globals: false,
    environment: 'node',
    // NOTA: los tests de integración (tests/integration/**) están pausados tras la
    // migración a MySQL. Requieren una base de datos MySQL de prueba y una reescritura
    // del harness (createTestDb → seeding SQL). Ver README-DEPLOY.md § "Tests pendientes".
    include: ['tests/unit/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'e2e', 'tests/integration'],
    setupFiles: ['tests/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['server/**/*.ts', 'src/**/*.ts'],
      exclude: ['node_modules', 'dist', 'tests', 'e2e', '**/*.d.ts'],
    },
  },
});
