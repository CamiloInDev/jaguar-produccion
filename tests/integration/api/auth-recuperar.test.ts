import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';

process.env.NODE_ENV = 'test';

// Reproducción del escenario H-01 de la auditoría: en producción SMTP_HOST está
// configurado y el envío FALLA (ese throw se esperaba en la ruta → 500 lento, que
// enumeraba cuentas y rompía la recuperación). Con el envío fire-and-forget la
// ruta ya no espera al correo: siempre responde el mismo 200 genérico.
vi.mock('../../../server/config/mailer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../server/config/mailer')>();
  return {
    ...actual,
    sendPasswordResetEmail: async () => {
      throw new Error('SMTP simulado caído (EHLO timeout)');
    },
  };
});

let app: any;

beforeAll(async () => {
  const helpers = await import('../../helpers');
  await helpers.createTestDb();
  app = await helpers.createTestApp();
});

afterAll(async () => {
  const helpers = await import('../../helpers');
  await helpers.restoreRealDb();
});

describe('POST /api/auth/recuperar con SMTP caído (H-01)', () => {
  it('responds the same generic 200 for an existing email even if sending fails', async () => {
    const res = await request(app)
      .post('/api/auth/recuperar')
      .send({ email: 'cliente@test.com' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('Si el correo está registrado');
  });

  it('responds the same generic 200 for a non-existent email', async () => {
    const res = await request(app)
      .post('/api/auth/recuperar')
      .send({ email: 'noexiste@test.com' });
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('Si el correo está registrado');
  });
});
