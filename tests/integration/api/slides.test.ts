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

describe('GET /api/slides (public)', () => {
  it('returns empty array when no slides', async () => {
    const res = await request(app).get('/api/slides');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('POST /api/slides - Admin', () => {
  it('admin can create a slide', async () => {
    const cookies = await getAdminCookies();
    const res = await request(app)
      .post('/api/slides')
      .set('Cookie', cookies)
      .send({ title: 'Test Slide', subtitle: 'Test Subtitle', badge: 'New Badge', buttonText: 'Shop Now', buttonLink: '/tienda', bgImage: 'https://example.com/bg.jpg', orden: 1, activo: true });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('user cannot create a slide', async () => {
    const cookies = await getUserCookies();
    const res = await request(app)
      .post('/api/slides')
      .set('Cookie', cookies)
      .send({ title: 'Hack', subtitle: 'X', badge: 'B', buttonText: 'Go', buttonLink: '/', bgImage: 'https://x.com/x.jpg' });
    expect(res.status).toBe(403);
  });

  it('rejects slide with missing required fields', async () => {
    const cookies = await getAdminCookies();
    const res = await request(app)
      .post('/api/slides')
      .set('Cookie', cookies)
      .send({ title: 'Incomplete' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/slides/all - Admin', () => {
  it('admin can list all slides', async () => {
    const cookies = await getAdminCookies();
    const res = await request(app)
      .get('/api/slides/all')
      .set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('user cannot list all slides', async () => {
    const cookies = await getUserCookies();
    const res = await request(app)
      .get('/api/slides/all')
      .set('Cookie', cookies);
    expect(res.status).toBe(403);
  });
});

describe('PUT /api/slides/:id - Admin', () => {
  it('admin can update a slide', async () => {
    const adminCookies = await getAdminCookies();
    await request(app)
      .post('/api/slides')
      .set('Cookie', adminCookies)
      .send({ title: 'Slide', subtitle: 'Sub', badge: 'Bdg', buttonText: 'Go', buttonLink: '/', bgImage: 'https://example.com/bg.jpg', orden: 1 });
    const all = await request(app).get('/api/slides/all').set('Cookie', adminCookies);
    const slide = all.body.find((s: any) => s.title === 'Slide');
    const slideId = slide.id;

    const res = await request(app)
      .put(`/api/slides/${slideId}`)
      .set('Cookie', adminCookies)
      .send({ title: 'Updated', subtitle: 'New Sub', badge: 'New', buttonText: 'Click', buttonLink: '/tienda', bgImage: 'https://example.com/new.jpg', orden: 2 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('DELETE /api/slides/:id - Admin', () => {
  it('admin can delete a slide', async () => {
    const cookies = await getAdminCookies();
    await request(app)
      .post('/api/slides')
      .set('Cookie', cookies)
      .send({ title: 'To Delete', subtitle: 'Sub', badge: 'Bdg', buttonText: 'Go', buttonLink: '/', bgImage: 'https://example.com/bg.jpg', orden: 1 });
    const all = await request(app).get('/api/slides/all').set('Cookie', cookies);
    const slideId = all.body[0].id;

    const res = await request(app)
      .delete(`/api/slides/${slideId}`)
      .set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('user cannot delete a slide', async () => {
    const cookies = await getUserCookies();
    const res = await request(app).delete('/api/slides/fake-id').set('Cookie', cookies);
    expect(res.status).toBe(403);
  });
});

describe('GET /api/slides/:id - Admin', () => {
  it('admin can get a specific slide', async () => {
    const cookies = await getAdminCookies();
    await request(app)
      .post('/api/slides')
      .set('Cookie', cookies)
      .send({ title: 'Specific', subtitle: 'Sub', badge: 'Bdg', buttonText: 'Go', buttonLink: '/', bgImage: 'https://example.com/bg.jpg', orden: 1 });
    const all = await request(app).get('/api/slides/all').set('Cookie', cookies);
    const slide = all.body.find((s: any) => s.title === 'Specific');
    const slideId = slide.id;

    const res = await request(app).get(`/api/slides/${slideId}`).set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Specific');
  });
});
