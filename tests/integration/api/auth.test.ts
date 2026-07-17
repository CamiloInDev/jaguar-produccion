import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';

process.env.NODE_ENV = 'test';

let app: any;

beforeAll(async () => {
  const helpers = await import('../../helpers');
  helpers.backupRealDb();
  helpers.createTestDb();
  app = await helpers.createTestApp();
});

afterAll(async () => {
  const helpers = await import('../../helpers');
  helpers.restoreRealDb();
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
  it('returns success for any email (no user enumeration)', async () => {
    const res = await request(app)
      .post('/api/auth/recuperar')
      .send({ email: 'noexiste@test.com' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
