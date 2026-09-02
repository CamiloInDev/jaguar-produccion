import { Router } from 'express';
import { dbService } from '../db';
import { authenticateToken, requireRole } from '../middleware/auth';
import { slideValidation, handleValidationErrors } from '../middleware/validate';
import { deleteUploadedFile } from '../lib/uploads';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const slides = await dbService.getSlides();
    return res.json(slides || []);
  } catch (err: any) {
    console.error('[API /slides GET]', err);
    return res.json([]);
  }
});

router.get('/all', authenticateToken, requireRole('admin', 'editor'), async (_req, res) => {
  try {
    const slides = await dbService.getAllSlides();
    return res.json(slides || []);
  } catch (err: any) {
    console.error('[API /slides/all GET]', err);
    return res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authenticateToken, requireRole('admin', 'editor'), async (req, res) => {
  try {
    const slide = await dbService.getSlideById(req.params.id);
    if (!slide) return res.status(404).json({ error: 'Slide no encontrado.' });
    return res.json(slide);
  } catch (err: any) {
    console.error('[API /slides/:id GET]', err);
    return res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticateToken, requireRole('admin', 'editor'), slideValidation, handleValidationErrors, async (req, res) => {
  try {
    const { title, subtitle, badge, buttonText, buttonLink, button2Text, button2Link, bgImage, orden, activo } = req.body;
    await dbService.saveSlide({
      title,
      subtitle,
      badge,
      buttonText,
      buttonLink,
      button2Text: button2Text || null,
      button2Link: button2Link || null,
      bgImage,
      orden: orden || 1,
      activo: activo !== undefined ? activo : true,
    });
    return res.status(201).json({ success: true, message: 'Slide creado exitosamente.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticateToken, requireRole('admin', 'editor'), slideValidation, handleValidationErrors, async (req, res) => {
  try {
    const { title, subtitle, badge, buttonText, buttonLink, button2Text, button2Link, bgImage, orden, activo } = req.body;
    const previous = await dbService.getSlideById(req.params.id);
    await dbService.saveSlide({
      id: req.params.id,
      title,
      subtitle,
      badge,
      buttonText,
      buttonLink,
      button2Text: button2Text || null,
      button2Link: button2Link || null,
      bgImage,
      orden: orden || 1,
      activo: activo !== undefined ? activo : true,
    });
    if (previous && previous.bgImage !== bgImage) {
      await deleteUploadedFile(previous.bgImage);
    }
    return res.json({ success: true, message: 'Slide actualizado exitosamente.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticateToken, requireRole('admin', 'editor'), async (req, res) => {
  try {
    const existing = await dbService.getSlideById(req.params.id);
    await dbService.deleteSlide(req.params.id);
    if (existing) await deleteUploadedFile(existing.bgImage);
    return res.json({ success: true, message: 'Slide eliminado.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
