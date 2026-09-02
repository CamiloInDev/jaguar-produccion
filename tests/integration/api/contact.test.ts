import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';

process.env.NODE_ENV = 'test';

let app: any;

beforeAll(async () => {
  const helpers = await import('../../helpers');
  helpers.backupRealDb();
  await helpers.createTestDb();
  app = await helpers.createTestApp();
});

afterAll(async () => {
  const helpers = await import('../../helpers');
  await helpers.restoreRealDb();
});

async function getAdminCookies() {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@test.com', password: 'admin123' });
  return res.headers['set-cookie'] as unknown as string[];
}

describe('POST /api/contacto (public)', () => {
  it('creates a contact message', async () => {
    const res = await request(app)
      .post('/api/contacto')
      .send({ nombre: 'Test User', email: 'test@test.com', asunto: 'Test Subject', mensaje: 'This is a test message.' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.respondido).toBe(false);
  });

  it('rejects empty fields', async () => {
    const res = await request(app)
      .post('/api/contacto')
      .send({ nombre: 'Test' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('inválidos');
  });
});

describe('GET /api/contacto - Admin', () => {
  it('admin can list messages', async () => {
    const cookies = await getAdminCookies();
    const res = await request(app)
      .get('/api/contacto')
      .set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('PUT /api/contacto/:id/leer - Admin', () => {
  it('admin can mark message as read', async () => {
    const createRes = await request(app)
      .post('/api/contacto')
      .send({ nombre: 'Mark', email: 'mark@test.com', asunto: 'Read Test', mensaje: 'Mark as read.' });
    const msgId = createRes.body.data.id;

    const cookies = await getAdminCookies();
    const res = await request(app)
      .put(`/api/contacto/${msgId}/leer`)
      .set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
