import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import * as zlib from 'zlib';
import * as fs from 'fs';

process.env.NODE_ENV = 'test';

let app: any;

beforeAll(async () => {
  const helpers = await import('../../helpers');
  await helpers.createTestDb();
  app = await helpers.createTestApp();
});

afterAll(async () => {
  const helpers = await import('../../helpers');
  const { BACKUPS_DIR } = await import('../../../server/jobs/respaldo-bd');
  fs.rmSync(BACKUPS_DIR, { recursive: true, force: true });
  await helpers.restoreRealDb();
});

async function cookies(email: string, password: string) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.headers['set-cookie'] as unknown as string[];
}

/** supertest no junta binarios por defecto: se lee el cuerpo como Buffer. */
function binario(res: any, cb: (err: Error | null, body: Buffer) => void) {
  const chunks: Buffer[] = [];
  res.on('data', (c: Buffer) => chunks.push(c));
  res.on('end', () => cb(null, Buffer.concat(chunks)));
}

describe('/api/respaldos', () => {
  it('admin crea, lista y descarga un respaldo importable', async () => {
    const admin = await cookies('admin@test.com', 'admin123');

    const creado = await request(app).post('/api/respaldos').set('Cookie', admin);
    expect(creado.status).toBe(201);
    expect(creado.body.nombre).toMatch(/^jaguar-\d{4}-\d{2}-\d{2}-\d{4}\.sql\.gz$/);

    const lista = await request(app).get('/api/respaldos').set('Cookie', admin);
    expect(lista.body.map((r: any) => r.nombre)).toContain(creado.body.nombre);

    const descarga = await request(app).get(`/api/respaldos/${creado.body.nombre}`).set('Cookie', admin)
      .buffer(true).parse(binario);
    expect(descarga.status).toBe(200);
    const sql = zlib.gunzipSync(descarga.body).toString('utf8');
    expect(sql).toContain('CREATE TABLE `orders`');
    expect(sql).toContain('INSERT INTO `products`');
    expect(sql).toContain('INSERT INTO `users`');
    // Las columnas JSON se guardan como texto JSON, no como "[object Object]".
    expect(sql).not.toContain('[object Object]');
  });

  it('un cliente no puede ver ni crear respaldos; sin sesión, 401', async () => {
    const cliente = await cookies('cliente@test.com', 'cliente123');
    expect((await request(app).get('/api/respaldos').set('Cookie', cliente)).status).toBe(403);
    expect((await request(app).post('/api/respaldos').set('Cookie', cliente)).status).toBe(403);
    expect((await request(app).get('/api/respaldos')).status).toBe(401);
  });

  it('no permite descargar archivos fuera de la carpeta de respaldos', async () => {
    const admin = await cookies('admin@test.com', 'admin123');
    for (const nombre of ['..%2F..%2F.env', 'server.ts', 'jaguar-2026-01-01-0000.sql.gz']) {
      expect((await request(app).get(`/api/respaldos/${nombre}`).set('Cookie', admin)).status).toBe(404);
    }
  });
});
