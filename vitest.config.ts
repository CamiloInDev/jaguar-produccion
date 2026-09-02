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
    // Los tests de integración corren contra una BD MySQL de prueba (jaguar_test,
    // ver db/schema.sql). tests/setup.ts fija DB_NAME=jaguar_test antes de cualquier
    // import de server/config/env.ts para no tocar jaguar_dev.
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'e2e'],
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
