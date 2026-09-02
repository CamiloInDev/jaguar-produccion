import { afterAll } from 'vitest';

// Estas asignaciones deben ocurrir ANTES de que cualquier módulo importe
// server/config/env.ts, para que dotenv.config() (que no sobreescribe env
// vars ya definidas) respete estos valores de test — en particular DB_NAME,
// que evita que la suite toque la base de datos de desarrollo (jaguar_dev).
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_at_least_32_chars_long_12345';
process.env.WOMPI_INTEGRITY_KEY = 'test_wompi_integrity_key_for_testing';
process.env.WOMPI_EVENTS_KEY = 'test_wompi_events_key_for_testing';
process.env.VITE_WOMPI_PUBLIC_KEY = 'pub_test_wompi_public_key_for_testing';
process.env.PORT = '0';
process.env.APP_URL = 'http://localhost:3000';
process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_PORT = process.env.DB_PORT || '3306';
process.env.DB_USER = process.env.DB_USER || 'root';
process.env.DB_PASSWORD = process.env.DB_PASSWORD ?? '';
process.env.DB_NAME = 'jaguar_test';

// Wompi real requiere una llamada de red para obtener el acceptance_token;
// en tests la simulamos para no depender de la disponibilidad del sandbox.
const originalFetch = global.fetch;
global.fetch = (async (input: any, init?: any) => {
  const url = typeof input === 'string' ? input : input?.url;
  if (typeof url === 'string' && url.includes('/merchants/')) {
    return new Response(JSON.stringify({
      data: {
        presigned_acceptance: { acceptance_token: 'test_acceptance_token' },
        presigned_personal_data_auth: { acceptance_token: 'test_personal_data_token' },
      },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  return originalFetch(input, init);
}) as typeof fetch;

afterAll(async () => {
  const { closePool } = await import('../server/config/db-pool');
  await closePool();
});
