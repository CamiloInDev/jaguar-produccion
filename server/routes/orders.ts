import { Router } from 'express';
import * as crypto from 'crypto';
import { dbService } from '../db';
import { env } from '../config/env';
import { authenticateToken, requireRole, requireAdmin, AuthenticatedRequest } from '../middleware/auth';
import { checkoutRateLimiter } from '../middleware/rateLimiter';
import { orderStatusValidation, handleValidationErrors } from '../middleware/validate';
import { OrderStatus } from '../../src/types';

const router = Router();

const WOMPI_BASE_URL = env.VITE_WOMPI_PUBLIC_KEY.startsWith('pub_prod_')
  ? 'https://production.wompi.co/v1'
  : 'https://sandbox.wompi.co/v1';

function generateWompiSignature(reference: string, amountInCents: number, currency: string) {
  const concat = reference + amountInCents + currency + env.WOMPI_INTEGRITY_KEY;
  return crypto.createHash('sha256').update(concat).digest('hex');
}

/** Los tokens de aceptación de T&C / datos personales los emite Wompi; no se pueden inventar localmente. */
async function fetchWompiAcceptanceTokens(): Promise<{ acceptanceToken: string; personalDataAuthToken?: string }> {
  const res = await fetch(`${WOMPI_BASE_URL}/merchants/${env.VITE_WOMPI_PUBLIC_KEY}`);
  if (!res.ok) {
    throw new Error(`Wompi merchant lookup failed with status ${res.status}`);
  }
  const body = await res.json();
  const acceptanceToken = body?.data?.presigned_acceptance?.acceptance_token;
  if (!acceptanceToken) {
    throw new Error('Wompi merchant response missing presigned_acceptance.acceptance_token');
  }
  return {
    acceptanceToken,
    personalDataAuthToken: body?.data?.presigned_personal_data_auth?.acceptance_token,
  };
}

router.post('/preparar-pago', authenticateToken, checkoutRateLimiter, async (req: AuthenticatedRequest, res) => {
  try {
    const { total } = req.body;
    if (!total || isNaN(total)) {
      return res.status(400).json({ error: 'Monto total no válido.' });
    }

    const reference = `ORDER-${req.user!.id}-${Date.now()}`;
    const amountInCents = Math.round(total * 100);
    const currency = 'COP';
    const signature = generateWompiSignature(reference, amountInCents, currency);
    const { acceptanceToken, personalDataAuthToken } = await fetchWompiAcceptanceTokens();

    return res.json({
      reference,
      signature,
      acceptanceToken,
      personalDataAuthToken,
      amount: amountInCents,
      currency,
      publicKey: env.VITE_WOMPI_PUBLIC_KEY,
    });
  } catch (err: any) {
    console.error('[WOMPI] Error preparando pago:', err.message);
    return res.status(502).json({ error: 'No fue posible preparar el pago con la pasarela. Intenta de nuevo.' });
  }
});

router.post('/checkout', authenticateToken, checkoutRateLimiter, async (req: AuthenticatedRequest, res) => {
  try {
    const { reference, wompiTransactionId, items, total, direccion_envio, notas } = req.body;
    if (!reference || !items || !total || !direccion_envio) {
      return res.status(400).json({ error: 'Datos de facturación o productos insuficientes.' });
    }

    const newOrder = await dbService.createOrder({
      id: reference,
      user_id: req.user!.id,
      estado: 'pendiente',
      total: Number(total),
      wompi_transaction_id: wompiTransactionId || `Wmp-${Date.now()}`,
      direccion_envio,
      notas: notas || '',
      items,
    });

    return res.status(201).json({ success: true, order: newOrder });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const orders = await dbService.getUserOrders(req.user!.id);
    return res.json(orders);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/todas', authenticateToken, requireRole('admin', 'support'), async (_req, res) => {
  try {
    return res.json(await dbService.getOrders());
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
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
    return res.status(500).json({ error: err.message });
  }
});

// Webhook test — solo disponible en desarrollo y con auth admin
if (env.NODE_ENV !== 'production') {
  router.post('/wompi-test-trigger', authenticateToken, requireAdmin, checkoutRateLimiter, async (req, res) => {
    try {
      const { reference, status } = req.body;
      if (!reference || !status) {
        return res.status(400).json({ error: 'Parámetros inconsistentes para simulación.' });
      }

      const correctStatus: OrderStatus = status === 'APPROVED' ? 'pagado' : 'pendiente';
      const updated = await dbService.updateOrderState(reference, correctStatus);
      if (!updated) {
        return res.status(404).json({ error: 'La orden con esa referencia no existe para actualizar.' });
      }

      return res.json({ success: true, status: updated.estado, message: `Webhook de prueba recibido. Estado cambiado a: ${updated.estado}` });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });
}

/** Lee una ruta tipo "transaction.status" dentro del payload del evento. */
function getByPath(obj: any, path: string): string {
  const value = path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
  return value == null ? '' : String(value);
}

// Webhook real Wompi — esquema oficial de eventos:
// checksum = SHA256(valores de signature.properties en orden + timestamp + WOMPI_EVENTS_KEY)
// https://docs.wompi.co/docs/en-us/eventos
router.post('/wompi-webhook', async (req, res) => {
  try {
    const event = req.body;
    const checksum = event?.signature?.checksum as string | undefined;
    const properties = event?.signature?.properties as string[] | undefined;
    const timestamp = event?.timestamp;

    if (!checksum || !Array.isArray(properties) || properties.length === 0 || timestamp == null) {
      return res.status(400).json({ error: 'Payload de firma inválido.' });
    }

    const concatValues = properties.map((path) => getByPath(event, path)).join('');
    const expectedChecksum = crypto.createHash('sha256')
      .update(concatValues + timestamp + env.WOMPI_EVENTS_KEY)
      .digest('hex');

    const received = Buffer.from(String(checksum).toLowerCase());
    const expected = Buffer.from(expectedChecksum);
    if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) {
      console.log('[WOMPI] Invalid webhook signature');
      return res.status(401).json({ error: 'Firma inválida.' });
    }

    const transaction = event?.data?.transaction;
    if (!transaction?.id || !transaction?.reference) {
      return res.status(400).json({ error: 'Payload inválido.' });
    }

    const { reference, status } = transaction;
    const orderStatus: OrderStatus = status === 'APPROVED' ? 'pagado' : 'pendiente';
    const updated = await dbService.updateOrderState(reference, orderStatus);

    if (!updated) {
      console.log(`[WOMPI] Order not found for reference: ${reference}`);
      return res.status(404).json({ error: 'Orden no encontrada.' });
    }

    console.log(`[WOMPI] Webhook processed: ${reference} → ${orderStatus}`);
    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('[WOMPI] Webhook error:', err.message);
    return res.status(500).json({ error: 'Error procesando webhook.' });
  }
});

export default router;
