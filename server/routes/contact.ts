import { Router } from 'express';
import { dbService } from '../db';
import { authenticateToken, requireRole } from '../middleware/auth';
import { contactValidation, handleValidationErrors } from '../middleware/validate';

const router = Router();

router.post('/', contactValidation, handleValidationErrors, async (req, res) => {
  try {
    const { nombre, email, asunto, mensaje } = req.body;
    const newMsg = await dbService.saveContactMessage({ nombre, email, asunto, mensaje });
    return res.json({ success: true, message: 'Mensaje recibido exitosamente. Pronto le contactaremos.', data: newMsg });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/', authenticateToken, requireRole('admin', 'support'), async (_req, res) => {
  try {
    return res.json(await dbService.getContactMessages());
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/:id/leer', authenticateToken, requireRole('admin', 'support'), async (req, res) => {
  try {
    await dbService.markMessageAsRead(req.params.id);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
