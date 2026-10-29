import { OrderStatus } from '../../src/types';

/** Lo mínimo de un pago de Mercado Pago que necesitan las reglas (sale de GET /v1/payments/{id}). */
export interface PaymentFacts {
  status?: string;
  currency_id?: string;
  transaction_amount?: number;
}

export interface PaymentDecision {
  /** Estado nuevo de la orden, o null si no cambia. */
  next: OrderStatus | null;
  /** Si este payment_id debe quedar guardado en la orden (para buscarlo/reembolsarlo después). */
  recordPayment: boolean;
  /** Motivo para el log cuando algo requiere atención humana (monto distinto, contracargo, etc). */
  alert?: string;
}

const SHIPPED: OrderStatus[] = ['enviado', 'entregado'];

/**
 * Decide qué hacerle a una orden según el estado ACTUAL del pago consultado a la API.
 *
 * Nunca retrocede: un 'pending' o 'rejected' que llega tarde (Mercado Pago reintenta y
 * no garantiza orden) no saca a una orden de 'pagado'. Un 'approved' solo marca pagado si
 * el monto y la moneda cuadran exactamente con la orden — si no, alerta y no toca nada.
 */
export function decidePaymentTransition(
  current: { estado: OrderStatus; total: number },
  payment: PaymentFacts
): PaymentDecision {
  const { estado, total } = current;

  switch (payment.status) {
    case 'approved': {
      const amount = Math.round(Number(payment.transaction_amount));
      if (payment.currency_id !== 'COP' || amount !== total) {
        return {
          next: null,
          recordPayment: false,
          alert: `pago aprobado que NO cuadra con la orden: ${payment.transaction_amount} ${payment.currency_id} vs ${total} COP`,
        };
      }
      if (estado === 'pendiente') return { next: 'pagado', recordPayment: true };
      if (estado === 'cancelado') {
        // Llegó tarde (p. ej. PSE lento después de que el link venció y se liberó el stock).
        // El cliente ya pagó: la orden se reactiva y vuelve a descontar inventario; el admin
        // revisa si quedaban unidades (si no, despacha cuando haya o reembolsa).
        return { next: 'pagado', recordPayment: true, alert: 'pago aprobado sobre una orden que estaba cancelada — se reactivó como pagada, revisar que haya stock para despachar' };
      }
      return { next: null, recordPayment: false };
    }

    case 'cancelled':
      // p. ej. cupón Efecty vencido. Solo cancela lo que seguía esperando pago.
      return estado === 'pendiente'
        ? { next: 'cancelado', recordPayment: true }
        : { next: null, recordPayment: false };

    case 'refunded':
    case 'charged_back': {
      if (estado === 'pendiente') return { next: 'cancelado', recordPayment: true };
      if (estado === 'pagado') {
        return { next: 'cancelado', recordPayment: true, alert: `pago ${payment.status} sobre una orden pagada — orden cancelada, revisar stock` };
      }
      if (SHIPPED.includes(estado)) {
        return { next: null, recordPayment: true, alert: `pago ${payment.status} sobre una orden ya ${estado} — requiere gestión manual` };
      }
      return { next: null, recordPayment: false };
    }

    default:
      // pending, in_process, authorized, in_mediation, rejected (el comprador puede reintentar
      // con la misma preferencia): la orden sigue igual. Se guarda el intento solo si aún no hay
      // un pago que importe más (una orden pagada conserva el id del pago aprobado).
      return { next: null, recordPayment: estado === 'pendiente' };
  }
}

/** external_reference de Mercado Pago: máx. 64 caracteres, solo letras, números, - y _. */
export const EXTERNAL_REFERENCE_RE = /^[A-Za-z0-9_-]{1,64}$/;
