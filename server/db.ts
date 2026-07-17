import * as crypto from 'crypto';
import bcrypt from 'bcryptjs';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { pool } from './config/db-pool';
import {
  Product, Experience, Hacienda, User, Order, ContactMessage,
  OrderStatus, OrderItem, CarouselSlide, Reservation, ReservationStatus
} from '../src/types';

// -----------------------------------------------------------------------------
// Password hashing (bcrypt) — se mantiene síncrono
// -----------------------------------------------------------------------------
export function hashPassword(password: string): string {
  const salt = bcrypt.genSaltSync(12);
  return bcrypt.hashSync(password, salt);
}

export function comparePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

// -----------------------------------------------------------------------------
// Helpers de mapeo fila -> objeto tipado
// -----------------------------------------------------------------------------
const toBool = (v: unknown): boolean => v === true || v === 1 || v === '1';

/** JSON de MySQL puede llegar como objeto (MySQL 8) o string (MariaDB). */
function parseJson<T>(val: unknown, fallback: T): T {
  if (val == null) return fallback;
  if (typeof val === 'object') return val as T;
  if (typeof val === 'string') {
    try { return JSON.parse(val) as T; } catch { return fallback; }
  }
  return fallback;
}

function rowToUser(r: RowDataPacket): User {
  return {
    id: r.id,
    email: r.email,
    nombre: r.nombre,
    apellido: r.apellido,
    telefono: r.telefono,
    rol: r.rol,
    created_at: r.created_at,
  };
}

function rowToProduct(r: RowDataPacket): Product {
  return {
    id: r.id,
    slug: r.slug,
    nombre: r.nombre,
    descripcion: r.descripcion,
    precio: Number(r.precio),
    precio_antes: r.precio_antes == null ? undefined : Number(r.precio_antes),
    stock: Number(r.stock),
    categoria: r.categoria,
    origen: r.origen,
    tueste: r.tueste,
    imagen_url: r.imagen_url,
    activo: toBool(r.activo),
    created_at: r.created_at,
  };
}

function rowToExperience(r: RowDataPacket): Experience {
  return {
    id: r.id,
    slug: r.slug,
    nombre: r.nombre,
    descripcion: r.descripcion,
    duracion_min: Number(r.duracion_min),
    precio: Number(r.precio),
    capacidad_max: Number(r.capacidad_max),
    booking_widget: r.booking_widget,
    imagen_url: r.imagen_url,
    imagenes: parseJson<string[]>(r.imagenes, []),
    detalles_incluidos: r.detalles_incluidos == null ? undefined : parseJson<string[]>(r.detalles_incluidos, []),
    recomendaciones: r.recomendaciones == null ? undefined : parseJson<string[]>(r.recomendaciones, []),
    activo: toBool(r.activo),
  };
}

function rowToHacienda(r: RowDataPacket): Hacienda {
  return {
    id: r.id,
    nombre: r.nombre,
    descripcion: r.descripcion,
    ubicacion: r.ubicacion,
    imagen_url: r.imagen_url,
    airbnb_url: r.airbnb_url,
    booking_url: r.booking_url,
  };
}

function rowToSlide(r: RowDataPacket): CarouselSlide {
  return {
    id: r.id,
    title: r.title,
    subtitle: r.subtitle,
    badge: r.badge,
    buttonText: r.buttonText,
    buttonLink: r.buttonLink,
    button2Text: r.button2Text ?? undefined,
    button2Link: r.button2Link ?? undefined,
    bgImage: r.bgImage,
    orden: Number(r.orden),
    activo: toBool(r.activo),
  };
}

function rowToReservation(r: RowDataPacket): Reservation {
  return {
    id: r.id,
    tipo: r.tipo,
    item_id: r.item_id,
    item_nombre: r.item_nombre,
    item_slug: r.item_slug,
    fecha: r.fecha,
    nombre: r.nombre,
    email: r.email,
    telefono: r.telefono,
    cantidad_personas: Number(r.cantidad_personas),
    estado: r.estado,
    notas: r.notas ?? undefined,
    created_at: r.created_at,
  };
}

function rowToContactMessage(r: RowDataPacket): ContactMessage {
  return {
    id: r.id,
    nombre: r.nombre,
    email: r.email,
    asunto: r.asunto,
    mensaje: r.mensaje,
    respondido: toBool(r.respondido),
    created_at: r.created_at,
  };
}

function rowToOrder(r: RowDataPacket, items: OrderItem[]): Order {
  return {
    id: r.id,
    user_id: r.user_id,
    user_email: r.user_email ?? undefined,
    estado: r.estado,
    total: Number(r.total),
    wompi_transaction_id: r.wompi_transaction_id ?? undefined,
    direccion_envio: parseJson(r.direccion_envio, {
      direccion: '', ciudad: '', departamento: '', telefono: ''
    }),
    notas: r.notas ?? undefined,
    items,
    created_at: r.created_at,
  };
}

/** Carga los ítems de un conjunto de órdenes agrupados por order_id. */
async function loadOrderItems(orderIds: string[]): Promise<Record<string, OrderItem[]>> {
  if (orderIds.length === 0) return {};
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT order_id, product_id, nombre, precio_unit, cantidad FROM order_items WHERE order_id IN (?)',
    [orderIds]
  );
  const grouped: Record<string, OrderItem[]> = {};
  for (const r of rows) {
    (grouped[r.order_id] ??= []).push({
      product_id: r.product_id,
      nombre: r.nombre,
      precio_unit: Number(r.precio_unit),
      cantidad: Number(r.cantidad),
    });
  }
  return grouped;
}

const slugify = (nombre: string): string =>
  nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// -----------------------------------------------------------------------------
// Servicio de base de datos (MySQL) — misma interfaz pública que la versión JSON,
// ahora con métodos asíncronos.
// -----------------------------------------------------------------------------
export const dbService = {
  // --------------------------------------------------------------------------
  // Users
  // --------------------------------------------------------------------------
  async getUsers(): Promise<User[]> {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM users ORDER BY created_at ASC');
    return rows.map(rowToUser);
  },

  async getUserByEmail(email: string): Promise<(User & { password_hash: string }) | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1',
      [email]
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    return { ...rowToUser(r), password_hash: r.password_hash };
  },

  async getUserById(id: string): Promise<User | null> {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
    return rows.length ? rowToUser(rows[0]) : null;
  },

  async createUser(user: {
    email: string; password_hash: string; nombre: string; apellido: string;
    telefono?: string; rol?: 'admin' | 'editor' | 'support' | 'cliente';
  }): Promise<User> {
    const newUser = {
      id: 'usr_' + crypto.randomUUID(),
      email: user.email,
      password_hash: user.password_hash,
      nombre: user.nombre,
      apellido: user.apellido,
      telefono: user.telefono || '',
      rol: user.rol || 'cliente',
      created_at: new Date().toISOString(),
    };
    await pool.query('INSERT INTO users SET ?', [newUser]);
    const { password_hash, ...safe } = newUser;
    return safe as User;
  },

  async updateUserProfile(userId: string, updates: { nombre: string; apellido: string; telefono?: string }): Promise<User | null> {
    const [res] = await pool.query<ResultSetHeader>(
      'UPDATE users SET nombre = ?, apellido = ?, telefono = ? WHERE id = ?',
      [updates.nombre, updates.apellido, updates.telefono || '', userId]
    );
    if (res.affectedRows === 0) return null;
    return this.getUserById(userId);
  },

  async getAllUsers(): Promise<User[]> {
    return this.getUsers();
  },

  async updateUserRole(userId: string, newRole: 'admin' | 'editor' | 'support' | 'cliente'): Promise<User | null> {
    const [res] = await pool.query<ResultSetHeader>('UPDATE users SET rol = ? WHERE id = ?', [newRole, userId]);
    if (res.affectedRows === 0) return null;
    return this.getUserById(userId);
  },

  async deleteUser(userId: string): Promise<boolean> {
    const [res] = await pool.query<ResultSetHeader>('DELETE FROM users WHERE id = ?', [userId]);
    return res.affectedRows > 0;
  },

  // --------------------------------------------------------------------------
  // Products
  // --------------------------------------------------------------------------
  async getProducts(): Promise<Product[]> {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM products ORDER BY created_at ASC');
    return rows.map(rowToProduct);
  },

  async getProductBySlug(slug: string): Promise<Product | null> {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM products WHERE slug = ? LIMIT 1', [slug]);
    if (rows.length === 0) return null;
    const p = rowToProduct(rows[0]);
    return p.activo ? p : null;
  },

  async getProductById(id: string): Promise<Product | null> {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM products WHERE id = ? LIMIT 1', [id]);
    return rows.length ? rowToProduct(rows[0]) : null;
  },

  async saveProduct(prod: Omit<Product, 'id' | 'created_at' | 'slug'> & { id?: string }): Promise<void> {
    const slug = slugify(prod.nombre);
    if (prod.id) {
      await pool.query(
        `UPDATE products SET nombre = ?, slug = ?, descripcion = ?, precio = ?, precio_antes = ?,
         stock = ?, categoria = ?, origen = ?, tueste = ?, imagen_url = ?, activo = ? WHERE id = ?`,
        [prod.nombre, slug, prod.descripcion, prod.precio, prod.precio_antes ?? null,
         prod.stock, prod.categoria, prod.origen, prod.tueste, prod.imagen_url,
         prod.activo !== undefined ? (prod.activo ? 1 : 0) : 1, prod.id]
      );
    } else {
      await pool.query('INSERT INTO products SET ?', [{
        id: 'prod_' + crypto.randomUUID(),
        slug,
        nombre: prod.nombre,
        descripcion: prod.descripcion,
        precio: prod.precio,
        precio_antes: prod.precio_antes ?? null,
        stock: prod.stock,
        categoria: prod.categoria,
        origen: prod.origen,
        tueste: prod.tueste,
        imagen_url: prod.imagen_url,
        activo: prod.activo !== undefined ? (prod.activo ? 1 : 0) : 1,
        created_at: new Date().toISOString(),
      }]);
    }
  },

  async deleteProduct(id: string): Promise<void> {
    await pool.query('DELETE FROM products WHERE id = ?', [id]);
  },

  // --------------------------------------------------------------------------
  // Experiences
  // --------------------------------------------------------------------------
  async getExperiences(): Promise<Experience[]> {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM experiences');
    return rows.map(rowToExperience);
  },

  async getExperienceBySlug(slug: string): Promise<Experience | null> {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM experiences WHERE slug = ? LIMIT 1', [slug]);
    return rows.length ? rowToExperience(rows[0]) : null;
  },

  async saveExperience(exp: Omit<Experience, 'id' | 'slug'> & { id?: string }): Promise<void> {
    const slug = slugify(exp.nombre);
    const imagenes = JSON.stringify(exp.imagenes || []);
    const detalles = exp.detalles_incluidos ? JSON.stringify(exp.detalles_incluidos) : null;
    const recomendaciones = exp.recomendaciones ? JSON.stringify(exp.recomendaciones) : null;
    if (exp.id) {
      await pool.query(
        `UPDATE experiences SET nombre = ?, slug = ?, descripcion = ?, duracion_min = ?, precio = ?,
         capacidad_max = ?, booking_widget = ?, imagen_url = ?, imagenes = ?, detalles_incluidos = ?,
         recomendaciones = ?, activo = ? WHERE id = ?`,
        [exp.nombre, slug, exp.descripcion, exp.duracion_min, exp.precio, exp.capacidad_max,
         exp.booking_widget, exp.imagen_url, imagenes, detalles, recomendaciones,
         exp.activo !== undefined ? (exp.activo ? 1 : 0) : 1, exp.id]
      );
    } else {
      await pool.query(
        `INSERT INTO experiences (id, slug, nombre, descripcion, duracion_min, precio, capacidad_max,
         booking_widget, imagen_url, imagenes, detalles_incluidos, recomendaciones, activo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['exp_' + crypto.randomUUID(), slug, exp.nombre, exp.descripcion, exp.duracion_min, exp.precio,
         exp.capacidad_max, exp.booking_widget, exp.imagen_url, imagenes, detalles, recomendaciones,
         exp.activo !== undefined ? (exp.activo ? 1 : 0) : 1]
      );
    }
  },

  async deleteExperience(id: string): Promise<void> {
    await pool.query('DELETE FROM experiences WHERE id = ?', [id]);
  },

  // --------------------------------------------------------------------------
  // Haciendas
  // --------------------------------------------------------------------------
  async getHaciendas(): Promise<Hacienda[]> {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM haciendas');
    return rows.map(rowToHacienda);
  },

  // --------------------------------------------------------------------------
  // Contact messages
  // --------------------------------------------------------------------------
  async saveContactMessage(msg: Omit<ContactMessage, 'id' | 'created_at' | 'respondido'>): Promise<ContactMessage> {
    const newMsg: ContactMessage = {
      id: 'msg_' + crypto.randomUUID(),
      nombre: msg.nombre,
      email: msg.email,
      asunto: msg.asunto,
      mensaje: msg.mensaje,
      respondido: false,
      created_at: new Date().toISOString(),
    };
    await pool.query('INSERT INTO contact_messages SET ?', [{ ...newMsg, respondido: 0 }]);
    return newMsg;
  },

  async getContactMessages(): Promise<ContactMessage[]> {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM contact_messages ORDER BY created_at DESC');
    return rows.map(rowToContactMessage);
  },

  async markMessageAsRead(id: string): Promise<void> {
    await pool.query('UPDATE contact_messages SET respondido = 1 WHERE id = ?', [id]);
  },

  // --------------------------------------------------------------------------
  // Orders
  // --------------------------------------------------------------------------
  async getOrders(): Promise<Order[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT o.*, u.email AS user_email FROM orders o
       LEFT JOIN users u ON u.id = o.user_id ORDER BY o.created_at DESC`
    );
    const items = await loadOrderItems(rows.map(r => r.id));
    return rows.map(r => rowToOrder(r, items[r.id] || []));
  },

  async getUserOrders(userId: string): Promise<Order[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    const items = await loadOrderItems(rows.map(r => r.id));
    return rows.map(r => rowToOrder(r, items[r.id] || []));
  },

  async getOrderById(id: string): Promise<Order | null> {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM orders WHERE id = ? LIMIT 1', [id]);
    if (rows.length === 0) return null;
    const items = await loadOrderItems([id]);
    return rowToOrder(rows[0], items[id] || []);
  },

  async createOrder(order: Omit<Order, 'id' | 'created_at' | 'estado'> & { id?: string; estado?: OrderStatus }): Promise<Order> {
    const id = order.id || 'ORDER-' + Date.now().toString();
    const estado: OrderStatus = order.estado || 'pendiente';
    const created_at = new Date().toISOString();

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(
        `INSERT INTO orders (id, user_id, estado, total, wompi_transaction_id, direccion_envio, notas, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, order.user_id, estado, order.total, order.wompi_transaction_id ?? null,
         JSON.stringify(order.direccion_envio), order.notas ?? null, created_at]
      );
      for (const item of order.items) {
        await conn.query(
          'INSERT INTO order_items (order_id, product_id, nombre, precio_unit, cantidad) VALUES (?, ?, ?, ?, ?)',
          [id, item.product_id, item.nombre, item.precio_unit, item.cantidad]
        );
      }
      if (estado === 'pagado') {
        for (const item of order.items) {
          await conn.query('UPDATE products SET stock = GREATEST(0, stock - ?) WHERE id = ?', [item.cantidad, item.product_id]);
        }
      }
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    return {
      id,
      user_id: order.user_id,
      estado,
      total: order.total,
      wompi_transaction_id: order.wompi_transaction_id,
      direccion_envio: order.direccion_envio,
      notas: order.notas,
      items: order.items,
      created_at,
    };
  },

  async updateOrderState(id: string, estado: OrderStatus): Promise<Order | null> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [rows] = await conn.query<RowDataPacket[]>('SELECT estado FROM orders WHERE id = ? LIMIT 1 FOR UPDATE', [id]);
      if (rows.length === 0) {
        await conn.rollback();
        return null;
      }
      const previousState = rows[0].estado as OrderStatus;
      await conn.query('UPDATE orders SET estado = ? WHERE id = ?', [estado, id]);

      if (estado === 'pagado' && previousState !== 'pagado') {
        const [itemRows] = await conn.query<RowDataPacket[]>(
          'SELECT product_id, cantidad FROM order_items WHERE order_id = ?', [id]
        );
        for (const item of itemRows) {
          await conn.query('UPDATE products SET stock = GREATEST(0, stock - ?) WHERE id = ?', [item.cantidad, item.product_id]);
        }
      }
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
    return this.getOrderById(id);
  },

  // --------------------------------------------------------------------------
  // Slides / Carousel
  // --------------------------------------------------------------------------
  async getSlides(): Promise<CarouselSlide[]> {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM slides WHERE activo = 1 ORDER BY orden ASC');
    return rows.map(rowToSlide);
  },

  async getAllSlides(): Promise<CarouselSlide[]> {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM slides ORDER BY orden ASC');
    return rows.map(rowToSlide);
  },

  async getSlideById(id: string): Promise<CarouselSlide | null> {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM slides WHERE id = ? LIMIT 1', [id]);
    return rows.length ? rowToSlide(rows[0]) : null;
  },

  async saveSlide(slide: Omit<CarouselSlide, 'id'> & { id?: string }): Promise<void> {
    if (slide.id) {
      await pool.query(
        `UPDATE slides SET title = ?, subtitle = ?, badge = ?, buttonText = ?, buttonLink = ?,
         button2Text = ?, button2Link = ?, bgImage = ?, orden = ?, activo = ? WHERE id = ?`,
        [slide.title || '', slide.subtitle || '', slide.badge || '', slide.buttonText || '',
         slide.buttonLink || '/', slide.button2Text || null, slide.button2Link || null,
         slide.bgImage || '', slide.orden ?? 1, slide.activo !== undefined ? (slide.activo ? 1 : 0) : 1, slide.id]
      );
    } else {
      await pool.query('INSERT INTO slides SET ?', [{
        id: 'slide_' + crypto.randomUUID(),
        title: slide.title || '',
        subtitle: slide.subtitle || '',
        badge: slide.badge || '',
        buttonText: slide.buttonText || '',
        buttonLink: slide.buttonLink || '/',
        button2Text: slide.button2Text || null,
        button2Link: slide.button2Link || null,
        bgImage: slide.bgImage || '',
        orden: slide.orden ?? 1,
        activo: slide.activo !== undefined ? (slide.activo ? 1 : 0) : 1,
      }]);
    }
  },

  async deleteSlide(id: string): Promise<void> {
    await pool.query('DELETE FROM slides WHERE id = ?', [id]);
  },

  // --------------------------------------------------------------------------
  // Security: Login attempts management
  // --------------------------------------------------------------------------
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MS: 15 * 60 * 1000, // 15 minutes

  async checkLoginAttempt(email: string): Promise<{ blocked: boolean; remainingAttempts: number; lockoutRemaining?: number }> {
    const key = email.toLowerCase();
    const [rows] = await pool.query<RowDataPacket[]>('SELECT count, locked_until FROM login_attempts WHERE email = ? LIMIT 1', [key]);
    if (rows.length === 0) {
      return { blocked: false, remainingAttempts: this.MAX_LOGIN_ATTEMPTS };
    }
    const attempt = rows[0];
    const now = Date.now();
    const lockedUntil = attempt.locked_until == null ? null : Number(attempt.locked_until);

    if (lockedUntil && lockedUntil > now) {
      const remaining = Math.ceil((lockedUntil - now) / 1000 / 60);
      return { blocked: true, remainingAttempts: 0, lockoutRemaining: remaining };
    }

    if (lockedUntil && lockedUntil <= now) {
      await pool.query('UPDATE login_attempts SET count = 0, last_attempt = ?, locked_until = NULL WHERE email = ?', [now, key]);
      return { blocked: false, remainingAttempts: this.MAX_LOGIN_ATTEMPTS };
    }

    return { blocked: false, remainingAttempts: this.MAX_LOGIN_ATTEMPTS - Number(attempt.count) };
  },

  async recordFailedLogin(email: string): Promise<number> {
    const key = email.toLowerCase();
    const now = Date.now();
    const [rows] = await pool.query<RowDataPacket[]>('SELECT count FROM login_attempts WHERE email = ? LIMIT 1', [key]);

    if (rows.length === 0) {
      await pool.query('INSERT INTO login_attempts (email, count, last_attempt) VALUES (?, 1, ?)', [key, now]);
      return this.MAX_LOGIN_ATTEMPTS - 1;
    }

    const count = Number(rows[0].count) + 1;
    const lockedUntil = count >= this.MAX_LOGIN_ATTEMPTS ? now + this.LOCKOUT_DURATION_MS : null;
    await pool.query('UPDATE login_attempts SET count = ?, last_attempt = ?, locked_until = ? WHERE email = ?', [count, now, lockedUntil, key]);

    if (lockedUntil) {
      console.log(`[SECURITY] Account locked for ${email} due to ${count} failed attempts`);
    }
    return this.MAX_LOGIN_ATTEMPTS - count;
  },

  async clearLoginAttempts(email: string): Promise<void> {
    await pool.query('DELETE FROM login_attempts WHERE email = ?', [email.toLowerCase()]);
  },

  // --------------------------------------------------------------------------
  // Reservations / Booking Calendar
  // --------------------------------------------------------------------------
  async createReservation(reservation: Omit<Reservation, 'id' | 'estado' | 'created_at'>): Promise<Reservation> {
    const newReservation: Reservation = {
      id: 'res_' + crypto.randomUUID(),
      tipo: reservation.tipo,
      item_id: reservation.item_id,
      item_nombre: reservation.item_nombre,
      item_slug: reservation.item_slug,
      fecha: reservation.fecha,
      nombre: reservation.nombre,
      email: reservation.email,
      telefono: reservation.telefono,
      cantidad_personas: reservation.cantidad_personas,
      notas: reservation.notas,
      estado: 'pendiente',
      created_at: new Date().toISOString(),
    };
    await pool.query(
      `INSERT INTO reservations (id, tipo, item_id, item_nombre, item_slug, fecha, nombre, email,
       telefono, cantidad_personas, estado, notas, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [newReservation.id, newReservation.tipo, newReservation.item_id, newReservation.item_nombre,
       newReservation.item_slug, newReservation.fecha, newReservation.nombre, newReservation.email,
       newReservation.telefono, newReservation.cantidad_personas, newReservation.estado,
       newReservation.notas ?? null, newReservation.created_at]
    );
    return newReservation;
  },

  async getReservations(): Promise<Reservation[]> {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM reservations ORDER BY created_at DESC');
    return rows.map(rowToReservation);
  },

  async getReservationsByItem(tipo: Reservation['tipo'], item_id: string, from?: string, to?: string): Promise<Reservation[]> {
    let sql = "SELECT * FROM reservations WHERE tipo = ? AND item_id = ? AND estado <> 'cancelada'";
    const params: unknown[] = [tipo, item_id];
    if (from) { sql += ' AND fecha >= ?'; params.push(from); }
    if (to) { sql += ' AND fecha <= ?'; params.push(to); }
    const [rows] = await pool.query<RowDataPacket[]>(sql, params);
    return rows.map(rowToReservation);
  },

  async getOccupiedDates(tipo: Reservation['tipo'], item_id: string): Promise<string[]> {
    const reservations = await this.getReservationsByItem(tipo, item_id);
    return [...new Set<string>(reservations.map(r => r.fecha))];
  },

  async updateReservationState(id: string, estado: ReservationStatus): Promise<Reservation | null> {
    const [res] = await pool.query<ResultSetHeader>('UPDATE reservations SET estado = ? WHERE id = ?', [estado, id]);
    if (res.affectedRows === 0) return null;
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM reservations WHERE id = ? LIMIT 1', [id]);
    return rows.length ? rowToReservation(rows[0]) : null;
  },
};
