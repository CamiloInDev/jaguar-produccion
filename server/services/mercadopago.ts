import * as crypto from 'crypto';
import { MercadoPagoConfig, Preference, Payment, PaymentRefund, MPNotFoundError } from 'mercadopago';
import { env } from '../config/env';

/**
 * Capa delgada sobre el SDK oficial de Mercado Pago (Checkout Pro, Preferences API).
 * Es el único módulo del backend que habla con Mercado Pago: las rutas lo usan y los
 * tests lo mockean, así ningún test depende de la red ni del sandbox.
 *
 * El config se crea una sola vez y SIN idempotencyKey global: el SDK (v3.6.1) mezcla las
 * requestOptions de cada llamada dentro del config compartido, así que una clave fija
 * quedaría pegada a todas las escrituras siguientes. Cada escritura pasa la suya.
 */
const client = new MercadoPagoConfig({
  accessToken: env.MP_ACCESS_TOKEN,
  options: { timeout: 5000 },
});
const preferenceClient = new Preference(client);
const paymentClient = new Payment(client);
const refundClient = new PaymentRefund(client);

export type PreferenceBody = Parameters<Preference['create']>[0]['body'];
export type MpPayment = Awaited<ReturnType<Payment['get']>>;

export async function createPreference(body: PreferenceBody, idempotencyKey: string) {
  const pref = await preferenceClient.create({ body, requestOptions: { idempotencyKey } });
  if (!pref.id || !pref.init_point) {
    throw new Error('Respuesta de Mercado Pago sin id o init_point');
  }
  return { id: pref.id, init_point: pref.init_point };
}

/**
 * Fuente de verdad del estado de un pago: siempre se decide sobre esta respuesta.
 * Devuelve null si el pago no existe (p. ej. el Simulador de webhooks usa un id inventado);
 * cualquier otro error (red, 5xx) se propaga para que el llamador decida si reintentar.
 */
export async function getPayment(paymentId: string): Promise<MpPayment | null> {
  try {
    return await paymentClient.get({ id: paymentId });
  } catch (err) {
    if (err instanceof MPNotFoundError) return null;
    throw err;
  }
}

/** Reembolso total (sin amount) o parcial. X-Idempotency-Key es obligatorio para refunds. */
export async function refundPayment(paymentId: string, amount?: number) {
  return refundClient.create({
    payment_id: paymentId,
    body: amount != null ? { amount } : undefined,
    requestOptions: { idempotencyKey: crypto.randomUUID() },
  });
}

/**
 * Manifest oficial de la firma de webhooks: `id:{data.id};request-id:{x-request-id};ts:{ts};`
 * — se omite el par cuyo valor falte, y data.id alfanumérico va en minúsculas.
 */
export function buildSignatureManifest(dataId: string, requestId: string, ts: string): string {
  const parts: string[] = [];
  if (dataId) parts.push(`id:${dataId.toLowerCase()}`);
  if (requestId) parts.push(`request-id:${requestId}`);
  parts.push(`ts:${ts}`);
  return parts.join(';') + ';';
}

/**
 * Valida el header x-signature (`ts=...,v1=...`) con HMAC-SHA256 y la clave secreta de webhooks.
 *
 * Implementado a mano en vez de usar WebhookSignatureValidator del SDK porque este no pasa
 * data.id a minúsculas y su `toleranceSeconds` interpreta `ts` en segundos cuando Mercado Pago
 * lo envía en milisegundos. El HMAC NO cubre el body: nunca se decide nada con el body.
 */
export function verifyWebhookSignature(params: {
  xSignature: string | undefined;
  xRequestId: string | undefined;
  dataId: string | undefined;
  secret?: string;
}): boolean {
  const secret = params.secret ?? env.MP_WEBHOOK_SECRET;
  let ts: string | undefined;
  let v1: string | undefined;
  for (const part of String(params.xSignature ?? '').split(',')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key === 'ts') ts = value;
    if (key === 'v1') v1 = value;
  }
  if (!ts || !v1) return false;

  const manifest = buildSignatureManifest(String(params.dataId ?? ''), String(params.xRequestId ?? ''), ts);
  const expected = Buffer.from(crypto.createHmac('sha256', secret).update(manifest).digest('hex'));
  const received = Buffer.from(v1.toLowerCase());
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}
