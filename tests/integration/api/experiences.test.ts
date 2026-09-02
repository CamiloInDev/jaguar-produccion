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

describe('GET /api/experiencias', () => {
  it('returns all experiences', async () => {
    const res = await request(app).get('/api/experiencias');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });
});

describe('GET /api/experiencias/:slug', () => {
  it('returns experience by slug', async () => {
    const res = await request(app).get('/api/experiencias/test-experience');
    expect(res.status).toBe(200);
    expect(res.body.slug).toBe('test-experience');
  });

  it('returns 404 for non-existent slug', async () => {
    const res = await request(app).get('/api/experiencias/no-existe');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/experiencias - Admin', () => {
  it('admin can create an experience', async () => {
    const cookies = await getAdminCookies();
    const res = await request(app)
      .post('/api/experiencias')
      .set('Cookie', cookies)
      .send({ nombre: 'New Experience', descripcion: 'A brand new experience', duracion_min: 120, precio: 100000, capacidad_max: 8, imagen_url: 'https://example.com/exp.jpg' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('user cannot create an experience', async () => {
    const cookies = await getUserCookies();
    const res = await request(app)
      .post('/api/experiencias')
      .set('Cookie', cookies)
      .send({ nombre: 'Hack', descripcion: 'X', duracion_min: 60, precio: 1000, capacidad_max: 1, imagen_url: 'https://x.com/x.jpg' });
    expect(res.status).toBe(403);
  });
});

describe('PUT /api/experiencias/:id - Admin', () => {
  it('admin can update an experience', async () => {
    const cookies = await getAdminCookies();
    await request(app)
      .post('/api/experiencias')
      .set('Cookie', cookies)
      .send({ nombre: 'Experience To Update', descripcion: 'Original description here', duracion_min: 60, precio: 50000, capacidad_max: 8, imagen_url: 'https://example.com/exp.jpg' });
    const all = await request(app).get('/api/experiencias');
    const exp = all.body.find((e: any) => e.nombre === 'Experience To Update');

    const res = await request(app)
      .put(`/api/experiencias/${exp.id}`)
      .set('Cookie', cookies)
      .send({ nombre: 'Updated Experience', descripcion: 'Updated description here', duracion_min: 90, precio: 60000, capacidad_max: 10, imagen_url: 'https://example.com/exp2.jpg' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('user cannot update an experience', async () => {
    const cookies = await getUserCookies();
    const res = await request(app)
      .put('/api/experiencias/exp_1')
      .set('Cookie', cookies)
      .send({ nombre: 'Hack', descripcion: 'Some description here', duracion_min: 60, precio: 1000, capacidad_max: 1, imagen_url: 'https://x.com/x.jpg' });
    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/experiencias/:id - Admin', () => {
  it('admin can delete an experience', async () => {
    const cookies = await getAdminCookies();
    const res = await request(app)
      .delete('/api/experiencias/exp_1')
      .set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('user cannot delete an experience', async () => {
    const cookies = await getUserCookies();
    const res = await request(app).delete('/api/experiencias/fake-id').set('Cookie', cookies);
    expect(res.status).toBe(403);
  });
});
