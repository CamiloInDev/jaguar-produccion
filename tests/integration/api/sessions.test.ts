import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

process.env.NODE_ENV = 'test';

// Sesiones: el rol y la vigencia se leen de la BD en cada petición (server/middleware/auth.ts).
// Antes el rol salía del JWT: un cambio de rol no aplicaba hasta volver a iniciar sesión, un
// admin degradado o borrado conservaba el acceso hasta 7 días, y cambiar la contraseña no
// cerraba las demás sesiones.

let app: any;
let pool: any;

beforeAll(async () => {
  const helpers = await import('../../helpers');
  await helpers.createTestDb();
  app = await helpers.createTestApp();
  pool = (await import('../../../server/config/db-pool')).pool;
});

afterAll(async () => {
  const helpers = await import('../../helpers');
  await helpers.restoreRealDb();
});

beforeEach(async () => {
  // Estado conocido para cada test (algunos cambian rol/contraseña del cliente)
  const { hashPassword } = await import('../../../server/db');
  await pool.query(
    "UPDATE users SET rol = 'cliente', token_version = 0, password_hash = ? WHERE id = 'usr_cliente'",
    [hashPassword('cliente123')]
  );
  await pool.query('DELETE FROM login_attempts');
});

async function login(email: string, password: string): Promise<string[]> {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  expect(res.status).toBe(200);
  return res.headers['set-cookie'] as unknown as string[];
}

const asCliente = () => login('cliente@test.com', 'cliente123');

describe('el rol se toma de la BD, no del token', () => {
  it('un usuario promovido a admin tiene acceso sin volver a iniciar sesión', async () => {
    const cookies = await asCliente();
    expect((await request(app).get('/api/usuarios').set('Cookie', cookies)).status).toBe(403);

    await pool.query("UPDATE users SET rol = 'admin' WHERE id = 'usr_cliente'");
    const res = await request(app).get('/api/usuarios').set('Cookie', cookies);
    expect(res.status).toBe(200);
  });

  it('un admin degradado pierde el acceso de inmediato', async () => {
    await pool.query("UPDATE users SET rol = 'admin' WHERE id = 'usr_cliente'");
    const cookies = await asCliente();
    expect((await request(app).get('/api/usuarios').set('Cookie', cookies)).status).toBe(200);

    await pool.query("UPDATE users SET rol = 'cliente' WHERE id = 'usr_cliente'");
    expect((await request(app).get('/api/usuarios').set('Cookie', cookies)).status).toBe(403);
  });

  it('un token manipulado para decir rol admin no da acceso', async () => {
    const forged = jwt.sign(
      { id: 'usr_cliente', email: 'cliente@test.com', rol: 'admin', tv: 0 },
      process.env.JWT_SECRET!,
      { expiresIn: 3600, issuer: 'cafe-jaguar', audience: process.env.APP_URL }
    );
    const res = await request(app).get('/api/usuarios').set('Cookie', [`token=${forged}`]);
    expect(res.status).toBe(403);
  });

  it('la sesión de un usuario que ya no existe se rechaza', async () => {
    const ghost = jwt.sign(
      { id: 'usr_no_existe', email: 'x@test.com', rol: 'admin', tv: 0 },
      process.env.JWT_SECRET!,
      { expiresIn: 3600, issuer: 'cafe-jaguar', audience: process.env.APP_URL }
    );
    const res = await request(app).get('/api/auth/me').set('Cookie', [`token=${ghost}`]);
    expect(res.status).toBe(401);
  });

  it('las sesiones emitidas antes de token_version (sin tv) siguen siendo válidas', async () => {
    const legacy = jwt.sign(
      { id: 'usr_cliente', email: 'cliente@test.com', rol: 'cliente' },
      process.env.JWT_SECRET!,
      { expiresIn: 3600, issuer: 'cafe-jaguar', audience: process.env.APP_URL }
    );
    expect((await request(app).get('/api/auth/me').set('Cookie', [`token=${legacy}`])).status).toBe(200);
  });

  it('rechaza un token de otro emisor o audiencia', async () => {
    const foreign = jwt.sign({ id: 'usr_cliente', tv: 0 }, process.env.JWT_SECRET!, { expiresIn: 3600, audience: 'https://otro-sitio.com' });
    expect((await request(app).get('/api/auth/me').set('Cookie', [`token=${foreign}`])).status).toBe(403);
  });
});

describe('cambiar la contraseña cierra las demás sesiones', () => {
  it('invalida la sesión de otro dispositivo pero mantiene la actual', async () => {
    const otroDispositivo = await asCliente();
    const esteDispositivo = await asCliente();

    const change = await request(app)
      .put('/api/auth/password')
      .set('Cookie', esteDispositivo)
      .send({ currentPassword: 'cliente123', newPassword: 'NuevaClave2026!' });
    expect(change.status).toBe(200);
    const renovada = change.headers['set-cookie'] as unknown as string[];
    expect(renovada?.some(c => c.startsWith('token='))).toBe(true);

    expect((await request(app).get('/api/auth/me').set('Cookie', otroDispositivo)).status).toBe(401);
    expect((await request(app).get('/api/auth/me').set('Cookie', renovada)).status).toBe(200);
  });

  it('restablecer por correo también invalida las sesiones abiertas', async () => {
    const sesion = await asCliente();
    const crypto = await import('crypto');
    const raw = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    await pool.query(
      'INSERT INTO password_resets (token_hash, user_id, expires_at, used, created_at) VALUES (?, ?, ?, 0, ?)',
      [hash, 'usr_cliente', String(Date.now() + 3600_000), new Date().toISOString()]
    );

    const res = await request(app).post('/api/auth/restablecer').send({ token: raw, password: 'OtraClave2026!' });
    expect(res.status).toBe(200);
    expect((await request(app).get('/api/auth/me').set('Cookie', sesion)).status).toBe(401);
  });
});

describe('DELETE /api/usuarios/:id con órdenes', () => {
  it('no deja borrar un usuario con historial de compras (409)', async () => {
    const admin = await login('admin@test.com', 'admin123');
    await pool.query(
      `INSERT INTO orders (id, user_id, estado, total, direccion_envio, created_at)
       VALUES ('JC-sess-1', 'usr_cliente', 'pagado', 25000, JSON_OBJECT('direccion','x','ciudad','y','departamento','z','telefono','1'), ?)`,
      [new Date().toISOString()]
    );
    const blocked = await request(app).delete('/api/usuarios/usr_cliente').set('Cookie', admin);
    expect(blocked.status).toBe(409);
    expect(blocked.body.error).toContain('orden');

    const [rows] = await pool.query("SELECT COUNT(*) AS n FROM users WHERE id = 'usr_cliente'");
    expect(Number(rows[0].n)).toBe(1);
    await pool.query("DELETE FROM orders WHERE id = 'JC-sess-1'");
  });
});
