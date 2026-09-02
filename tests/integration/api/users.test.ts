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

describe('GET /api/usuarios - Admin only', () => {
  it('admin can list all users', async () => {
    const cookies = await getAdminCookies();
    const res = await request(app).get('/api/usuarios').set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
    expect(res.body.some((u: any) => u.password_hash)).toBe(false);
  });

  it('non-admin cannot list users', async () => {
    const cookies = await getUserCookies();
    const res = await request(app).get('/api/usuarios').set('Cookie', cookies);
    expect(res.status).toBe(403);
  });
});

describe('PUT /api/usuarios/:id/rol - Admin only', () => {
  it('admin can change another user\'s role', async () => {
    const cookies = await getAdminCookies();
    const res = await request(app)
      .put('/api/usuarios/usr_cliente/rol')
      .set('Cookie', cookies)
      .send({ rol: 'support' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.rol).toBe('support');
  });

  it('admin cannot change their own role', async () => {
    const cookies = await getAdminCookies();
    const res = await request(app)
      .put('/api/usuarios/usr_admin/rol')
      .set('Cookie', cookies)
      .send({ rol: 'cliente' });
    expect(res.status).toBe(400);
  });

  it('rejects an invalid role', async () => {
    const cookies = await getAdminCookies();
    const res = await request(app)
      .put('/api/usuarios/usr_cliente/rol')
      .set('Cookie', cookies)
      .send({ rol: 'superadmin' });
    expect(res.status).toBe(400);
  });

  it('non-admin cannot change roles', async () => {
    const cookies = await getUserCookies();
    const res = await request(app)
      .put('/api/usuarios/usr_admin/rol')
      .set('Cookie', cookies)
      .send({ rol: 'cliente' });
    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/usuarios/:id - Admin only', () => {
  it('admin cannot delete themselves', async () => {
    const cookies = await getAdminCookies();
    const res = await request(app).delete('/api/usuarios/usr_admin').set('Cookie', cookies);
    expect(res.status).toBe(400);
  });

  it('non-admin cannot delete users', async () => {
    const cookies = await getUserCookies();
    const res = await request(app).delete('/api/usuarios/usr_admin').set('Cookie', cookies);
    expect(res.status).toBe(403);
  });

  it('admin can delete another user', async () => {
    const cookies = await getAdminCookies();
    const res = await request(app).delete('/api/usuarios/usr_cliente').set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 404 deleting a non-existent user', async () => {
    const cookies = await getAdminCookies();
    const res = await request(app).delete('/api/usuarios/fake-id').set('Cookie', cookies);
    expect(res.status).toBe(404);
  });
});
