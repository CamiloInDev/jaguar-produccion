import { afterAll } from 'vitest';

// Estas asignaciones deben ocurrir ANTES de que cualquier módulo importe
// server/config/env.ts, para que dotenv.config() (que no sobreescribe env
// vars ya definidas) respete estos valores de test — en particular DB_NAME,
// que evita que la suite toque la base de datos de desarrollo (jaguar_dev).
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_at_least_32_chars_long_12345';
process.env.MP_ACCESS_TOKEN = 'APP_USR-test-access-token-for-testing';
process.env.MP_WEBHOOK_SECRET = 'test_mp_webhook_secret_for_testing';
process.env.PORT = '0';
process.env.APP_URL = 'http://localhost:3000';
process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_PORT = process.env.DB_PORT || '3306';
process.env.DB_USER = process.env.DB_USER || 'root';
process.env.DB_PASSWORD = process.env.DB_PASSWORD ?? '';
process.env.DB_NAME = 'jaguar_test';

// Ningún test habla con Mercado Pago: las suites que tocan pagos mockean
// server/services/mercadopago (createPreference / getPayment / refundPayment).

afterAll(async () => {
  const { closePool } = await import('../server/config/db-pool');
  await closePool();
});
