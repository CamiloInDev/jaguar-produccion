/**
 * Seed idempotente para MySQL (Hostinger Business).
 * ---------------------------------------------------------------------------
 * - Crea/actualiza el usuario admin desde ADMIN_EMAIL / ADMIN_PASSWORD (bcrypt).
 * - Importa el catálogo (productos, experiencias, haciendas, slides) desde el
 *   archivo `db.json` versionado en el repo (fuente de verdad actual).
 * - Es re-ejecutable: usa UPSERT (ON DUPLICATE KEY UPDATE), no duplica filas.
 *
 * Uso:  npm run db:seed
 * Requiere: schema.sql ya importado y variables DB_* + ADMIN_* configuradas.
 */
import * as fs from 'fs';
import * as path from 'path';
import { pool, closePool } from './config/db-pool';
import { env } from './config/env';
import { hashPassword } from './db';

async function upsert(table: string, row: Record<string, unknown>): Promise<void> {
  const cols = Object.keys(row);
  const placeholders = cols.map(() => '?').join(', ');
  const updates = cols.filter(c => c !== 'id').map(c => `\`${c}\` = VALUES(\`${c}\`)`).join(', ');
  const sql = `INSERT INTO \`${table}\` (${cols.map(c => `\`${c}\``).join(', ')}) VALUES (${placeholders})`
    + (updates ? ` ON DUPLICATE KEY UPDATE ${updates}` : '');
  await pool.query(sql, cols.map(c => row[c]));
}

async function seedAdmin(): Promise<void> {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
    throw new Error('Faltan ADMIN_EMAIL y/o ADMIN_PASSWORD en el entorno. Configúralas antes de ejecutar el seed.');
  }
  await upsert('users', {
    id: 'usr_admin',
    email: env.ADMIN_EMAIL,
    password_hash: hashPassword(env.ADMIN_PASSWORD),
    nombre: env.ADMIN_NOMBRE || 'Administrador',
    apellido: env.ADMIN_APELLIDO || 'Jaguar',
    telefono: '',
    rol: 'admin',
    created_at: new Date().toISOString(),
  });
  console.log(`[SEED] Admin listo: ${env.ADMIN_EMAIL}`);
}

/** Cuenta de prueba fija para desarrollo local y la suite e2e (e2e/helpers.ts). Nunca en producción. */
async function seedTestClient(): Promise<void> {
  if (env.NODE_ENV === 'production') return;
  await upsert('users', {
    id: 'usr_cliente_test',
    email: 'cliente@jaguarcoffee.com',
    password_hash: hashPassword('Cliente123456'),
    nombre: 'Cliente',
    apellido: 'De Prueba',
    telefono: '3000000000',
    rol: 'cliente',
    created_at: new Date().toISOString(),
  });
  console.log('[SEED] Cliente de prueba listo: cliente@jaguarcoffee.com');
}

function readDbJson(): any | null {
  const file = path.join(process.cwd(), 'db.json');
  if (!fs.existsSync(file)) {
    console.warn('[SEED] No se encontró db.json — se omite la importación de catálogo.');
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (err) {
    console.warn(`[SEED] db.json ilegible (${err}) — se omite la importación de catálogo.`);
    return null;
  }
}

async function seedCatalog(): Promise<void> {
  const data = readDbJson();
  if (!data) return;

  for (const p of data.products || []) {
    await upsert('products', {
      id: p.id,
      slug: p.slug,
      nombre: p.nombre,
      descripcion: p.descripcion,
      precio: p.precio,
      precio_antes: p.precio_antes ?? null,
      stock: p.stock,
      categoria: p.categoria,
      origen: p.origen,
      tueste: p.tueste,
      imagen_url: p.imagen_url,
      activo: p.activo ? 1 : 0,
      created_at: p.created_at || new Date().toISOString(),
    });
  }
  console.log(`[SEED] Productos: ${(data.products || []).length}`);

  for (const e of data.experiences || []) {
    await upsert('experiences', {
      id: e.id,
      slug: e.slug,
      nombre: e.nombre,
      descripcion: e.descripcion,
      duracion_min: e.duracion_min,
      precio: e.precio,
      capacidad_max: e.capacidad_max,
      booking_widget: e.booking_widget || '',
      imagen_url: e.imagen_url,
      imagenes: JSON.stringify(e.imagenes || []),
      detalles_incluidos: e.detalles_incluidos ? JSON.stringify(e.detalles_incluidos) : null,
      recomendaciones: e.recomendaciones ? JSON.stringify(e.recomendaciones) : null,
      activo: e.activo ? 1 : 0,
    });
  }
  console.log(`[SEED] Experiencias: ${(data.experiences || []).length}`);

  for (const h of data.haciendas || []) {
    await upsert('haciendas', {
      id: h.id,
      slug: h.slug,
      nombre: h.nombre,
      tipo: h.tipo,
      descripcion: h.descripcion,
      descripcion_corta: h.descripcion_corta || '',
      ubicacion: h.ubicacion,
      capacidad_max: h.capacidad_max ?? 8,
      precio_noche: h.precio_noche ?? 0,
      imagen_url: h.imagen_url,
      galeria: JSON.stringify(h.galeria || []),
      features: JSON.stringify(h.features || []),
      airbnb_url: h.airbnb_url || '',
      booking_url: h.booking_url || '',
      google_maps_url: h.google_maps_url || null,
      pet_friendly: h.pet_friendly ? 1 : 0,
      orden: h.orden ?? 1,
      activo: h.activo !== false ? 1 : 0,
    });
  }
  console.log(`[SEED] Haciendas: ${(data.haciendas || []).length}`);

  for (const c of data.courses || []) {
    await upsert('courses', {
      id: c.id,
      slug: c.slug,
      title: c.title,
      duration: c.duration,
      level: c.level,
      price: c.price,
      priceDetail: c.priceDetail || '',
      description: c.description,
      syllabus: JSON.stringify(c.syllabus || []),
      imagen_url: c.imagen_url || null,
      maxPeople: c.maxPeople ?? 10,
      orden: c.orden ?? 1,
      activo: c.activo !== false ? 1 : 0,
      created_at: c.created_at || new Date().toISOString(),
    });
  }
  console.log(`[SEED] Cursos: ${(data.courses || []).length}`);

  for (const s of data.slides || []) {
    await upsert('slides', {
      id: s.id,
      title: s.title,
      subtitle: s.subtitle,
      badge: s.badge,
      buttonText: s.buttonText,
      buttonLink: s.buttonLink,
      button2Text: s.button2Text ?? null,
      button2Link: s.button2Link ?? null,
      bgImage: s.bgImage,
      orden: s.orden ?? 1,
      activo: s.activo ? 1 : 0,
    });
  }
  console.log(`[SEED] Slides: ${(data.slides || []).length}`);
}

async function main(): Promise<void> {
  console.log('[SEED] Iniciando seed de MySQL...');
  await seedAdmin();
  await seedTestClient();
  await seedCatalog();
  console.log('[SEED] Completado ✅');
}

main()
  .then(async () => { await closePool(); process.exit(0); })
  .catch(async (err) => {
    console.error('[SEED] Error:', err.message || err);
    await closePool();
    process.exit(1);
  });
