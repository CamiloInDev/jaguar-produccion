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

describe('POST /api/ordenes/preparar-pago', () => {
  it('prepares payment signature when authenticated, using the real product price', async () => {
    const cookies = await getUserCookies();
    const res = await request(app)
      .post('/api/ordenes/preparar-pago')
      .set('Cookie', cookies)
      .send({ items: [{ product_id: 'prod_1', cantidad: 2 }] });
    expect(res.status).toBe(200);
    expect(res.body.reference).toBeTruthy();
    expect(res.body.signature).toBeTruthy();
    expect(res.body.amount).toBe(5000000); // prod_1.precio (25000) * 2 * 100
    expect(res.body.currency).toBe('COP');
    expect(res.body.publicKey).toBeTruthy();
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app)
      .post('/api/ordenes/preparar-pago')
      .send({ items: [{ product_id: 'prod_1', cantidad: 2 }] });
    expect(res.status).toBe(401);
  });

  it('rejects an empty or invalid cart', async () => {
    const cookies = await getUserCookies();
    const res = await request(app)
      .post('/api/ordenes/preparar-pago')
      .set('Cookie', cookies)
      .send({ items: [] });
    expect(res.status).toBe(400);
  });

  it('ignores a client-supplied price and recomputes it from the product table', async () => {
    // Regression test: /preparar-pago used to trust a client-supplied `total`
    // directly, so a tampered request could sign a Wompi charge for any amount.
    const cookies = await getUserCookies();
    const res = await request(app)
      .post('/api/ordenes/preparar-pago')
      .set('Cookie', cookies)
      .send({ total: 1, items: [{ product_id: 'prod_1', cantidad: 2 }] });
    expect(res.status).toBe(200);
    expect(res.body.amount).toBe(5000000); // real price, NOT the tampered total: 1
  });
});

describe('POST /api/ordenes/checkout', () => {
  it('creates an order when authenticated', async () => {
    const cookies = await getUserCookies();
    const res = await request(app)
      .post('/api/ordenes/checkout')
      .set('Cookie', cookies)
      .send({
        reference: 'ORDER-TEST-1',
        items: [{ product_id: 'prod_1', nombre: 'Test Product', precio_unit: 25000, cantidad: 2 }],
        total: 50000,
        direccion_envio: { direccion: 'Calle 123', ciudad: 'Bogotá', departamento: 'Cundinamarca', telefono: '3000000000' },
        notas: 'Test order',
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.order.estado).toBe('pendiente');
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app)
      .post('/api/ordenes/checkout')
      .send({ reference: 'ORDER-UNATH', items: [], total: 0, direccion_envio: { direccion: 'X', ciudad: 'Y', departamento: 'Z', telefono: '000' } });
    expect(res.status).toBe(401);
  });

  it('ignores a tampered precio_unit/total and stores the real product price instead', async () => {
    // Regression test: /checkout used to persist whatever `precio_unit`/`total`
    // the client sent, so a tampered request could record (and later charge)
    // an order at an arbitrary price instead of the real one in `products`.
    const cookies = await getUserCookies();
    const res = await request(app)
      .post('/api/ordenes/checkout')
      .set('Cookie', cookies)
      .send({
        reference: 'ORDER-TAMPERED-PRICE',
        items: [{ product_id: 'prod_1', nombre: 'Test Product', precio_unit: 1, cantidad: 2 }],
        total: 1,
        direccion_envio: { direccion: 'Calle 123', ciudad: 'Bogotá', departamento: 'Cundinamarca', telefono: '3000000000' },
      });
    expect(res.status).toBe(201);
    expect(res.body.order.total).toBe(50000); // prod_1.precio (25000) * 2, NOT the tampered 1
    expect(res.body.order.items[0].precio_unit).toBe(25000);
  });

  it('rejects an order for a product without enough stock', async () => {
    const cookies = await getUserCookies();
    const res = await request(app)
      .post('/api/ordenes/checkout')
      .set('Cookie', cookies)
      .send({
        reference: 'ORDER-NO-STOCK',
        items: [{ product_id: 'prod_1', nombre: 'Test Product', precio_unit: 25000, cantidad: 999 }],
        direccion_envio: { direccion: 'Calle 123', ciudad: 'Bogotá', departamento: 'Cundinamarca', telefono: '3000000000' },
      });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/ordenes', () => {
  it('returns user orders', async () => {
    const cookies = await getUserCookies();
    await request(app)
      .post('/api/ordenes/checkout')
      .set('Cookie', cookies)
      .send({
        reference: 'ORDER-TEST-2',
        items: [{ product_id: 'prod_1', nombre: 'Test', precio_unit: 25000, cantidad: 1 }],
        total: 25000,
        direccion_envio: { direccion: 'Calle 123', ciudad: 'Bogotá', departamento: 'Cundinamarca', telefono: '3000000000' },
      });
    const res = await request(app)
      .get('/api/ordenes')
      .set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });
});

describe('GET /api/ordenes/todas - Admin', () => {
  it('admin can see all orders', async () => {
    const cookies = await getAdminCookies();
    const res = await request(app)
      .get('/api/ordenes/todas')
      .set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('user cannot see all orders', async () => {
    const cookies = await getUserCookies();
    const res = await request(app)
      .get('/api/ordenes/todas')
      .set('Cookie', cookies);
    expect(res.status).toBe(403);
  });
});

describe('PUT /api/ordenes/:id/estado - Admin', () => {
  it('admin can update order status', async () => {
    const userCookies = await getUserCookies();
    await request(app)
      .post('/api/ordenes/checkout')
      .set('Cookie', userCookies)
      .send({
        reference: 'ORDER-STATUS-TEST',
        items: [{ product_id: 'prod_1', nombre: 'Test', precio_unit: 25000, cantidad: 1 }],
        total: 25000,
        direccion_envio: { direccion: 'Calle 123', ciudad: 'Bogotá', departamento: 'Cundinamarca', telefono: '3000000000' },
      });
    const adminCookies = await getAdminCookies();
    const res = await request(app)
      .put('/api/ordenes/ORDER-STATUS-TEST/estado')
      .set('Cookie', adminCookies)
      .send({ estado: 'pagado' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.order.estado).toBe('pagado');
  });

  it('user cannot update order status', async () => {
    const cookies = await getUserCookies();
    const res = await request(app)
      .put('/api/ordenes/fake-id/estado')
      .set('Cookie', cookies)
      .send({ estado: 'pagado' });
    expect(res.status).toBe(403);
  });
});

describe('POST /api/ordenes/wompi-test-trigger (requires admin)', () => {
  it('simulates wompi webhook for existing order', async () => {
    const cookies = await getAdminCookies();
    await request(app)
      .post('/api/ordenes/checkout')
      .set('Cookie', cookies)
      .send({
        reference: 'ORDER-WOMPI-TEST',
        items: [{ product_id: 'prod_1', nombre: 'Test', precio_unit: 25000, cantidad: 1 }],
        total: 25000,
        direccion_envio: { direccion: 'Calle 123', ciudad: 'Bogotá', departamento: 'Cundinamarca', telefono: '3000000000' },
      });
    const res = await request(app)
      .post('/api/ordenes/wompi-test-trigger')
      .set('Cookie', cookies)
      .send({ reference: 'ORDER-WOMPI-TEST', status: 'APPROVED' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('pagado');
  });

  it('returns 404 for non-existent reference', async () => {
    const cookies = await getAdminCookies();
    const res = await request(app)
      .post('/api/ordenes/wompi-test-trigger')
      .set('Cookie', cookies)
      .send({ reference: 'NONEXISTENT', status: 'APPROVED' });
    expect(res.status).toBe(404);
  });
});
