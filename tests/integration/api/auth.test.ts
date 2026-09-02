import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
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

describe('POST /api/auth/registro', () => {
  it('registers a new user and returns user with cookie', async () => {
    const res = await request(app)
      .post('/api/auth/registro')
      .send({ email: 'nuevo@test.com', password: 'password123', nombre: 'Nuevo', apellido: 'Usuario', telefono: '3001112233' });
    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe('nuevo@test.com');
    expect(res.body.user.rol).toBe('cliente');
    expect(res.body.user).not.toHaveProperty('password_hash');
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('rejects registration with missing fields', async () => {
    const res = await request(app)
      .post('/api/auth/registro')
      .send({ email: 'test@test.com' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('inválidos');
  });

  it('rejects duplicate email (no user enumeration)', async () => {
    const res = await request(app)
      .post('/api/auth/registro')
      .send({ email: 'admin@test.com', password: 'test1234', nombre: 'Dup', apellido: 'User' });
    // No revelamos si el email existe — devolvemos success genérico
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'admin123' });
    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe('admin@test.com');
    expect(res.body.user.rol).toBe('admin');
  });

  it('rejects invalid password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'wrongpass' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Credenciales');
  });

  it('rejects non-existent email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'noexiste@test.com', password: 'test123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Credenciales');
  });

  it('rejects empty fields', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('inválidos');
  });
});

describe('GET /api/auth/me', () => {
  it('returns user when authenticated', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'admin123' });
    const cookies = loginRes.headers['set-cookie'] as unknown as string[];

    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('admin@test.com');
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});

describe('PUT /api/auth/perfil', () => {
  it('updates user profile', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'admin123' });
    const cookies = loginRes.headers['set-cookie'] as unknown as string[];

    const res = await request(app)
      .put('/api/auth/perfil')
      .set('Cookie', cookies)
      .send({ nombre: 'Updated', apellido: 'Admin' });
    expect(res.status).toBe(200);
    expect(res.body.user.nombre).toBe('Updated');
  });

  it('rejects update without auth', async () => {
    const res = await request(app)
      .put('/api/auth/perfil')
      .send({ nombre: 'X', apellido: 'Y' });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  it('clears the token cookie', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('POST /api/auth/recuperar', () => {
  it('returns generic success for a non-existent email (no user enumeration)', async () => {
    const res = await request(app)
      .post('/api/auth/recuperar')
      .send({ email: 'noexiste@test.com' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns the same generic message for an existing email', async () => {
    const res = await request(app)
      .post('/api/auth/recuperar')
      .send({ email: 'admin@test.com' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('Si el correo está registrado');
  });

  it('rejects an invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/recuperar')
      .send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/restablecer', () => {
  // Cada test resetea la contraseña de cliente@test.com — se re-siembra la BD
  // antes de cada uno para que no se contaminen entre sí ni con otros describe.
  beforeEach(async () => {
    const helpers = await import('../../helpers');
    await helpers.createTestDb();
  });

  it('resets the password with a valid token and allows login with the new password', async () => {
    const { dbService } = await import('../../../server/db');
    const user = await dbService.getUserByEmail('cliente@test.com');
    const rawToken = await dbService.createPasswordResetToken(user!.id);

    const res = await request(app)
      .post('/api/auth/restablecer')
      .send({ token: rawToken, password: 'nuevaClave123' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'cliente@test.com', password: 'nuevaClave123' });
    expect(loginRes.status).toBe(200);
  });

  it('rejects an already-used token', async () => {
    const { dbService } = await import('../../../server/db');
    const user = await dbService.getUserByEmail('cliente@test.com');
    const rawToken = await dbService.createPasswordResetToken(user!.id);

    await request(app).post('/api/auth/restablecer').send({ token: rawToken, password: 'otraClave123' });
    const secondAttempt = await request(app)
      .post('/api/auth/restablecer')
      .send({ token: rawToken, password: 'terceraClave123' });
    expect(secondAttempt.status).toBe(400);
  });

  it('rejects an invalid/unknown token', async () => {
    const res = await request(app)
      .post('/api/auth/restablecer')
      .send({ token: 'a'.repeat(64), password: 'nuevaClave123' });
    expect(res.status).toBe(400);
  });

  it('rejects a password shorter than 8 characters', async () => {
    const res = await request(app)
      .post('/api/auth/restablecer')
      .send({ token: 'a'.repeat(64), password: 'short' });
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/auth/password', () => {
  // Igual que arriba: re-sembrar antes de cada test para no depender del
  // password mutado por el describe anterior ni por tests previos de este.
  beforeEach(async () => {
    const helpers = await import('../../helpers');
    await helpers.createTestDb();
  });

  async function getClienteCookies() {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'cliente@test.com', password: 'cliente123' });
    return res.headers['set-cookie'] as unknown as string[];
  }

  it('changes the password when the current password is correct', async () => {
    const cookies = await getClienteCookies();
    const res = await request(app)
      .put('/api/auth/password')
      .set('Cookie', cookies)
      .send({ currentPassword: 'cliente123', newPassword: 'clienteNueva123' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'cliente@test.com', password: 'clienteNueva123' });
    expect(loginRes.status).toBe(200);
  });

  it('rejects when the current password is wrong', async () => {
    const cookies = await getClienteCookies();
    const res = await request(app)
      .put('/api/auth/password')
      .set('Cookie', cookies)
      .send({ currentPassword: 'wrongpass', newPassword: 'otraClave123' });
    expect(res.status).toBe(400);
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app)
      .put('/api/auth/password')
      .send({ currentPassword: 'cliente123', newPassword: 'otraClave123' });
    expect(res.status).toBe(401);
  });
});
