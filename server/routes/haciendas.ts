import { Router } from 'express';
import { dbService } from '../db';
import { authenticateToken, requireRole } from '../middleware/auth';
import { haciendaValidation, handleValidationErrors } from '../middleware/validate';
import { deleteUploadedFile } from '../lib/uploads';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const haciendas = await dbService.getHaciendas();
    return res.json(haciendas || []);
  } catch (err: any) {
    console.error('[API /haciendas GET]', err);
    return res.json([]);
  }
});

router.get('/all', authenticateToken, requireRole('admin', 'editor'), async (_req, res) => {
  try {
    const haciendas = await dbService.getAllHaciendas();
    return res.json(haciendas || []);
  } catch (err: any) {
    console.error('[API /haciendas/all GET]', err);
    return res.status(500).json({ error: err.message });
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const hacienda = await dbService.getHaciendaBySlug(req.params.slug);
    if (!hacienda) return res.status(404).json({ error: 'Estadía no encontrada.' });
    return res.json(hacienda);
  } catch (err: any) {
    console.error('[API /haciendas/:slug GET]', err);
    return res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticateToken, requireRole('admin', 'editor'), haciendaValidation, handleValidationErrors, async (req, res) => {
  try {
    const {
      nombre, tipo, descripcion, descripcion_corta, ubicacion, capacidad_max, precio_noche,
      imagen_url, galeria, features, airbnb_url, booking_url, google_maps_url, pet_friendly, orden, activo
    } = req.body;
    await dbService.saveHacienda({
      nombre,
      tipo,
      descripcion,
      descripcion_corta,
      ubicacion,
      capacidad_max: Number(capacidad_max),
      precio_noche: Number(precio_noche),
      imagen_url,
      galeria: galeria || [],
      features: features || [],
      airbnb_url: airbnb_url || '',
      booking_url: booking_url || '',
      google_maps_url: google_maps_url || '',
      pet_friendly: pet_friendly ?? false,
      orden: orden ?? 1,
      activo: activo !== undefined ? activo : true,
    });
    return res.status(201).json({ success: true, message: 'Estadía creada exitosamente.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticateToken, requireRole('admin', 'editor'), haciendaValidation, handleValidationErrors, async (req, res) => {
  try {
    const {
      nombre, tipo, descripcion, descripcion_corta, ubicacion, capacidad_max, precio_noche,
      imagen_url, galeria, features, airbnb_url, booking_url, google_maps_url, pet_friendly, orden, activo
    } = req.body;
    const previous = await dbService.getHaciendaById(req.params.id);
    await dbService.saveHacienda({
      id: req.params.id,
      nombre,
      tipo,
      descripcion,
      descripcion_corta,
      ubicacion,
      capacidad_max: Number(capacidad_max),
      precio_noche: Number(precio_noche),
      imagen_url,
      galeria: galeria || [],
      features: features || [],
      airbnb_url: airbnb_url || '',
      booking_url: booking_url || '',
      google_maps_url: google_maps_url || '',
      pet_friendly: pet_friendly ?? false,
      orden: orden ?? 1,
      activo: activo !== undefined ? activo : true,
    });
    if (previous && previous.imagen_url !== imagen_url) {
      await deleteUploadedFile(previous.imagen_url);
    }
    return res.json({ success: true, message: 'Estadía actualizada exitosamente.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticateToken, requireRole('admin', 'editor'), async (req, res) => {
  try {
    const existing = await dbService.getHaciendaById(req.params.id);
    await dbService.deleteHacienda(req.params.id);
    if (existing) {
      await deleteUploadedFile(existing.imagen_url);
      for (const img of existing.galeria || []) await deleteUploadedFile(img);
    }
    return res.json({ success: true, message: 'Estadía eliminada.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
