import { dbService } from '../db';
import * as mercadopago from '../services/mercadopago';
import { applyPayment } from '../services/payment-application';

/**
 * Conciliación periódica de pagos (red de seguridad del webhook).
 *
 * Mercado Pago puede no entregar el webhook (CDN, timeout, reintentos agotados) y el
 * comprador puede cerrar el navegador antes de volver a la tienda. En ambos casos la
 * orden quedaría `pendiente` aunque el pago esté aprobado.
 *
 * Cada ciclo busca órdenes `pendiente` recientes con preferencia, consulta a MP los
 * pagos de esa orden y aplica el más nuevo con la misma función que usan el webhook y
 * la verificación al volver del checkout (`applyPayment`), así las reglas no se duplican:
 * monto/moneda exactos, transiciones sin retroceso y stock descontado una sola vez.
 *
 * Costo: para cada pendiente se hace 1 búsqueda + 1 consulta de pago; con el volumen de
 * la tienda es despreciable. La ventana y la frecuencia se pueden ajustar por env.
 */

const VENTANA_HORAS = Number(process.env.MP_RECONCILIACION_VENTANA_HORAS ?? 72);
const MINUTOS = Number(process.env.MP_RECONCILIACION_MINUTOS ?? 5);

export const RECONCILIACION_INTERVALO_MS = (Number.isFinite(MINUTOS) && MINUTOS > 0 ? MINUTOS : 5) * 60_000;

/** Un ciclo. Devuelve cuántas órdenes se marcaron (o actualizaron) por un pago. */
export async function reconciliarPagosPendientes(ahora: number = Date.now()): Promise<number> {
  const horas = Number.isFinite(VENTANA_HORAS) && VENTANA_HORAS > 0 ? VENTANA_HORAS : 72;
  const desde = new Date(ahora - horas * 3_600_000).toISOString();

  const pendientes = await dbService.getPendingOrdersWithPreference(desde);
  let aplicadas = 0;

  for (const orden of pendientes) {
    try {
      const pagos = await mercadopago.searchPaymentsByReference(orden.id);
      const pago = pagos[0];
      if (!pago?.id) continue;

      const resultado = await applyPayment(String(pago.id));
      if (resultado.kind === 'applied' && resultado.changed) aplicadas++;
    } catch (err: any) {
      // Una orden con error no debe frenar el resto del ciclo ni tumbar la app.
      console.error(`[MP][conciliación] orden ${orden.id}:`, err?.message || err);
    }
  }

  if (aplicadas > 0) console.log(`[MP][conciliación] ${aplicadas} orden(es) actualizadas por pago aprobado`);
  return aplicadas;
}

/**
 * Arranca el ciclo periódico. En tests no hace nada (no debe quedar un timer abierto).
 * La primera pasada corre 30 s después del arranque, para no competir con el boot.
 */
export function startReconciliacionPagos(): NodeJS.Timeout | null {
  if (process.env.NODE_ENV === 'test') return null;

  const timer = setInterval(() => {
    reconciliarPagosPendientes().catch(err => console.error('[MP][conciliación] error:', err?.message || err));
  }, RECONCILIACION_INTERVALO_MS);
  timer.unref?.();

  const primera = setTimeout(() => {
    reconciliarPagosPendientes().catch(err => console.error('[MP][conciliación] error:', err?.message || err));
  }, 30_000);
  primera.unref?.();

  console.log(`[MP][conciliación] activa cada ${RECONCILIACION_INTERVALO_MS / 60_000} min (ventana ${VENTANA_HORAS} h)`);
  return timer;
}
