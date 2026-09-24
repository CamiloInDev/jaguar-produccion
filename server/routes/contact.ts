import { Router } from 'express';
import { dbService } from '../db';
import { authenticateToken, requireRole } from '../middleware/auth';
import { contactValidation, handleValidationErrors } from '../middleware/validate';
import { internalError } from '../middleware/errorHandler';

const router = Router();

router.post('/', contactValidation, handleValidationErrors, async (req, res) => {
  try {
    const { nombre, email, asunto, mensaje } = req.body;
    const newMsg = await dbService.saveContactMessage({ nombre, email, asunto, mensaje });
    return res.json({ success: true, message: 'Mensaje recibido exitosamente. Pronto le contactaremos.', data: newMsg });
  } catch (err: any) {
    return internalError(res, err);
  }
});

router.get('/', authenticateToken, requireRole('admin', 'support'), async (_req, res) => {
  try {
    return res.json(await dbService.getContactMessages());
  } catch (err: any) {
    return internalError(res, err);
  }
});

router.put('/:id/leer', authenticateToken, requireRole('admin', 'support'), async (req, res) => {
  try {
    await dbService.markMessageAsRead(req.params.id);
    return res.json({ success: true });
  } catch (err: any) {
    return internalError(res, err);
  }
});

// Borrado permanente: se restringe a admin (más sensible que marcar como leído).
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const deleted = await dbService.deleteContactMessage(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Mensaje no encontrado.' });
    }
    return res.json({ success: true, message: 'Mensaje eliminado.' });
  } catch (err: any) {
    return internalError(res, err);
  }
});

export default router;
