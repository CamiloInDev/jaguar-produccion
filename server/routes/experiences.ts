import { Router } from 'express';
import { dbService } from '../db';
import { authenticateToken, requireRole } from '../middleware/auth';
import { experienceValidation, handleValidationErrors } from '../middleware/validate';
import { deleteUploadedFile } from '../lib/uploads';

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

router.post('/', authenticateToken, requireRole('admin', 'editor'), experienceValidation, handleValidationErrors, async (req, res) => {
  try {
    const { nombre, descripcion, duracion_min, precio, capacidad_max, imagen_url, imagenes, detalles_incluidos, recomendaciones, booking_widget, activo } = req.body;
    await dbService.saveExperience({
      nombre,
      descripcion,
      duracion_min: Number(duracion_min),
      precio: Number(precio),
      capacidad_max: Number(capacidad_max),
      imagen_url,
      imagenes: imagenes || [],
      detalles_incluidos: detalles_incluidos || undefined,
      recomendaciones: recomendaciones || undefined,
      booking_widget: booking_widget || '<p>Default Booking Widget Embed</p>',
      activo: activo !== undefined ? activo : true,
    });
    return res.status(201).json({ success: true, message: 'Experiencia creada.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticateToken, requireRole('admin', 'editor'), experienceValidation, handleValidationErrors, async (req, res) => {
  try {
    const { nombre, descripcion, duracion_min, precio, capacidad_max, imagen_url, imagenes, detalles_incluidos, recomendaciones, booking_widget, activo } = req.body;
    const previous = await dbService.getExperienceById(req.params.id);
    await dbService.saveExperience({
      id: req.params.id,
      nombre,
      descripcion,
      duracion_min: Number(duracion_min),
      precio: Number(precio),
      capacidad_max: Number(capacidad_max),
      imagen_url,
      imagenes: imagenes || [],
      detalles_incluidos: detalles_incluidos || undefined,
      recomendaciones: recomendaciones || undefined,
      booking_widget: booking_widget || '<p>Default Booking Widget Embed</p>',
      activo: activo !== undefined ? activo : true,
    });
    if (previous && previous.imagen_url !== imagen_url) {
      await deleteUploadedFile(previous.imagen_url);
    }
    return res.json({ success: true, message: 'Experiencia actualizada exitosamente.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticateToken, requireRole('admin', 'editor'), async (req, res) => {
  try {
    const existing = await dbService.getExperienceById(req.params.id);
    await dbService.deleteExperience(req.params.id);
    if (existing) {
      await deleteUploadedFile(existing.imagen_url);
      for (const img of existing.imagenes || []) await deleteUploadedFile(img);
    }
    return res.json({ success: true, message: 'Experiencia eliminada.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
