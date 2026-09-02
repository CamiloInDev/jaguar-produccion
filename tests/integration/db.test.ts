import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDb, truncateTestDb } from '../helpers';

process.env.NODE_ENV = 'test';

describe('DB Service - Users', () => {
  beforeAll(async () => { await createTestDb(); });
  afterAll(async () => { await truncateTestDb(); });

  it('getUsers returns users without password_hash', async () => {
    const { dbService } = await import('../../server/db');
    const users = await dbService.getUsers();
    expect(users).toHaveLength(2);
    users.forEach(u => {
      expect(u).not.toHaveProperty('password_hash');
      expect(u).toHaveProperty('email');
    });
  });

  it('getUserByEmail finds existing user', async () => {
    const { dbService } = await import('../../server/db');
    const user = await dbService.getUserByEmail('admin@test.com');
    expect(user).not.toBeNull();
    expect(user!.email).toBe('admin@test.com');
  });

  it('getUserByEmail returns null for non-existent email', async () => {
    const { dbService } = await import('../../server/db');
    const user = await dbService.getUserByEmail('noexiste@test.com');
    expect(user).toBeNull();
  });

  it('getUserByEmail is case insensitive', async () => {
    const { dbService } = await import('../../server/db');
    const user = await dbService.getUserByEmail('ADMIN@TEST.COM');
    expect(user).not.toBeNull();
  });

  it('getUserById returns user without password_hash', async () => {
    const { dbService } = await import('../../server/db');
    const user = await dbService.getUserById('usr_admin');
    expect(user).not.toBeNull();
    expect(user).not.toHaveProperty('password_hash');
    expect(user!.email).toBe('admin@test.com');
  });

  it('getUserById returns null for non-existent id', async () => {
    const { dbService } = await import('../../server/db');
    const user = await dbService.getUserById('nonexistent');
    expect(user).toBeNull();
  });

  it('createUser adds a new user', async () => {
    const { dbService, hashPassword } = await import('../../server/db');
    const newUser = await dbService.createUser({
      email: 'new@test.com', password_hash: hashPassword('newpass123'), nombre: 'New', apellido: 'User', telefono: '3000000002', rol: 'cliente',
    });
    expect(newUser.id).toBeTruthy();
    expect(newUser.email).toBe('new@test.com');
    expect(newUser).not.toHaveProperty('password_hash');

    const found = await dbService.getUserByEmail('new@test.com');
    expect(found).not.toBeNull();
  });

  it('updateUserProfile updates user fields', async () => {
    const { dbService } = await import('../../server/db');
    const updated = await dbService.updateUserProfile('usr_cliente', { nombre: 'Updated', apellido: 'Name', telefono: '3009999999' });
    expect(updated).not.toBeNull();
    expect(updated!.nombre).toBe('Updated');
    expect(updated!.telefono).toBe('3009999999');
  });

  it('updateUserProfile returns null for non-existent user', async () => {
    const { dbService } = await import('../../server/db');
    const result = await dbService.updateUserProfile('nonexistent', { nombre: 'X', apellido: 'Y' });
    expect(result).toBeNull();
  });
});

describe('DB Service - Products', () => {
  beforeAll(async () => { await createTestDb(); });
  afterAll(async () => { await truncateTestDb(); });

  it('getProducts returns all products', async () => {
    const { dbService } = await import('../../server/db');
    const products = await dbService.getProducts();
    expect(products).toHaveLength(2);
  });

  it('getProductBySlug returns active product', async () => {
    const { dbService } = await import('../../server/db');
    const p = await dbService.getProductBySlug('test-product');
    expect(p).not.toBeNull();
    expect(p!.nombre).toBe('Test Product');
  });

  it('getProductBySlug returns null for inactive product', async () => {
    const { dbService } = await import('../../server/db');
    const p = await dbService.getProductBySlug('inactive-product');
    expect(p).toBeNull();
  });

  it('getProductBySlug returns null for non-existent slug', async () => {
    const { dbService } = await import('../../server/db');
    const p = await dbService.getProductBySlug('no-existe');
    expect(p).toBeNull();
  });

  it('saveProduct creates a new product', async () => {
    const { dbService } = await import('../../server/db');
    await dbService.saveProduct({ nombre: 'New Product', descripcion: 'Brand new', precio: 15000, stock: 100, categoria: '250gr', origen: 'Test', tueste: 'Oscuro', imagen_url: 'https://example.com/new.jpg', activo: true });
    const products = await dbService.getProducts();
    expect(products).toHaveLength(3);
    const created = products.find(p => p.nombre === 'New Product');
    expect(created).toBeTruthy();
    expect(created!.slug).toBe('new-product');
  });

  it('saveProduct edits an existing product', async () => {
    const { dbService } = await import('../../server/db');
    await dbService.saveProduct({ id: 'prod_1', nombre: 'Updated Product', descripcion: 'Updated', precio: 30000, stock: 25, categoria: '250gr', origen: 'Updated', tueste: 'Ligero', imagen_url: 'https://example.com/updated.jpg', activo: true });
    const p = await dbService.getProductById('prod_1');
    expect(p!.nombre).toBe('Updated Product');
    expect(p!.slug).toBe('updated-product');
  });

  it('deleteProduct removes a product', async () => {
    const { dbService } = await import('../../server/db');
    const before = (await dbService.getProducts()).length;
    await dbService.deleteProduct('prod_1');
    const products = await dbService.getProducts();
    expect(products).toHaveLength(before - 1);
    expect(products.find(p => p.id === 'prod_1')).toBeUndefined();
  });
});

describe('DB Service - Login Attempts & Security', () => {
  beforeAll(async () => { await createTestDb(); });
  afterAll(async () => { await truncateTestDb(); });

  it('checkLoginAttempt returns available attempts for new email', async () => {
    const { dbService } = await import('../../server/db');
    const result = await dbService.checkLoginAttempt('new@test.com');
    expect(result.blocked).toBe(false);
    expect(result.remainingAttempts).toBe(5);
  });

  it('recordFailedLogin decrements remaining attempts', async () => {
    const { dbService } = await import('../../server/db');
    await dbService.recordFailedLogin('cliente@test.com');
    await dbService.recordFailedLogin('cliente@test.com');
    const result = await dbService.checkLoginAttempt('cliente@test.com');
    expect(result.remainingAttempts).toBe(3);
  });

  it('locks account after 5 failed attempts', async () => {
    const { dbService } = await import('../../server/db');
    for (let i = 0; i < 5; i++) {
      await dbService.recordFailedLogin('cliente@test.com');
    }
    const result = await dbService.checkLoginAttempt('cliente@test.com');
    expect(result.blocked).toBe(true);
    expect(result.remainingAttempts).toBe(0);
    expect(result.lockoutRemaining).toBeGreaterThan(0);
  });

  it('clearLoginAttempts resets after lockout', async () => {
    const { dbService } = await import('../../server/db');
    await dbService.clearLoginAttempts('cliente@test.com');
    const result = await dbService.checkLoginAttempt('cliente@test.com');
    expect(result.blocked).toBe(false);
    expect(result.remainingAttempts).toBe(5);
  });
});

describe('DB Service - Orders & Stock', () => {
  beforeAll(async () => { await createTestDb(); });
  afterAll(async () => { await truncateTestDb(); });

  it('createOrder creates pending order', async () => {
    const { dbService } = await import('../../server/db');
    const order = await dbService.createOrder({
      user_id: 'usr_cliente', total: 50000,
      direccion_envio: { direccion: 'Calle 123', ciudad: 'Bogotá', departamento: 'Cundinamarca', telefono: '3000000000' },
      items: [{ product_id: 'prod_1', nombre: 'Test Product', precio_unit: 25000, cantidad: 2 }],
    });
    expect(order.id).toBeTruthy();
    expect(order.estado).toBe('pendiente');
  });

  it('order does not deduct stock when pending', async () => {
    const { dbService } = await import('../../server/db');
    await dbService.createOrder({
      user_id: 'usr_cliente', total: 50000,
      direccion_envio: { direccion: 'Calle 123', ciudad: 'Bogotá', departamento: 'Cundinamarca', telefono: '3000000000' },
      items: [{ product_id: 'prod_1', nombre: 'Test Product', precio_unit: 25000, cantidad: 30 }],
    });
    const p = await dbService.getProductById('prod_1');
    expect(p!.stock).toBe(50);
  });

  it('deducts stock when order becomes pagado', async () => {
    const { dbService } = await import('../../server/db');
    const order = await dbService.createOrder({
      id: 'ORDER-TEST-DEDUCT', user_id: 'usr_cliente', total: 50000,
      direccion_envio: { direccion: 'Calle 123', ciudad: 'Bogotá', departamento: 'Cundinamarca', telefono: '3000000000' },
      items: [{ product_id: 'prod_1', nombre: 'Test', precio_unit: 25000, cantidad: 10 }],
    });
    await dbService.updateOrderState(order.id, 'pagado');
    const p = await dbService.getProductById('prod_1');
    expect(p!.stock).toBe(40);
  });

  it('gets orders for a specific user', async () => {
    const { dbService } = await import('../../server/db');
    const before = (await dbService.getUserOrders('usr_cliente')).length;
    await dbService.createOrder({
      user_id: 'usr_cliente', total: 50000,
      direccion_envio: { direccion: 'Calle 123', ciudad: 'Bogotá', departamento: 'Cundinamarca', telefono: '3000000000' },
      items: [{ product_id: 'prod_1', nombre: 'Test', precio_unit: 25000, cantidad: 2 }],
    });
    const orders = await dbService.getUserOrders('usr_cliente');
    expect(orders).toHaveLength(before + 1);
  });

  it('getUserOrders returns empty for user with no orders', async () => {
    const { dbService } = await import('../../server/db');
    const orders = await dbService.getUserOrders('nonexistent');
    expect(orders).toHaveLength(0);
  });
});

describe('DB Service - Reservations', () => {
  beforeAll(async () => { await createTestDb(); });
  afterAll(async () => { await truncateTestDb(); });

  it('createReservation creates a pending reservation', async () => {
    const { dbService } = await import('../../server/db');
    const res = await dbService.createReservation({
      tipo: 'academia', item_id: 'exp_1', item_nombre: 'Test Exp', item_slug: 'test-exp',
      fecha: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      nombre: 'Test', email: 'test@test.com', telefono: '3000000000', cantidad_personas: 2, notas: '',
    });
    expect(res.estado).toBe('pendiente');
    expect(res.id).toBeTruthy();
  });

  it('getReservations returns sorted by created_at desc', async () => {
    const { dbService } = await import('../../server/db');
    const reservations = await dbService.getReservations();
    expect(reservations).toHaveLength(1);
  });
});

describe('DB Service - Slides', () => {
  beforeAll(async () => { await createTestDb(); });
  afterAll(async () => { await truncateTestDb(); });

  it('getSlides returns only active slides', async () => {
    const { dbService } = await import('../../server/db');
    await dbService.saveSlide({ title: 'Active', subtitle: 'S', badge: 'B', buttonText: 'Go', buttonLink: '/', bgImage: 'https://example.com/bg.jpg', orden: 1, activo: true });
    await dbService.saveSlide({ title: 'Inactive', subtitle: 'S', badge: 'B', buttonText: 'Go', buttonLink: '/', bgImage: 'https://example.com/bg2.jpg', orden: 2, activo: false });
    const active = await dbService.getSlides();
    expect(active).toHaveLength(1);
    expect(active[0].title).toBe('Active');
  });

  it('getAllSlides returns all slides', async () => {
    const { dbService } = await import('../../server/db');
    const all = await dbService.getAllSlides();
    expect(all).toHaveLength(2);
  });

  it('getSlideById returns a specific slide', async () => {
    const { dbService } = await import('../../server/db');
    const all = await dbService.getAllSlides();
    const found = await dbService.getSlideById(all[0].id);
    expect(found).not.toBeNull();
    expect(found!.title).toBe('Active');
  });

  it('deleteSlide removes a slide', async () => {
    const { dbService } = await import('../../server/db');
    const all = await dbService.getAllSlides();
    await dbService.deleteSlide(all[0].id);
    expect(await dbService.getAllSlides()).toHaveLength(1);
  });
});

describe('DB Service - Contact Messages', () => {
  beforeAll(async () => { await createTestDb(); });
  afterAll(async () => { await truncateTestDb(); });

  it('saveContactMessage creates a message', async () => {
    const { dbService } = await import('../../server/db');
    const msg = await dbService.saveContactMessage({ nombre: 'Test', email: 'test@test.com', asunto: 'Test Subject', mensaje: 'Test message body' });
    expect(msg.respondido).toBe(false);
    expect(msg.id).toBeTruthy();
  });

  it('getContactMessages returns all messages', async () => {
    const { dbService } = await import('../../server/db');
    await dbService.saveContactMessage({ nombre: 'A', email: 'a@a.com', asunto: 'S1', mensaje: 'M1' });
    await dbService.saveContactMessage({ nombre: 'B', email: 'b@b.com', asunto: 'S2', mensaje: 'M2' });
    expect(await dbService.getContactMessages()).toHaveLength(3);
  });
});
