import { Router } from 'express';
import { publicFormRateLimiter } from '../middleware/rateLimiter';
import { dbService } from '../db';
import { authenticateToken, requireRole } from '../middleware/auth';
import { reservationValidation, handleValidationErrors } from '../middleware/validate';
import { internalError } from '../middleware/errorHandler';

/** Rutas de reservas — público (POST crear, GET fechas ocupadas), admin/support (listar, cambiar estado) */
const router = Router();

router.post('/', publicFormRateLimiter, reservationValidation, handleValidationErrors, async (req, res) => {
  try {
    const { tipo, item_id, item_nombre, item_slug, fecha, nombre, email, telefono, cantidad_personas, notas } = req.body;

    const selectedDate = new Date(fecha + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      return res.status(400).json({ error: 'La fecha seleccionada no es válida o ya pasó.' });
    }

    // El curso/estadía debe existir y estar activo, y el nombre/slug guardados salen de la BD:
    // antes se aceptaba cualquier item_id e item_nombre enviados por el navegador.
    const item = tipo === 'academia'
      ? await dbService.getCourseById(item_id).then(c => c && { activo: c.activo, nombre: c.title, slug: c.slug, capacidad: c.maxPeople })
      : await dbService.getHaciendaById(item_id).then(h => h && { activo: h.activo, nombre: h.nombre, slug: h.slug, capacidad: h.capacidad_max });
    if (!item || !item.activo) {
      return res.status(400).json({ error: 'El curso o la estadía seleccionada no está disponible.' });
    }
    if (item.capacidad && Number(cantidad_personas) > item.capacidad) {
      return res.status(400).json({ error: `El cupo máximo es de ${item.capacidad} personas.` });
    }

    const reservation = await dbService.createReservation({
      tipo,
      item_id,
      item_nombre: item.nombre,
      item_slug: item.slug || item_slug || '',
      fecha,
      nombre,
      email,
      telefono,
      cantidad_personas: Number(cantidad_personas),
      notas: notas || '',
    });

    return res.status(201).json({ success: true, reservation });
  } catch (err: any) {
    return internalError(res, err);
  }
});

// Public: get occupied dates for a specific item
router.get('/ocupadas', async (req, res) => {
  try {
    const { tipo, item_id } = req.query;
    if (!tipo || !item_id || typeof tipo !== 'string' || typeof item_id !== 'string') {
      return res.status(400).json({ error: 'tipo e item_id son requeridos.' });
    }
    if (!['academia', 'estadia'].includes(tipo)) {
      return res.status(400).json({ error: 'Tipo no válido.' });
    }
    const dates = await dbService.getOccupiedDates(tipo as 'academia' | 'estadia', item_id);
    return res.json({ dates });
  } catch (err: any) {
    return internalError(res, err);
  }
});

// Admin: list all reservations
router.get('/', authenticateToken, requireRole('admin', 'support'), async (_req, res) => {
  try {
    return res.json(await dbService.getReservations());
  } catch (err: any) {
    return internalError(res, err);
  }
});

// Admin: update reservation status
router.put('/:id/estado', authenticateToken, requireRole('admin', 'support'), async (req, res) => {
  try {
    const { estado } = req.body;
    if (!['pendiente', 'confirmada', 'cancelada'].includes(estado)) {
      return res.status(400).json({ error: 'Estado no válido.' });
    }
    const updated = await dbService.updateReservationState(req.params.id, estado);
    if (!updated) {
      return res.status(404).json({ error: 'Reserva no encontrada.' });
    }
    return res.json({ success: true, reservation: updated });
  } catch (err: any) {
    return internalError(res, err);
  }
});

export default router;
