import { Router } from 'express';
import { dbService } from '../db';
import { authenticateToken, requireAdmin, AuthenticatedRequest } from '../middleware/auth';
import { roleUpdateValidation, handleValidationErrors } from '../middleware/validate';

const router = Router();

router.get('/', authenticateToken, requireAdmin, async (_req: AuthenticatedRequest, res) => {
  try {
    const users = await dbService.getAllUsers();
    return res.json(users);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/:id/rol', authenticateToken, requireAdmin, roleUpdateValidation, handleValidationErrors, async (req: AuthenticatedRequest, res) => {
  try {
    const { rol } = req.body;

    if (req.params.id === req.user!.id) {
      return res.status(400).json({ error: 'No puedes cambiar tu propio rol.' });
    }

    const updated = await dbService.updateUserRole(req.params.id, rol);
    if (!updated) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    return res.json({ success: true, user: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    if (req.params.id === req.user!.id) {
      return res.status(400).json({ error: 'No puedes eliminarte a ti mismo.' });
    }

    const deleted = await dbService.deleteUser(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    return res.json({ success: true, message: 'Usuario eliminado.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
