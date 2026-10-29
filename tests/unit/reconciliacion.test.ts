import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../server/db', () => ({
  dbService: {
    getPendingOrdersWithPreference: vi.fn(),
    getStalePendingOrders: vi.fn(),
    getOrderById: vi.fn(),
    updateOrderState: vi.fn(),
  },
}));
vi.mock('../../server/services/mercadopago', () => ({
  searchPaymentsByReference: vi.fn(),
}));
vi.mock('../../server/services/payment-application', () => ({
  applyPayment: vi.fn(),
}));

import { dbService } from '../../server/db';
import * as mercadopago from '../../server/services/mercadopago';
import { applyPayment } from '../../server/services/payment-application';
import { reconciliarPagosPendientes, vencerPedidosAbandonados } from '../../server/jobs/reconciliar-pagos';

const pendientes = vi.mocked(dbService.getPendingOrdersWithPreference);
const buscar = vi.mocked(mercadopago.searchPaymentsByReference);
const aplicar = vi.mocked(applyPayment);

const AHORA = Date.parse('2026-10-22T18:00:00.000Z');

function orden(id: string) {
  return { id, preference_id: `pref-${id}`, created_at: '2026-10-22T17:00:00.000Z' };
}

async function aplicarRes(kind: string, changed = false) {
  return kind === 'applied'
    ? ({ kind: 'applied', changed, order: { id: 'x' } } as any)
    : ({ kind } as any);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('reconciliarPagosPendientes', () => {
  it('no consulta Mercado Pago si no hay órdenes pendientes', async () => {
    pendientes.mockResolvedValue([]);
    expect(await reconciliarPagosPendientes(AHORA)).toBe(0);
    expect(buscar).not.toHaveBeenCalled();
    expect(aplicar).not.toHaveBeenCalled();
  });

  it('marca la orden cuando MP devuelve un pago aprobado', async () => {
    pendientes.mockResolvedValue([orden('JC-1')]);
    buscar.mockResolvedValue([{ id: 123456, status: 'approved' }] as any);
    aplicar.mockImplementation(() => aplicarRes('applied', true));

    expect(await reconciliarPagosPendientes(AHORA)).toBe(1);
    expect(buscar).toHaveBeenCalledWith('JC-1');
    expect(aplicar).toHaveBeenCalledWith('123456');
  });

  it('no cuenta como actualizada una orden que ya estaba al día', async () => {
    pendientes.mockResolvedValue([orden('JC-2')]);
    buscar.mockResolvedValue([{ id: 999, status: 'approved' }] as any);
    aplicar.mockImplementation(() => aplicarRes('applied', false));

    expect(await reconciliarPagosPendientes(AHORA)).toBe(0);
  });

  it('ignora órdenes sin pagos asociados', async () => {
    pendientes.mockResolvedValue([orden('JC-3')]);
    buscar.mockResolvedValue([]);

    expect(await reconciliarPagosPendientes(AHORA)).toBe(0);
    expect(aplicar).not.toHaveBeenCalled();
  });

  it('un error de Mercado Pago en una orden no frena las demás', async () => {
    pendientes.mockResolvedValue([orden('JC-4'), orden('JC-5')]);
    buscar
      .mockRejectedValueOnce(new Error('timeout de MP'))
      .mockResolvedValueOnce([{ id: 777, status: 'approved' }] as any);
    aplicar.mockImplementation(() => aplicarRes('applied', true));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(await reconciliarPagosPendientes(AHORA)).toBe(1);
    expect(buscar).toHaveBeenCalledTimes(2);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('busca dentro de la ventana configurada (72 h por defecto)', async () => {
    pendientes.mockResolvedValue([]);
    await reconciliarPagosPendientes(AHORA);

    const desde = Date.parse(pendientes.mock.calls[0][0]);
    expect(AHORA - desde).toBe(72 * 3_600_000);
  });

  it('prefiere el pago aprobado aunque haya un intento rechazado más nuevo', async () => {
    pendientes.mockResolvedValue([orden('JC-6')]);
    buscar.mockResolvedValue([{ id: 2, status: 'rejected' }, { id: 1, status: 'approved' }] as any);
    aplicar.mockImplementation(() => aplicarRes('applied', true));

    await reconciliarPagosPendientes(AHORA);
    expect(aplicar).toHaveBeenCalledWith('1');
  });
});

describe('vencerPedidosAbandonados', () => {
  const viejas = vi.mocked(dbService.getStalePendingOrders);
  const getOrden = vi.mocked(dbService.getOrderById);
  const cambiar = vi.mocked(dbService.updateOrderState);
  const pendiente = (id: string) => ({ id, estado: 'pendiente', items: [] } as any);

  it('solo mira órdenes más viejas que el link (120 min) más 15 min de margen', async () => {
    viejas.mockResolvedValue([]);
    await vencerPedidosAbandonados(AHORA);
    expect(AHORA - Date.parse(viejas.mock.calls[0][0])).toBe((120 + 15) * 60_000);
  });

  it('cancela (y libera stock) la orden vencida sin pagos', async () => {
    viejas.mockResolvedValue([{ id: 'JC-7', created_at: '' }]);
    buscar.mockResolvedValue([{ id: 9, status: 'rejected' }] as any);
    getOrden.mockResolvedValue(pendiente('JC-7'));
    cambiar.mockResolvedValue({ ...pendiente('JC-7'), estado: 'cancelado' });

    expect(await vencerPedidosAbandonados(AHORA)).toBe(1);
    expect(cambiar).toHaveBeenCalledWith('JC-7', 'cancelado');
  });

  it('si MP tiene un pago aprobado lo aplica en vez de cancelar', async () => {
    viejas.mockResolvedValue([{ id: 'JC-8', created_at: '' }]);
    buscar.mockResolvedValue([{ id: 31, status: 'approved' }] as any);
    aplicar.mockImplementation(() => aplicarRes('applied', true));

    expect(await vencerPedidosAbandonados(AHORA)).toBe(0);
    expect(aplicar).toHaveBeenCalledWith('31');
    expect(cambiar).not.toHaveBeenCalled();
  });

  it('espera si hay un pago en curso (PSE en proceso)', async () => {
    viejas.mockResolvedValue([{ id: 'JC-9', created_at: '' }]);
    buscar.mockResolvedValue([{ id: 32, status: 'in_process' }] as any);

    expect(await vencerPedidosAbandonados(AHORA)).toBe(0);
    expect(cambiar).not.toHaveBeenCalled();
  });

  it('no toca una orden que ya cambió de estado mientras tanto', async () => {
    viejas.mockResolvedValue([{ id: 'JC-10', created_at: '' }]);
    buscar.mockResolvedValue([]);
    getOrden.mockResolvedValue({ ...pendiente('JC-10'), estado: 'pagado' });

    expect(await vencerPedidosAbandonados(AHORA)).toBe(0);
    expect(cambiar).not.toHaveBeenCalled();
  });
});
