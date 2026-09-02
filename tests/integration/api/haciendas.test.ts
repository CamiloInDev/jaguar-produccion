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

async function getUserCookies() {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'cliente@test.com', password: 'cliente123' });
  return res.headers['set-cookie'] as unknown as string[];
}

const validHaciendaPayload = {
  nombre: 'New Hacienda',
  tipo: 'Glamping',
  descripcion: 'A brand new hacienda for testing',
  descripcion_corta: 'Short description',
  ubicacion: 'Test location',
  capacidad_max: 6,
  precio_noche: 250000,
  imagen_url: '/images/TURISMO/GLAMP1.webp',
  galeria: ['/images/TURISMO/GLAMP1.webp'],
  features: [{ icono: 'Wifi', texto: 'WiFi gratuito' }],
  airbnb_url: 'https://www.airbnb.es/h/test',
  booking_url: '',
  google_maps_url: '',
  pet_friendly: true,
};

describe('GET /api/haciendas (public)', () => {
  it('returns active haciendas', async () => {
    const res = await request(app).get('/api/haciendas');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });
});

describe('GET /api/haciendas/:slug (public)', () => {
  it('returns hacienda by slug', async () => {
    const res = await request(app).get('/api/haciendas/test-hacienda');
    expect(res.status).toBe(200);
    expect(res.body.slug).toBe('test-hacienda');
  });

  it('returns 404 for non-existent slug', async () => {
    const res = await request(app).get('/api/haciendas/no-existe');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/haciendas - Admin', () => {
  it('admin can create a hacienda', async () => {
    const cookies = await getAdminCookies();
    const res = await request(app)
      .post('/api/haciendas')
      .set('Cookie', cookies)
      .send({ ...validHaciendaPayload, nombre: 'Admin Created Hacienda' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('user cannot create a hacienda', async () => {
    const cookies = await getUserCookies();
    const res = await request(app)
      .post('/api/haciendas')
      .set('Cookie', cookies)
      .send({ ...validHaciendaPayload, nombre: 'User Blocked Hacienda' });
    expect(res.status).toBe(403);
  });

  it('rejects hacienda with missing required fields', async () => {
    const cookies = await getAdminCookies();
    const res = await request(app)
      .post('/api/haciendas')
      .set('Cookie', cookies)
      .send({ nombre: 'Incomplete' });
    expect(res.status).toBe(400);
  });

  it('accepts a local image path (not just absolute URLs)', async () => {
    const cookies = await getAdminCookies();
    const res = await request(app)
      .post('/api/haciendas')
      .set('Cookie', cookies)
      .send({ ...validHaciendaPayload, nombre: 'Local Path Hacienda', imagen_url: '/images/TURISMO/HOSTAL1.webp' });
    expect(res.status).toBe(201);
  });
});

describe('GET /api/haciendas/all - Admin', () => {
  it('admin can list all haciendas', async () => {
    const cookies = await getAdminCookies();
    const res = await request(app)
      .get('/api/haciendas/all')
      .set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('user cannot list all haciendas', async () => {
    const cookies = await getUserCookies();
    const res = await request(app)
      .get('/api/haciendas/all')
      .set('Cookie', cookies);
    expect(res.status).toBe(403);
  });
});

describe('PUT /api/haciendas/:id - Admin', () => {
  it('admin can update a hacienda', async () => {
    const cookies = await getAdminCookies();
    await request(app).post('/api/haciendas').set('Cookie', cookies).send({ ...validHaciendaPayload, nombre: 'Hacienda To Update' });
    const all = await request(app).get('/api/haciendas/all').set('Cookie', cookies);
    const hacienda = all.body.find((h: any) => h.nombre === 'Hacienda To Update');

    const res = await request(app)
      .put(`/api/haciendas/${hacienda.id}`)
      .set('Cookie', cookies)
      .send({ ...validHaciendaPayload, nombre: 'Updated Hacienda' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('DELETE /api/haciendas/:id - Admin', () => {
  it('admin can delete a hacienda', async () => {
    const cookies = await getAdminCookies();
    await request(app).post('/api/haciendas').set('Cookie', cookies).send({ ...validHaciendaPayload, nombre: 'Hacienda To Delete' });
    const all = await request(app).get('/api/haciendas/all').set('Cookie', cookies);
    const hacienda = all.body.find((h: any) => h.nombre === 'Hacienda To Delete');

    const res = await request(app)
      .delete(`/api/haciendas/${hacienda.id}`)
      .set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('user cannot delete a hacienda', async () => {
    const cookies = await getUserCookies();
    const res = await request(app).delete('/api/haciendas/fake-id').set('Cookie', cookies);
    expect(res.status).toBe(403);
  });
});
