import jwt from 'jsonwebtoken';
import { hashPassword } from '../server/db';
import { pool } from '../server/config/db-pool';

export const JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key_at_least_32_chars_long_12345';

export function createTestToken(overrides?: Partial<{ id: string; email: string; rol: 'cliente' | 'admin' }>) {
  return jwt.sign(
    { id: 'usr_test', email: 'test@test.com', rol: 'cliente', ...overrides },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

export function createAdminToken() {
  return createTestToken({ id: 'usr_admin', email: 'admin@test.com', rol: 'admin' });
}

export function createUserToken() {
  return createTestToken({ id: 'usr_cliente', email: 'cliente@test.com', rol: 'cliente' });
}

// Orden de borrado seguro: order_items depende de orders (FK ON DELETE CASCADE);
// el resto no tiene relaciones cruzadas en el esquema.
const TABLES_IN_DELETE_ORDER = [
  'order_items', 'orders', 'reservations', 'login_attempts', 'password_resets',
  'contact_messages', 'slides', 'experiences', 'haciendas', 'courses', 'products', 'users',
];

/** Vacía todas las tablas de la BD de test (jaguar_test) entre suites. */
export async function truncateTestDb(): Promise<void> {
  await pool.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const table of TABLES_IN_DELETE_ORDER) {
    await pool.query(`TRUNCATE TABLE ${table}`);
  }
  await pool.query('SET FOREIGN_KEY_CHECKS = 1');
}

/** Compat: la fixture ahora vive en MySQL (jaguar_test), ya no hay db.json que respaldar. */
export function backupRealDb(): void {}

export async function restoreRealDb(): Promise<void> {
  await truncateTestDb();
}

/** Crea el set de datos de fixture en jaguar_test (reemplaza el viejo db.json). */
export async function createTestDb() {
  await truncateTestDb();
  const now = new Date().toISOString();

  await pool.query('INSERT INTO users SET ?', [{
    id: 'usr_admin', email: 'admin@test.com', password_hash: hashPassword('admin123'),
    nombre: 'Admin', apellido: 'Test', telefono: '3000000000', rol: 'admin', created_at: now,
  }]);
  await pool.query('INSERT INTO users SET ?', [{
    id: 'usr_cliente', email: 'cliente@test.com', password_hash: hashPassword('cliente123'),
    nombre: 'Cliente', apellido: 'Test', telefono: '3000000001', rol: 'cliente', created_at: now,
  }]);

  await pool.query('INSERT INTO products SET ?', [{
    id: 'prod_1', slug: 'test-product', nombre: 'Test Product', descripcion: 'A test product',
    precio: 25000, precio_antes: 30000, stock: 50, categoria: '250gr', origen: 'Test',
    tueste: 'Medio', imagen_url: 'https://example.com/img.jpg', activo: 1, created_at: now,
  }]);
  await pool.query('INSERT INTO products SET ?', [{
    id: 'prod_2', slug: 'inactive-product', nombre: 'Inactive Product', descripcion: 'An inactive product',
    precio: 10000, precio_antes: null, stock: 10, categoria: '175gr', origen: 'Test',
    tueste: 'Oscuro', imagen_url: 'https://example.com/img2.jpg', activo: 0, created_at: now,
  }]);

  await pool.query('INSERT INTO experiences SET ?', [{
    id: 'exp_1', slug: 'test-experience', nombre: 'Test Experience', descripcion: 'A test experience',
    duracion_min: 60, precio: 50000, capacidad_max: 10, booking_widget: '<p>Booking</p>',
    imagen_url: 'https://example.com/exp.jpg', imagenes: JSON.stringify([]),
    detalles_incluidos: null, recomendaciones: null, activo: 1,
  }]);

  await pool.query('INSERT INTO haciendas SET ?', [{
    id: 'hac_1', slug: 'test-hacienda', nombre: 'Test Hacienda', tipo: 'Glamping',
    descripcion: 'A test hacienda', descripcion_corta: 'Short desc', ubicacion: 'Test location',
    capacidad_max: 8, precio_noche: 350000,
    imagen_url: 'https://example.com/hac.jpg', galeria: JSON.stringify([]), features: JSON.stringify([]),
    airbnb_url: 'https://airbnb.com/test', booking_url: 'https://booking.com/test',
    google_maps_url: null, pet_friendly: 1, orden: 1, activo: 1,
  }]);

  await pool.query('INSERT INTO courses SET ?', [{
    id: 'course_1', slug: 'test-course', title: 'Test Course', duration: '10 horas', level: 'Principiante',
    price: '$100.000', priceDetail: 'Detalle', description: 'A test course', syllabus: JSON.stringify(['Item 1', 'Item 2']),
    maxPeople: 10, orden: 1, activo: 1, created_at: now,
  }]);
}

export async function createTestApp() {
  const express = await import('express');
  const cookieParser = await import('cookie-parser');
  const helmet = await import('helmet');
  const app = express.default();

  app.use(helmet.default({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
  app.use(express.default.json());
  app.use(cookieParser.default());

  const authRoutes = (await import('../server/routes/auth')).default;
  const productRoutes = (await import('../server/routes/products')).default;
  const experienceRoutes = (await import('../server/routes/experiences')).default;
  const haciendaRoutes = (await import('../server/routes/haciendas')).default;
  const courseRoutes = (await import('../server/routes/courses')).default;
  const uploadRoutes = (await import('../server/routes/uploads')).default;
  const userRoutes = (await import('../server/routes/users')).default;
  const slideRoutes = (await import('../server/routes/slides')).default;
  const orderRoutes = (await import('../server/routes/orders')).default;
  const contactRoutes = (await import('../server/routes/contact')).default;
  const reservationRoutes = (await import('../server/routes/reservations')).default;

  app.get('/api/health', (_req: any, res: any) => res.json({ status: 'ok' }));
  app.use('/api/auth', authRoutes);
  app.use('/api/productos', productRoutes);
  app.use('/api/experiencias', experienceRoutes);
  app.use('/api/haciendas', haciendaRoutes);
  app.use('/api/cursos', courseRoutes);
  app.use('/api/uploads', uploadRoutes);
  app.use('/api/usuarios', userRoutes);
  app.use('/api/slides', slideRoutes);
  app.use('/api/ordenes', orderRoutes);
  app.use('/api/contacto', contactRoutes);
  app.use('/api/reservas', reservationRoutes);

  return app;
}
