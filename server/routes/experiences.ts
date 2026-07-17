import { Router } from 'express';
import { dbService } from '../db';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    return res.json(await dbService.getExperiences());
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const exp = await dbService.getExperienceBySlug(req.params.slug);
    if (!exp) return res.status(404).json({ error: 'Experiencia no encontrada.' });
    return res.json(exp);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticateToken, requireRole('admin', 'editor'), async (req, res) => {
  try {
    const { nombre, descripcion, duracion_min, precio, capacidad_max, imagen_url, imagenes, booking_widget } = req.body;
    await dbService.saveExperience({
      nombre,
      descripcion,
      duracion_min: Number(duracion_min),
      precio: Number(precio),
      capacidad_max: Number(capacidad_max),
      imagen_url,
      imagenes: imagenes || [],
      booking_widget: booking_widget || '<p>Default Booking Widget Embed</p>',
      activo: true,
    });
    return res.status(201).json({ success: true, message: 'Experiencia creada.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticateToken, requireRole('admin', 'editor'), async (req, res) => {
  try {
    await dbService.deleteExperience(req.params.id);
    return res.json({ success: true, message: 'Experiencia eliminada.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
