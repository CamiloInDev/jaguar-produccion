import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';

process.env.NODE_ENV = 'test';

let app: any;

const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
};

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

describe('POST /api/reservas (public)', () => {
  it('creates a reservation', async () => {
    const res = await request(app)
      .post('/api/reservas')
      .send({ tipo: 'academia', item_id: 'exp_1', item_nombre: 'Test Experience', item_slug: 'test-exp', fecha: tomorrow(), nombre: 'Test User', email: 'test@test.com', telefono: '3000000000', cantidad_personas: 2, notas: 'Test notes' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.reservation.estado).toBe('pendiente');
  });

  it('rejects missing fields', async () => {
    const res = await request(app)
      .post('/api/reservas')
      .send({ tipo: 'academia' });
    expect(res.status).toBe(400);
  });

  it('rejects invalid tipo', async () => {
    const res = await request(app)
      .post('/api/reservas')
      .send({ tipo: 'invalid', item_id: 'x', item_nombre: 'x', fecha: tomorrow(), nombre: 'x', email: 'x@x.com', telefono: '300', cantidad_personas: 1 });
    expect(res.status).toBe(400);
  });

  it('rejects invalid email', async () => {
    const res = await request(app)
      .post('/api/reservas')
      .send({ tipo: 'academia', item_id: 'x', item_nombre: 'x', fecha: tomorrow(), nombre: 'x', email: 'not-an-email', telefono: '300', cantidad_personas: 1 });
    expect(res.status).toBe(400);
  });

  it('rejects past dates', async () => {
    const res = await request(app)
      .post('/api/reservas')
      .send({ tipo: 'academia', item_id: 'x', item_nombre: 'x', fecha: '2020-01-01', nombre: 'x', email: 'x@x.com', telefono: '300', cantidad_personas: 1 });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/reservas/ocupadas (public)', () => {
  it('returns occupied dates', async () => {
    const res = await request(app)
      .get('/api/reservas/ocupadas?tipo=academia&item_id=exp_1');
    expect(res.status).toBe(200);
    expect(res.body.dates).toBeDefined();
    expect(Array.isArray(res.body.dates)).toBe(true);
  });

  it('rejects missing params', async () => {
    const res = await request(app).get('/api/reservas/ocupadas');
    expect(res.status).toBe(400);
  });
});

describe('GET /api/reservas - Admin', () => {
  it('admin can list all reservations', async () => {
    const cookies = await getAdminCookies();
    const res = await request(app)
      .get('/api/reservas')
      .set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('PUT /api/reservas/:id/estado - Admin', () => {
  it('admin can update reservation status', async () => {
    const createRes = await request(app)
      .post('/api/reservas')
      .send({ tipo: 'academia', item_id: 'exp_1', item_nombre: 'Test', item_slug: 'test-exp', fecha: tomorrow(), nombre: 'Test', email: 'test@test.com', telefono: '3001112233', cantidad_personas: 1 });
    const resId = createRes.body.reservation.id;

    const cookies = await getAdminCookies();
    const res = await request(app)
      .put(`/api/reservas/${resId}/estado`)
      .set('Cookie', cookies)
      .send({ estado: 'confirmada' });
    expect(res.status).toBe(200);
    expect(res.body.reservation.estado).toBe('confirmada');
  });

  it('rejects invalid status', async () => {
    const cookies = await getAdminCookies();
    const res = await request(app)
      .put('/api/reservas/fake-id/estado')
      .set('Cookie', cookies)
      .send({ estado: 'invalid' });
    expect(res.status).toBe(400);
  });
});
