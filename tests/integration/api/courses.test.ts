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

const validCoursePayload = {
  title: 'New Course',
  duration: '10 horas',
  level: 'Principiante',
  price: '$500.000',
  priceDetail: 'Detalle',
  description: 'A brand new course for testing',
  syllabus: ['Item 1', 'Item 2'],
  maxPeople: 12,
};

describe('GET /api/cursos (public)', () => {
  it('returns active courses', async () => {
    const res = await request(app).get('/api/cursos');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });
});

describe('GET /api/cursos/:slug (public)', () => {
  it('returns course by slug', async () => {
    const res = await request(app).get('/api/cursos/test-course');
    expect(res.status).toBe(200);
    expect(res.body.slug).toBe('test-course');
  });

  it('returns 404 for non-existent slug', async () => {
    const res = await request(app).get('/api/cursos/no-existe');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/cursos - Admin', () => {
  it('admin can create a course', async () => {
    const cookies = await getAdminCookies();
    const res = await request(app)
      .post('/api/cursos')
      .set('Cookie', cookies)
      .send({ ...validCoursePayload, title: 'Admin Created Course' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('user cannot create a course', async () => {
    const cookies = await getUserCookies();
    const res = await request(app)
      .post('/api/cursos')
      .set('Cookie', cookies)
      .send({ ...validCoursePayload, title: 'User Blocked Course' });
    expect(res.status).toBe(403);
  });

  it('rejects course with missing required fields', async () => {
    const cookies = await getAdminCookies();
    const res = await request(app)
      .post('/api/cursos')
      .set('Cookie', cookies)
      .send({ title: 'Incomplete' });
    expect(res.status).toBe(400);
  });

  it('creates a course without an image (optional field)', async () => {
    const cookies = await getAdminCookies();
    const res = await request(app)
      .post('/api/cursos')
      .set('Cookie', cookies)
      .send({ ...validCoursePayload, title: 'Course Without Image' });
    expect(res.status).toBe(201);
  });

  it('accepts a course with a local uploaded image path', async () => {
    const cookies = await getAdminCookies();
    const res = await request(app)
      .post('/api/cursos')
      .set('Cookie', cookies)
      .send({ ...validCoursePayload, title: 'Course With Image', imagen_url: '/uploads/img_test.webp' });
    expect(res.status).toBe(201);

    const all = await request(app).get('/api/cursos/all').set('Cookie', cookies);
    const course = all.body.find((c: any) => c.title === 'Course With Image');
    expect(course.imagen_url).toBe('/uploads/img_test.webp');
  });
});

describe('GET /api/cursos/all - Admin', () => {
  it('admin can list all courses', async () => {
    const cookies = await getAdminCookies();
    const res = await request(app)
      .get('/api/cursos/all')
      .set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('user cannot list all courses', async () => {
    const cookies = await getUserCookies();
    const res = await request(app)
      .get('/api/cursos/all')
      .set('Cookie', cookies);
    expect(res.status).toBe(403);
  });
});

describe('PUT /api/cursos/:id - Admin', () => {
  it('admin can update a course', async () => {
    const cookies = await getAdminCookies();
    await request(app).post('/api/cursos').set('Cookie', cookies).send({ ...validCoursePayload, title: 'Course To Update' });
    const all = await request(app).get('/api/cursos/all').set('Cookie', cookies);
    const course = all.body.find((c: any) => c.title === 'Course To Update');

    const res = await request(app)
      .put(`/api/cursos/${course.id}`)
      .set('Cookie', cookies)
      .send({ ...validCoursePayload, title: 'Updated Course' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('DELETE /api/cursos/:id - Admin', () => {
  it('admin can delete a course', async () => {
    const cookies = await getAdminCookies();
    await request(app).post('/api/cursos').set('Cookie', cookies).send({ ...validCoursePayload, title: 'Course To Delete' });
    const all = await request(app).get('/api/cursos/all').set('Cookie', cookies);
    const course = all.body.find((c: any) => c.title === 'Course To Delete');

    const res = await request(app)
      .delete(`/api/cursos/${course.id}`)
      .set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('user cannot delete a course', async () => {
    const cookies = await getUserCookies();
    const res = await request(app).delete('/api/cursos/fake-id').set('Cookie', cookies);
    expect(res.status).toBe(403);
  });
});
