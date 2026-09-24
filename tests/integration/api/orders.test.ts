import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import * as crypto from 'crypto';

// vi.hoisted corre antes que los imports (que cargan server/config/env.ts).
// APP_URL HTTPS para que la preferencia incluya back_urls/notification_url como en
// producción (con APP_URL http Mercado Pago las descarta y el backend no las envía).
vi.hoisted(() => {
  process.env.NODE_ENV = 'test';
  process.env.APP_URL = 'https://jaguarcoffeeco.com';
});

// Ningún test toca la red: se mockean las llamadas a Mercado Pago, pero se conserva la
// validación REAL de la firma del webhook (verifyWebhookSignature).
vi.mock('../../../server/services/mercadopago', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../server/services/mercadopago')>();
  return {
    ...actual,
    createPreference: vi.fn(),
    getPayment: vi.fn(),
    refundPayment: vi.fn(),
  };
});

import * as mercadopago from '../../../server/services/mercadopago';

const createPreference = vi.mocked(mercadopago.createPreference);
const getPayment = vi.mocked(mercadopago.getPayment);

const WEBHOOK_SECRET = 'test_mp_webhook_secret_for_testing';
const ADDRESS = { direccion: 'Calle 123', ciudad: 'Bogotá', departamento: 'Cundinamarca', telefono: '3000000000' };

let app: any;
let pool: any;

beforeAll(async () => {
  const helpers = await import('../../helpers');
  helpers.backupRealDb();
  await helpers.createTestDb();
  app = await helpers.createTestApp();
  pool = (await import('../../../server/config/db-pool')).pool;
});

afterAll(async () => {
  const helpers = await import('../../helpers');
  await helpers.restoreRealDb();
});

beforeEach(() => {
  createPreference.mockReset();
  getPayment.mockReset();
  createPreference.mockResolvedValue({ id: 'pref_test_1', init_point: 'https://www.mercadopago.com.co/checkout/v1/redirect?pref_id=pref_test_1' });
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

/** Crea una orden real vía /crear-pago (preferencia mockeada) y devuelve su id. */
async function createOrder(cookies: string[], cantidad = 1): Promise<string> {
  const res = await request(app)
    .post('/api/ordenes/crear-pago')
    .set('Cookie', cookies)
    .send({ items: [{ product_id: 'prod_1', cantidad }], direccion_envio: ADDRESS });
  expect(res.status).toBe(201);
  return res.body.orderId;
}

async function getStock(productId = 'prod_1'): Promise<number> {
  const [rows] = await pool.query('SELECT stock FROM products WHERE id = ?', [productId]);
  return Number(rows[0].stock);
}

async function getOrderRow(id: string) {
  const [rows] = await pool.query('SELECT estado, payment_id, preference_id FROM orders WHERE id = ?', [id]);
  return rows[0];
}

/** Pago como lo devolvería GET /v1/payments/{id}. */
function mpPayment(overrides: Record<string, unknown>) {
  return {
    id: 1234567890, status: 'approved', status_detail: 'accredited',
    currency_id: 'COP', transaction_amount: 25000, external_reference: 'JC-x', ...overrides,
  } as any;
}

/**
 * Notificación firmada como la envía Mercado Pago. El manifest se arma aquí a mano
 * (no con buildSignatureManifest) para que el test no valide la implementación consigo misma.
 */
function sendWebhook(paymentId: string, opts: { secret?: string; omitSignature?: boolean } = {}) {
  const ts = String(Date.now());
  const requestId = crypto.randomUUID();
  const manifest = `id:${paymentId};request-id:${requestId};ts:${ts};`;
  const v1 = crypto.createHmac('sha256', opts.secret ?? WEBHOOK_SECRET).update(manifest).digest('hex');
  const req = request(app)
    .post(`/api/ordenes/mp-webhook?data.id=${paymentId}&type=payment`)
    .set('x-request-id', requestId);
  if (!opts.omitSignature) req.set('x-signature', `ts=${ts},v1=${v1}`);
  return req.send({ action: 'payment.updated', type: 'payment', data: { id: paymentId } });
}

describe('POST /api/ordenes/crear-pago', () => {
  it('creates a pending order and a Checkout Pro preference priced from the DB', async () => {
    const cookies = await getUserCookies();
    const res = await request(app)
      .post('/api/ordenes/crear-pago')
      .set('Cookie', cookies)
      .send({ items: [{ product_id: 'prod_1', cantidad: 2 }], direccion_envio: ADDRESS, notas: 'Moler fino' });

    expect(res.status).toBe(201);
    expect(res.body.init_point).toContain('mercadopago.com.co');
    expect(res.body.orderId).toMatch(/^[A-Za-z0-9_-]{1,64}$/);

    const [body, idempotencyKey] = createPreference.mock.calls[0];
    expect(body.external_reference).toBe(res.body.orderId);
    expect(body.items).toEqual([expect.objectContaining({ id: 'prod_1', unit_price: 25000, quantity: 2, currency_id: 'COP' })]);
    expect(body.payer?.email).toBe('cliente@test.com');
    expect(body.notification_url).toBe('https://jaguarcoffeeco.com/api/ordenes/mp-webhook');
    expect(body.back_urls?.success).toBe(`https://jaguarcoffeeco.com/checkout/confirmacion?ref=${res.body.orderId}`);
    expect(body.auto_return).toBe('approved');
    expect(body.statement_descriptor!.length).toBeLessThanOrEqual(13);
    expect(idempotencyKey).toContain(res.body.orderId);

    const row = await getOrderRow(res.body.orderId);
    expect(row.estado).toBe('pendiente');
    expect(row.preference_id).toBe('pref_test_1');
  });

  it('ignores a client-supplied price/total and charges the real product price', async () => {
    // Regresión de la auditoría 2026-09-10: el cliente no puede fijar el monto que cobra la pasarela.
    const cookies = await getUserCookies();
    const res = await request(app)
      .post('/api/ordenes/crear-pago')
      .set('Cookie', cookies)
      .send({ total: 1, items: [{ product_id: 'prod_1', cantidad: 2, precio_unit: 1 }], direccion_envio: ADDRESS });
    expect(res.status).toBe(201);
    expect(createPreference.mock.calls[0][0].items[0].unit_price).toBe(25000);

    const orders = await request(app).get('/api/ordenes').set('Cookie', cookies);
    const order = orders.body.find((o: any) => o.id === res.body.orderId);
    expect(order.total).toBe(50000);
    expect(order.items[0].precio_unit).toBe(25000);
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app)
      .post('/api/ordenes/crear-pago')
      .send({ items: [{ product_id: 'prod_1', cantidad: 1 }], direccion_envio: ADDRESS });
    expect(res.status).toBe(401);
    expect(createPreference).not.toHaveBeenCalled();
  });

  it('rejects an empty cart, missing stock, inactive products and incomplete addresses', async () => {
    const cookies = await getUserCookies();
    const cases = [
      { items: [], direccion_envio: ADDRESS },
      { items: [{ product_id: 'prod_1', cantidad: 999 }], direccion_envio: ADDRESS },
      { items: [{ product_id: 'prod_2', cantidad: 1 }], direccion_envio: ADDRESS },
      { items: [{ product_id: 'prod_1', cantidad: 1 }], direccion_envio: { ...ADDRESS, direccion: '' } },
    ];
    for (const payload of cases) {
      const res = await request(app).post('/api/ordenes/crear-pago').set('Cookie', cookies).send(payload);
      expect(res.status).toBe(400);
    }
    expect(createPreference).not.toHaveBeenCalled();
  });

  it('cancels the order and returns 502 if Mercado Pago fails to create the preference', async () => {
    createPreference.mockRejectedValueOnce(new Error('MP down'));
    const cookies = await getUserCookies();
    const res = await request(app)
      .post('/api/ordenes/crear-pago')
      .set('Cookie', cookies)
      .send({ items: [{ product_id: 'prod_1', cantidad: 1 }], direccion_envio: ADDRESS });
    expect(res.status).toBe(502);
    expect(res.body.error).not.toContain('MP down');

    const [rows] = await pool.query("SELECT estado FROM orders ORDER BY created_at DESC LIMIT 1");
    expect(rows[0].estado).toBe('cancelado');
  });
});

describe('POST /api/ordenes/mp-webhook', () => {
  it('rejects a missing or invalid signature with 401 and does not touch the order', async () => {
    const orderId = await createOrder(await getUserCookies());
    getPayment.mockResolvedValue(mpPayment({ external_reference: orderId }));

    const unsigned = await sendWebhook('111', { omitSignature: true });
    expect(unsigned.status).toBe(401);
    const forged = await sendWebhook('111', { secret: 'otro-secreto' });
    expect(forged.status).toBe(401);

    expect(getPayment).not.toHaveBeenCalled();
    expect((await getOrderRow(orderId)).estado).toBe('pendiente');
  });

  it('marks the order paid when the approved payment matches, and deducts stock only once', async () => {
    const orderId = await createOrder(await getUserCookies(), 2);
    getPayment.mockResolvedValue(mpPayment({ id: 555, external_reference: orderId, transaction_amount: 50000 }));
    const stockBefore = await getStock();

    const first = await sendWebhook('555');
    expect(first.status).toBe(200);
    expect(getPayment).toHaveBeenCalledWith('555');
    const row = await getOrderRow(orderId);
    expect(row.estado).toBe('pagado');
    expect(row.payment_id).toBe('555');
    expect(await getStock()).toBe(stockBefore - 2);

    // Mercado Pago reintenta y envía payment.created + payment.updated: idempotente.
    const retry = await sendWebhook('555');
    expect(retry.status).toBe(200);
    expect(await getStock()).toBe(stockBefore - 2);
  });

  it('does not mark paid when the amount or currency does not match the order (responds 200)', async () => {
    const cookies = await getUserCookies();
    const wrongAmount = await createOrder(cookies);
    getPayment.mockResolvedValueOnce(mpPayment({ id: 601, external_reference: wrongAmount, transaction_amount: 1 }));
    expect((await sendWebhook('601')).status).toBe(200);
    expect((await getOrderRow(wrongAmount)).estado).toBe('pendiente');

    const wrongCurrency = await createOrder(cookies);
    getPayment.mockResolvedValueOnce(mpPayment({ id: 602, external_reference: wrongCurrency, currency_id: 'USD' }));
    expect((await sendWebhook('602')).status).toBe(200);
    expect((await getOrderRow(wrongCurrency)).estado).toBe('pendiente');
  });

  it('never moves a paid order backwards on a late pending/rejected notification', async () => {
    const orderId = await createOrder(await getUserCookies());
    getPayment.mockResolvedValueOnce(mpPayment({ id: 701, external_reference: orderId }));
    await sendWebhook('701');
    expect((await getOrderRow(orderId)).estado).toBe('pagado');

    getPayment.mockResolvedValueOnce(mpPayment({ id: 702, external_reference: orderId, status: 'rejected' }));
    await sendWebhook('702');
    getPayment.mockResolvedValueOnce(mpPayment({ id: 701, external_reference: orderId, status: 'pending' }));
    await sendWebhook('701');

    const row = await getOrderRow(orderId);
    expect(row.estado).toBe('pagado');
    expect(row.payment_id).toBe('701'); // conserva el pago aprobado, no el intento rechazado
  });

  it('keeps a rejected payment pending (buyer can retry) and cancels on refund', async () => {
    const orderId = await createOrder(await getUserCookies());
    getPayment.mockResolvedValueOnce(mpPayment({ id: 801, external_reference: orderId, status: 'rejected' }));
    await sendWebhook('801');
    expect((await getOrderRow(orderId)).estado).toBe('pendiente');

    getPayment.mockResolvedValueOnce(mpPayment({ id: 802, external_reference: orderId }));
    await sendWebhook('802');
    expect((await getOrderRow(orderId)).estado).toBe('pagado');

    getPayment.mockResolvedValueOnce(mpPayment({ id: 802, external_reference: orderId, status: 'refunded' }));
    await sendWebhook('802');
    expect((await getOrderRow(orderId)).estado).toBe('cancelado');
  });

  it('returns 500 when the Mercado Pago API fails, so Mercado Pago retries', async () => {
    getPayment.mockRejectedValueOnce(new Error('ETIMEDOUT'));
    const res = await sendWebhook('901');
    expect(res.status).toBe(500);
  });

  it('acknowledges (200) unknown payments, unknown orders and non-payment topics', async () => {
    getPayment.mockResolvedValueOnce(null);
    expect((await sendWebhook('902')).status).toBe(200);

    getPayment.mockResolvedValueOnce(mpPayment({ id: 903, external_reference: 'JC-no-existe' }));
    expect((await sendWebhook('903')).status).toBe(200);

    const ts = String(Date.now());
    const manifest = `id:904;request-id:r1;ts:${ts};`;
    const v1 = crypto.createHmac('sha256', WEBHOOK_SECRET).update(manifest).digest('hex');
    const res = await request(app)
      .post('/api/ordenes/mp-webhook?data.id=904&type=merchant_order')
      .set('x-request-id', 'r1')
      .set('x-signature', `ts=${ts},v1=${v1}`)
      .send({});
    expect(res.status).toBe(200);
    expect(getPayment).toHaveBeenCalledTimes(2);
  });
});

describe('POST /api/ordenes/:id/verificar-pago', () => {
  it('lets the owner confirm the payment on return, without waiting for the webhook', async () => {
    const cookies = await getUserCookies();
    const orderId = await createOrder(cookies);
    getPayment.mockResolvedValueOnce(mpPayment({ id: 1001, external_reference: orderId }));

    const res = await request(app)
      .post(`/api/ordenes/${orderId}/verificar-pago`)
      .set('Cookie', cookies)
      .send({ payment_id: '1001' });
    expect(res.status).toBe(200);
    expect(res.body.order.estado).toBe('pagado');
  });

  it('rejects a payment that belongs to a different order', async () => {
    const cookies = await getUserCookies();
    const orderId = await createOrder(cookies);
    getPayment.mockResolvedValueOnce(mpPayment({ id: 1002, external_reference: 'JC-otra-orden' }));

    const res = await request(app)
      .post(`/api/ordenes/${orderId}/verificar-pago`)
      .set('Cookie', cookies)
      .send({ payment_id: '1002' });
    expect(res.status).toBe(400);
    expect((await getOrderRow(orderId)).estado).toBe('pendiente');
  });

  it('does not let another user verify (or discover) someone else\'s order', async () => {
    const orderId = await createOrder(await getUserCookies());
    const res = await request(app)
      .post(`/api/ordenes/${orderId}/verificar-pago`)
      .set('Cookie', await getAdminCookies())
      .send({ payment_id: '1003' });
    expect(res.status).toBe(404);
    expect(getPayment).not.toHaveBeenCalled();
  });

  it('validates the payment_id format', async () => {
    const cookies = await getUserCookies();
    const orderId = await createOrder(cookies);
    const res = await request(app)
      .post(`/api/ordenes/${orderId}/verificar-pago`)
      .set('Cookie', cookies)
      .send({ payment_id: '../../etc' });
    expect(res.status).toBe(400);
  });

  it('is safe when the webhook and the return verification arrive at the same time', async () => {
    const cookies = await getUserCookies();
    const orderId = await createOrder(cookies, 3);
    getPayment.mockResolvedValue(mpPayment({ id: 1004, external_reference: orderId, transaction_amount: 75000 }));
    const stockBefore = await getStock();

    await Promise.all([
      sendWebhook('1004'),
      request(app).post(`/api/ordenes/${orderId}/verificar-pago`).set('Cookie', cookies).send({ payment_id: '1004' }),
      sendWebhook('1004'),
    ]);
    expect((await getOrderRow(orderId)).estado).toBe('pagado');
    expect(await getStock()).toBe(stockBefore - 3);
  });
});

describe('GET /api/ordenes', () => {
  it('returns user orders', async () => {
    const cookies = await getUserCookies();
    await createOrder(cookies);
    const res = await request(app)
      .get('/api/ordenes')
      .set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });
});

describe('GET /api/ordenes/:id', () => {
  it('returns the order to its owner and to staff, 404 to anyone else', async () => {
    const userCookies = await getUserCookies();
    const orderId = await createOrder(userCookies);

    const own = await request(app).get(`/api/ordenes/${orderId}`).set('Cookie', userCookies);
    expect(own.status).toBe(200);
    expect(own.body.id).toBe(orderId);

    const staff = await request(app).get(`/api/ordenes/${orderId}`).set('Cookie', await getAdminCookies());
    expect(staff.status).toBe(200);

    const anon = await request(app).get(`/api/ordenes/${orderId}`);
    expect(anon.status).toBe(401);
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
    const orderId = await createOrder(await getUserCookies());
    const adminCookies = await getAdminCookies();
    const res = await request(app)
      .put(`/api/ordenes/${orderId}/estado`)
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

describe('POST /api/ordenes/pago-test-trigger (requires admin)', () => {
  it('simulates an approved payment for an existing order', async () => {
    const orderId = await createOrder(await getUserCookies());
    const res = await request(app)
      .post('/api/ordenes/pago-test-trigger')
      .set('Cookie', await getAdminCookies())
      .send({ reference: orderId, status: 'approved' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('pagado');
  });

  it('returns 404 for non-existent reference', async () => {
    const cookies = await getAdminCookies();
    const res = await request(app)
      .post('/api/ordenes/pago-test-trigger')
      .set('Cookie', cookies)
      .send({ reference: 'NONEXISTENT', status: 'approved' });
    expect(res.status).toBe(404);
  });
});
