import { describe, it, expect } from 'vitest';
import { buildCustomerEmail, buildStoreEmail } from '../../server/services/order-notifications';
import { Order, OrderStatus } from '../../src/types';

function orden(estado: OrderStatus, extra: Partial<Order> = {}): Order {
  return {
    id: 'JC-1-abc',
    user_id: 'usr_1',
    estado,
    total: 50000,
    direccion_envio: { direccion: 'Cra 1 #2-3', ciudad: 'Bogotá', departamento: 'Cundinamarca', telefono: '3000000000' },
    items: [{ product_id: 'p1', nombre: 'Caturra <Natural>', precio_unit: 25000, cantidad: 2 }],
    created_at: '2026-10-29T00:00:00.000Z',
    ...extra,
  };
}

const cliente = { nombre: 'Ana', apellido: 'Gómez', email: 'ana@example.com' };

describe('buildCustomerEmail', () => {
  it('pago aprobado: confirmación con ítems, total y dirección', () => {
    const mail = buildCustomerEmail(orden('pagado'), 'pendiente', 'Ana')!;
    expect(mail.subject).toContain('Pedido confirmado');
    expect(mail.subject).toContain('JC-1-abc');
    expect(mail.html).toContain('Hola, Ana');
    expect(mail.html).toMatch(/50\.000/);
    expect(mail.html).toContain('Cra 1 #2-3');
    expect(mail.text).toContain('Total');
  });

  it('escapa el HTML de nombres de producto y del cliente', () => {
    const mail = buildCustomerEmail(orden('pagado'), 'pendiente', '<script>')!;
    expect(mail.html).not.toContain('<script>');
    expect(mail.html).not.toContain('Caturra <Natural>');
    expect(mail.html).toContain('Caturra &lt;Natural&gt;');
  });

  it('enviado y entregado tienen su propio correo', () => {
    expect(buildCustomerEmail(orden('enviado'), 'pagado', 'Ana')!.subject).toContain('va en camino');
    expect(buildCustomerEmail(orden('entregado'), 'enviado', 'Ana')!.subject).toContain('entregado');
  });

  it('cancelar un pedido pagado habla de reembolso', () => {
    const mail = buildCustomerEmail(orden('cancelado'), 'pagado', 'Ana')!;
    expect(mail.html).toContain('medio de pago');
  });

  it('un pedido vencido dice que no hubo cobro e invita a volver', () => {
    const mail = buildCustomerEmail(orden('cancelado'), 'pendiente', 'Ana', 'vencido')!;
    expect(mail.subject).toContain('venció');
    expect(mail.html).toContain('No se hizo ningún cobro');
    expect(mail.html).toContain('2 horas');
  });

  it('no manda nada al pasar a pendiente', () => {
    expect(buildCustomerEmail(orden('pendiente'), 'cancelado', 'Ana')).toBeNull();
  });
});

describe('buildStoreEmail', () => {
  it('avisa cada venta nueva con cliente, ítems y notas', () => {
    const mail = buildStoreEmail(orden('pagado', { notas: 'Molido para prensa' }), 'pendiente', cliente)!;
    expect(mail.subject).toMatch(/Nueva venta/);
    expect(mail.html).toContain('ana@example.com');
    expect(mail.html).toContain('Molido para prensa');
  });

  it('marca la venta que llegó después de vencer el pedido', () => {
    const mail = buildStoreEmail(orden('pagado'), 'cancelado', cliente)!;
    expect(mail.html).toContain('revisa que haya stock');
  });

  it('avisa cuando se cancela un pedido ya pagado', () => {
    expect(buildStoreEmail(orden('cancelado'), 'pagado', cliente)!.subject).toContain('cancelado');
  });

  it('no avisa cancelaciones de pedidos que nunca se pagaron ni cambios de envío', () => {
    expect(buildStoreEmail(orden('cancelado'), 'pendiente', cliente)).toBeNull();
    expect(buildStoreEmail(orden('enviado'), 'pagado', cliente)).toBeNull();
  });
});
