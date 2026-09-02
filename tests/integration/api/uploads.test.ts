import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';

process.env.NODE_ENV = 'test';

let app: any;

// PNG mínimo válido de 1x1 px, transparente.
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);

beforeAll(async () => {
  const helpers = await import('../../helpers');
  helpers.backupRealDb();
  await helpers.createTestDb();
  app = await helpers.createTestApp();
});

afterAll(async () => {
  const helpers = await import('../../helpers');
  await helpers.restoreRealDb();
  // Limpia los archivos que este archivo de tests haya generado.
  const { UPLOADS_DIR } = await import('../../../server/lib/uploads');
  if (fs.existsSync(UPLOADS_DIR)) {
    for (const f of fs.readdirSync(UPLOADS_DIR)) fs.unlinkSync(path.join(UPLOADS_DIR, f));
  }
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

describe('POST /api/uploads - Admin', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await request(app)
      .post('/api/uploads')
      .attach('image', TINY_PNG, { filename: 'test.png', contentType: 'image/png' });
    expect(res.status).toBe(401);
  });

  it('user cannot upload', async () => {
    const cookies = await getUserCookies();
    const res = await request(app)
      .post('/api/uploads')
      .set('Cookie', cookies)
      .attach('image', TINY_PNG, { filename: 'test.png', contentType: 'image/png' });
    expect(res.status).toBe(403);
  });

  it('admin can upload a valid image and gets back an optimized webp URL', async () => {
    const cookies = await getAdminCookies();
    const res = await request(app)
      .post('/api/uploads')
      .set('Cookie', cookies)
      .attach('image', TINY_PNG, { filename: 'test.png', contentType: 'image/png' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.url).toMatch(/^\/uploads\/img_.+\.webp$/);
  });

  it('rejects a non-image file', async () => {
    const cookies = await getAdminCookies();
    const res = await request(app)
      .post('/api/uploads')
      .set('Cookie', cookies)
      .attach('image', Buffer.from('not an image'), { filename: 'test.txt', contentType: 'text/plain' });
    expect(res.status).toBe(400);
  });

  it('rejects a request with no file', async () => {
    const cookies = await getAdminCookies();
    const res = await request(app)
      .post('/api/uploads')
      .set('Cookie', cookies);
    expect(res.status).toBe(400);
  });
});

describe('Orphan file cleanup', () => {
  it('deletes the uploaded file from disk when the product referencing it is deleted', async () => {
    const cookies = await getAdminCookies();
    const uploadRes = await request(app)
      .post('/api/uploads')
      .set('Cookie', cookies)
      .attach('image', TINY_PNG, { filename: 'test.png', contentType: 'image/png' });
    const { url } = uploadRes.body;

    const { UPLOADS_DIR } = await import('../../../server/lib/uploads');
    const filePath = path.join(UPLOADS_DIR, path.basename(url));
    expect(fs.existsSync(filePath)).toBe(true);

    await request(app)
      .post('/api/productos')
      .set('Cookie', cookies)
      .send({ nombre: 'Producto Con Foto Subida', descripcion: 'Descripción de prueba', precio: 10000, stock: 5, categoria: '250gr', origen: 'Test', tueste: 'Medio', imagen_url: url });
    const all = await request(app).get('/api/productos');
    const prod = all.body.find((p: any) => p.nombre === 'Producto Con Foto Subida');

    await request(app).delete(`/api/productos/${prod.id}`).set('Cookie', cookies);

    expect(fs.existsSync(filePath)).toBe(false);
  });

  it('does not touch external URLs when deleting a record', async () => {
    const cookies = await getAdminCookies();
    await request(app)
      .post('/api/productos')
      .set('Cookie', cookies)
      .send({ nombre: 'Producto Con Foto Externa', descripcion: 'Descripción de prueba', precio: 10000, stock: 5, categoria: '250gr', origen: 'Test', tueste: 'Medio', imagen_url: 'https://example.com/external.jpg' });
    const all = await request(app).get('/api/productos');
    const prod = all.body.find((p: any) => p.nombre === 'Producto Con Foto Externa');

    const res = await request(app).delete(`/api/productos/${prod.id}`).set('Cookie', cookies);
    expect(res.status).toBe(200);
  });
});
