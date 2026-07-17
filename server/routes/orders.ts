import express, { Router } from 'express';
import * as crypto from 'crypto';
import { dbService } from '../db';
import { env } from '../config/env';
import { authenticateToken, requireRole, requireAdmin, AuthenticatedRequest } from '../middleware/auth';
import { checkoutRateLimiter } from '../middleware/rateLimiter';
import { orderStatusValidation, handleValidationErrors } from '../middleware/validate';
import { OrderStatus } from '../../src/types';

const router = Router();

function generateWompiSignature(reference: string, amountInCents: number, currency: string) {
  const concat = reference + amountInCents + currency + env.WOMPI_INTEGRITY_KEY;
  return crypto.createHash('sha256').update(concat).digest('hex');
}

router.post('/preparar-pago', authenticateToken, checkoutRateLimiter, (req: AuthenticatedRequest, res) => {
  try {
    const { total } = req.body;
    if (!total || isNaN(total)) {
      return res.status(400).json({ error: 'Monto total no válido.' });
    }

    const reference = `ORDER-${req.user!.id}-${Date.now()}`;
    const amountInCents = Math.round(total * 100);
    const currency = 'COP';
    const signature = generateWompiSignature(reference, amountInCents, currency);

    // Preset/mock acceptance token for staging popup
    const acceptanceToken = `acc_tok_presigned_sandbox_${Date.now().toString(36)}`;

    return res.json({
      reference,
      signature,
      acceptanceToken,
      amount: amountInCents,
      currency,
      publicKey: env.VITE_WOMPI_PUBLIC_KEY,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Error preparando firma del pago.' });
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

// Webhook real Wompi con verificación SHA256
router.post('/wompi-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-signature'] as string;
    if (!signature) {
      return res.status(401).json({ error: 'Firma no proporcionada.' });
    }

    const rawBody = JSON.stringify(req.body);
    const checksum = crypto.createHash('sha256')
      .update(rawBody + env.WOMPI_INTEGRITY_KEY)
      .digest('hex');

    if (signature !== checksum) {
      console.log('[WOMPI] Invalid webhook signature');
      return res.status(401).json({ error: 'Firma inválida.' });
    }

    const { data } = req.body;
    if (!data?.transaction?.id || !data?.reference) {
      return res.status(400).json({ error: 'Payload inválido.' });
    }

    const { reference, status } = data.transaction;
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
