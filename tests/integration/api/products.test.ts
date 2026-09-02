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

describe('GET /api/productos', () => {
  it('returns all active products', async () => {
    const res = await request(app).get('/api/productos');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('filters by categoria', async () => {
    const res = await request(app).get('/api/productos?categoria=250gr');
    expect(res.status).toBe(200);
    res.body.forEach((p: any) => expect(p.categoria).toBe('250gr'));
  });

  it('searches by query', async () => {
    const res = await request(app).get('/api/productos?q=test');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });
});

describe('GET /api/productos/:slug', () => {
  it('returns a product by slug', async () => {
    const res = await request(app).get('/api/productos/test-product');
    expect(res.status).toBe(200);
    expect(res.body.slug).toBe('test-product');
  });

  it('returns 404 for non-existent slug', async () => {
    const res = await request(app).get('/api/productos/no-existe');
    expect(res.status).toBe(404);
  });

  it('returns 404 for inactive product', async () => {
    const res = await request(app).get('/api/productos/inactive-product');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/productos - Admin', () => {
  it('admin can create a product', async () => {
    const cookies = await getAdminCookies();
    const res = await request(app)
      .post('/api/productos')
      .set('Cookie', cookies)
      .send({ nombre: 'New Product', descripcion: 'Brand new test product', precio: 30000, stock: 100, categoria: '250gr', origen: 'Test Origin', tueste: 'Medio', imagen_url: 'https://example.com/new.jpg' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('user cannot create a product', async () => {
    const cookies = await getUserCookies();
    const res = await request(app)
      .post('/api/productos')
      .set('Cookie', cookies)
      .send({ nombre: 'Unauthorized', descripcion: 'Should fail', precio: 10000, stock: 5, categoria: '250gr', origen: 'Test', tueste: 'Oscuro', imagen_url: 'https://example.com/img.jpg' });
    expect(res.status).toBe(403);
  });

  it('rejects product with missing fields', async () => {
    const cookies = await getAdminCookies();
    const res = await request(app)
      .post('/api/productos')
      .set('Cookie', cookies)
      .send({ nombre: 'Incomplete' });
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/productos/:id - Admin', () => {
  it('admin can update a product', async () => {
    const cookies = await getAdminCookies();
    const res = await request(app)
      .put('/api/productos/prod_1')
      .set('Cookie', cookies)
      .send({ nombre: 'Updated Product', descripcion: 'Updated description', precio: 35000, stock: 75, categoria: '250gr', origen: 'Updated Origin', tueste: 'Ligero', imagen_url: 'https://example.com/updated.jpg' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('user cannot update a product', async () => {
    const cookies = await getUserCookies();
    const res = await request(app)
      .put('/api/productos/prod_1')
      .set('Cookie', cookies)
      .send({ nombre: 'Hack', descripcion: 'Hack', precio: 1, stock: 1, categoria: '250gr', origen: 'H', tueste: 'M', imagen_url: 'https://x.com/x.jpg' });
    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/productos/:id - Admin', () => {
  it('admin can delete a product', async () => {
    const cookies = await getAdminCookies();
    const res = await request(app)
      .delete('/api/productos/prod_2')
      .set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('user cannot delete a product', async () => {
    const cookies = await getUserCookies();
    const res = await request(app)
      .delete('/api/productos/prod_1')
      .set('Cookie', cookies);
    expect(res.status).toBe(403);
  });
});
