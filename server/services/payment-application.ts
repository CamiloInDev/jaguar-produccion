import { dbService } from '../db';
import { Order } from '../../src/types';
import * as mercadopago from './mercadopago';
import { decidePaymentTransition, EXTERNAL_REFERENCE_RE } from './paymentRules';

export type ApplyPaymentResult =
  | { kind: 'applied'; order: Order; changed: boolean }
  | { kind: 'payment_not_found' }
  | { kind: 'order_not_found'; reference?: string }
  | { kind: 'reference_mismatch' };

/**
 * Aplica a su orden el estado ACTUAL de un pago consultado a la API de Mercado Pago.
 * Única ruta por la que una orden cambia por un pago: la usan el webhook, la
 * verificación al volver del checkout y la conciliación periódica, así las tres
 * siguen exactamente las mismas reglas.
 * Los errores de red/5xx de Mercado Pago se propagan para que el llamador decida
 * si reintentar (el webhook responde 500 → MP reintenta; la conciliación espera al
 * siguiente ciclo).
 */
export async function applyPayment(paymentId: string, expectedOrderId?: string): Promise<ApplyPaymentResult> {
  const payment = await mercadopago.getPayment(paymentId);
  if (!payment) return { kind: 'payment_not_found' };

  const reference = payment.external_reference;
  if (!reference || !EXTERNAL_REFERENCE_RE.test(reference)) return { kind: 'order_not_found', reference };
  if (expectedOrderId && reference !== expectedOrderId) return { kind: 'reference_mismatch' };

  let alert: string | undefined;
  const result = await dbService.applyOrderPayment(reference, String(payment.id), (current) => {
    const decision = decidePaymentTransition(current, payment);
    alert = decision.alert;
    return decision;
  });
  if (!result) return { kind: 'order_not_found', reference };

  if (alert) console.error(`[MP][ALERTA] orden ${reference}, pago ${payment.id} (${payment.status}): ${alert}`);
  if (result.changed) {
    console.log(`[MP] orden ${reference}: ${result.previous} → ${result.order.estado} (pago ${payment.id}, ${payment.status})`);
  }
  return { kind: 'applied', order: result.order, changed: result.changed };
}
