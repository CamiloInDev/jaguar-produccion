import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../server/db', () => ({
  dbService: { getPendingOrdersWithPreference: vi.fn() },
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
import { reconciliarPagosPendientes } from '../../server/jobs/reconciliar-pagos';

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
});
