import { Router } from 'express';
import * as crypto from 'crypto';
import { dbService } from '../db';
import { env } from '../config/env';
import { authenticateToken, requireRole, requireAdmin, AuthenticatedRequest } from '../middleware/auth';
import { checkoutRateLimiter } from '../middleware/rateLimiter';
import { orderStatusValidation, handleValidationErrors } from '../middleware/validate';
import { internalError } from '../middleware/errorHandler';
import { OrderStatus, OrderItem, Order, ShippingAddress } from '../../src/types';
import * as mercadopago from '../services/mercadopago';
import { applyPayment, ApplyPaymentResult } from '../services/payment-application';

const router = Router();

/**
 * Recalcula ítems y total desde el precio REAL en la tabla `products`,
 * ignorando cualquier precio/total que venga del cliente.
 *
 * El carrito (nombre, precio_unit, total) vive en el cliente y NUNCA debe
 * tratarse como fuente de verdad: sin esta verificación, cualquiera podía
 * manipular el request para que la pasarela cobrara (y quedara registrado
 * en la orden) un monto arbitrario, distinto del precio real del producto
 * — ej. pagar $1 por un carrito de $500.000.
 */
async function verifyCartItems(
  rawItems: unknown
): Promise<{ items: OrderItem[]; total: number } | { error: string }> {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return { error: 'El carrito está vacío o es inválido.' };
  }
  const items: OrderItem[] = [];
  let total = 0;
  for (const raw of rawItems) {
    const productId = raw?.product_id;
    const cantidad = Number(raw?.cantidad);
    if (typeof productId !== 'string' || !productId || !Number.isInteger(cantidad) || cantidad < 1) {
      return { error: 'Ítem de carrito inválido.' };
    }
    const product = await dbService.getProductById(productId);
    if (!product || !product.activo) {
      return { error: `El producto "${productId}" ya no está disponible.` };
    }
    if (product.stock < cantidad) {
      return { error: `Stock insuficiente para "${product.nombre}" (disponible: ${product.stock}).` };
    }
    items.push({ product_id: product.id, nombre: product.nombre, precio_unit: product.precio, cantidad });
    total += product.precio * cantidad;
  }
  return { items, total };
}

/** Valida la dirección de envío: solo strings acotados, nada de objetos arbitrarios en la columna JSON. */
function parseShippingAddress(raw: any): ShippingAddress | null {
  const fields = ['direccion', 'ciudad', 'departamento', 'telefono'] as const;
  const out: Record<string, string> = {};
  for (const f of fields) {
    const v = typeof raw?.[f] === 'string' ? raw[f].trim() : '';
    if (!v || v.length > 200) return null;
    out[f] = v;
  }
  return out as unknown as ShippingAddress;
}

/** Id de orden = external_reference en Mercado Pago (máx. 64, [A-Za-z0-9_-]). */
function newOrderId(): string {
  return `JC-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
}

/**
 * Mercado Pago descarta en silencio back_urls/notification_url que no sean HTTPS y rechaza
 * localhost, así que en desarrollo local sin túnel no se envían (y tampoco auto_return,
 * que exige back_urls.success).
 */
const APP_URL_IS_PUBLIC_HTTPS = env.APP_URL.startsWith('https://');
if (!APP_URL_IS_PUBLIC_HTTPS && env.NODE_ENV !== 'test') {
  console.warn('[MP] APP_URL no es HTTPS: la preferencia se crea sin back_urls ni notification_url (el comprador no volverá al sitio automáticamente y no llegarán webhooks). Usa un túnel HTTPS o el servidor de Hostinger para probar el flujo completo.');
}

function buildPreferenceBody(order: Order, payer: { email: string; nombre?: string; apellido?: string }): mercadopago.PreferenceBody {
  const back = `${env.APP_URL}/checkout/confirmacion?ref=${encodeURIComponent(order.id)}`;
  const excluded = (env.MP_EXCLUDED_PAYMENT_TYPES || '')
    .split(',').map(s => s.trim()).filter(Boolean).map(id => ({ id }));

  return {
    items: order.items.map(i => ({
      id: i.product_id,
      title: i.nombre,
      quantity: i.cantidad,
      unit_price: i.precio_unit, // entero en COP, sale de la BD vía verifyCartItems
      currency_id: 'COP',
    })),
    payer: { email: payer.email, name: payer.nombre, surname: payer.apellido },
    external_reference: order.id,
    statement_descriptor: env.MP_STATEMENT_DESCRIPTOR,
    metadata: { order_id: order.id },
    ...(APP_URL_IS_PUBLIC_HTTPS ? {
      back_urls: { success: back, pending: back, failure: back },
      auto_return: 'approved',
      notification_url: `${env.APP_URL}/api/ordenes/mp-webhook`,
    } : {}),
    ...(excluded.length || env.MP_MAX_INSTALLMENTS ? {
      payment_methods: {
        ...(excluded.length ? { excluded_payment_types: excluded } : {}),
        ...(env.MP_MAX_INSTALLMENTS ? { installments: env.MP_MAX_INSTALLMENTS } : {}),
      },
    } : {}),
    ...(env.MP_PREFERENCE_EXPIRATION_MINUTES ? {
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + env.MP_PREFERENCE_EXPIRATION_MINUTES * 60_000).toISOString(),
    } : {}),
  };
}

/**
 * Crea la orden 'pendiente' y la preferencia de Checkout Pro en un solo paso.
 * La orden existe ANTES de la preferencia para que el webhook siempre la encuentre.
 */
router.post('/crear-pago', authenticateToken, checkoutRateLimiter, async (req: AuthenticatedRequest, res) => {
  const verified = await verifyCartItems(req.body?.items).catch(() => ({ error: 'No fue posible validar el carrito.' }));
  if ('error' in verified) {
    return res.status(400).json({ error: verified.error });
  }
  const direccion_envio = parseShippingAddress(req.body?.direccion_envio);
  if (!direccion_envio) {
    return res.status(400).json({ error: 'Datos de envío incompletos o inválidos.' });
  }
  const notas = typeof req.body?.notas === 'string' ? req.body.notas.trim().slice(0, 500) : '';

  let order: Order;
  try {
    const user = await dbService.getUserById(req.user!.id);
    if (!user) return res.status(401).json({ error: 'Inicie sesión para continuar.' });

    order = await dbService.createOrder({
      id: newOrderId(),
      user_id: user.id,
      estado: 'pendiente',
      total: verified.total,
      direccion_envio,
      notas,
      items: verified.items,
    });

    try {
      const pref = await mercadopago.createPreference(buildPreferenceBody(order, user), `pref-${order.id}`);
      await dbService.setOrderPreference(order.id, pref.id);
      return res.status(201).json({ orderId: order.id, init_point: pref.init_point });
    } catch (err: any) {
      // Sin preferencia la orden no se puede pagar: se cancela para no dejar pendientes huérfanas.
      console.error(`[MP] Error creando preferencia para ${order.id}:`, err?.message || err);
      await dbService.updateOrderState(order.id, 'cancelado').catch(() => undefined);
      return res.status(502).json({ error: 'No fue posible iniciar el pago con Mercado Pago. Intenta de nuevo.' });
    }
  } catch (err: any) {
    return internalError(res, err);
  }
});

/**
 * Al volver del checkout, el frontend pide verificar el payment_id que Mercado Pago puso en
 * la back_url. Esos query params los puede escribir cualquiera, por eso aquí no se confía en
 * ellos: se consulta el pago a la API y se exige que sea de ESTA orden y de ESTE usuario.
 * Existe porque los pagos de prueba pueden no notificar y el webhook puede tardar.
 */
router.post('/:id/verificar-pago', authenticateToken, checkoutRateLimiter, async (req: AuthenticatedRequest, res) => {
  try {
    const paymentId = String(req.body?.payment_id ?? '');
    if (!/^\d{1,30}$/.test(paymentId)) {
      return res.status(400).json({ error: 'payment_id inválido.' });
    }
    const order = await dbService.getOrderById(req.params.id);
    if (!order || order.user_id !== req.user!.id) {
      return res.status(404).json({ error: 'Orden no encontrada.' });
    }

    let result: ApplyPaymentResult;
    try {
      result = await applyPayment(paymentId, order.id);
    } catch (err: any) {
      console.error(`[MP] Error consultando pago ${paymentId}:`, err?.message || err);
      return res.status(502).json({ error: 'No fue posible consultar el pago. Intenta de nuevo en unos segundos.' });
    }
    if (result.kind === 'reference_mismatch' || result.kind === 'payment_not_found') {
      return res.status(400).json({ error: 'El pago no corresponde a esta orden.' });
    }
    if (result.kind !== 'applied') {
      return res.status(404).json({ error: 'Orden no encontrada.' });
    }
    return res.json({ order: result.order });
  } catch (err: any) {
    return internalError(res, err);
  }
});

router.get('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const orders = await dbService.getUserOrders(req.user!.id);
    return res.json(orders);
  } catch (err: any) {
    return internalError(res, err);
  }
});

router.get('/todas', authenticateToken, requireRole('admin', 'support'), async (_req, res) => {
  try {
    return res.json(await dbService.getOrders());
  } catch (err: any) {
    return internalError(res, err);
  }
});

/** Detalle de una orden: su dueño, o admin/support. (Va después de /todas para no capturarla.) */
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const order = await dbService.getOrderById(req.params.id);
    const isStaff = req.user!.rol === 'admin' || req.user!.rol === 'support';
    if (!order || (order.user_id !== req.user!.id && !isStaff)) {
      return res.status(404).json({ error: 'Orden no encontrada.' });
    }
    return res.json(order);
  } catch (err: any) {
    return internalError(res, err);
  }
});

router.put('/:id/estado', authenticateToken, requireRole('admin', 'support'), orderStatusValidation, handleValidationErrors, async (req, res) => {
  try {
    const { estado } = req.body;
    const updated = await dbService.updateOrderState(req.params.id, estado as OrderStatus);
    if (!updated) {
      return res.status(404).json({ error: 'Orden no encontrada.' });
    }
    return res.json({ success: true, order: updated });
  } catch (err: any) {
    return internalError(res, err);
  }
});

// Simulación de pago — solo disponible fuera de producción y con auth admin
if (env.NODE_ENV !== 'production') {
  router.post('/pago-test-trigger', authenticateToken, requireAdmin, checkoutRateLimiter, async (req, res) => {
    try {
      const { reference, status } = req.body;
      if (!reference || !status) {
        return res.status(400).json({ error: 'Parámetros inconsistentes para simulación.' });
      }

      const correctStatus: OrderStatus = String(status).toLowerCase() === 'approved' ? 'pagado' : 'pendiente';
      const updated = await dbService.updateOrderState(reference, correctStatus);
      if (!updated) {
        return res.status(404).json({ error: 'La orden con esa referencia no existe para actualizar.' });
      }

      return res.json({ success: true, status: updated.estado, message: `Pago simulado. Estado cambiado a: ${updated.estado}` });
    } catch (err: any) {
      return internalError(res, err);
    }
  });
}

/**
 * Webhook de Mercado Pago (Tus integraciones > Webhooks, evento "Pagos").
 * https://www.mercadopago.com.co/developers/es/docs/checkout-pro-preferences/payment-notifications
 *
 * - La firma x-signature cubre data.id (del query o del body), x-request-id y ts — NO el body.
 *   Por eso del request solo se usa data.id; el estado se consulta a la API.
 * - 401 firma inválida · 500 si falla la consulta a MP (MP reintenta) · 200 en todo lo
 *   demás, incluidos casos que un reintento no arregla (orden inexistente, monto que no cuadra).
 */
router.post('/mp-webhook', async (req, res) => {
  const queryDataId = typeof req.query['data.id'] === 'string' ? req.query['data.id'] : undefined;
  const bodyDataId = req.body?.data?.id != null ? String(req.body.data.id) : undefined;
  const dataId = queryDataId ?? bodyDataId;
  const type = typeof req.query.type === 'string' ? req.query.type : req.body?.type;

  const valid = mercadopago.verifyWebhookSignature({
    xSignature: req.header('x-signature'),
    xRequestId: req.header('x-request-id'),
    dataId: [queryDataId, bodyDataId],
  });
  if (!valid) {
    // Log diagnóstico (la firma no es un secreto: es un HMAC sobre datos públicos del request).
    console.warn('[MP] Webhook con firma inválida o ausente', JSON.stringify({
      path: req.url?.slice(0, 120),
      xSignature: String(req.header('x-signature') ?? '').slice(0, 100),
      xRequestId: req.header('x-request-id'),
      queryDataId,
      bodyDataId: bodyDataId ? 'presente' : 'ausente',
    }));
    return res.status(401).json({ error: 'Firma inválida.' });
  }

  if (type !== 'payment' || !dataId) {
    return res.status(200).json({ ignored: true });
  }

  try {
    const result = await applyPayment(dataId);
    if (result.kind === 'payment_not_found') {
      console.warn(`[MP] Webhook: el pago ${dataId} no existe (¿Simulador con id inventado?)`);
    } else if (result.kind === 'order_not_found') {
      console.error(`[MP][ALERTA] Webhook: pago ${dataId} con external_reference "${result.reference ?? ''}" sin orden en la BD`);
    }
    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error(`[MP] Webhook: error procesando pago ${dataId}:`, err?.message || err);
    return res.status(500).json({ error: 'Error procesando webhook.' });
  }
});

export default router;
