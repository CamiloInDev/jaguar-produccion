import { Router } from 'express';
import { dbService } from '../db';
import { authenticateToken, requireRole } from '../middleware/auth';
import { courseValidation, handleValidationErrors } from '../middleware/validate';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const courses = await dbService.getCourses();
    return res.json(courses || []);
  } catch (err: any) {
    console.error('[API /cursos GET]', err);
    return res.json([]);
  }
});

router.get('/all', authenticateToken, requireRole('admin', 'editor'), async (_req, res) => {
  try {
    const courses = await dbService.getAllCourses();
    return res.json(courses || []);
  } catch (err: any) {
    console.error('[API /cursos/all GET]', err);
    return res.status(500).json({ error: err.message });
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const course = await dbService.getCourseBySlug(req.params.slug);
    if (!course) return res.status(404).json({ error: 'Curso no encontrado.' });
    return res.json(course);
  } catch (err: any) {
    console.error('[API /cursos/:slug GET]', err);
    return res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticateToken, requireRole('admin', 'editor'), courseValidation, handleValidationErrors, async (req, res) => {
  try {
    const { title, duration, level, price, priceDetail, description, syllabus, maxPeople, orden, activo } = req.body;
    await dbService.saveCourse({
      title,
      duration,
      level,
      price,
      priceDetail: priceDetail || '',
      description,
      syllabus,
      maxPeople: maxPeople ?? 10,
      orden: orden ?? 1,
      activo: activo !== undefined ? activo : true,
    });
    return res.status(201).json({ success: true, message: 'Curso creado exitosamente.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticateToken, requireRole('admin', 'editor'), courseValidation, handleValidationErrors, async (req, res) => {
  try {
    const { title, duration, level, price, priceDetail, description, syllabus, maxPeople, orden, activo } = req.body;
    await dbService.saveCourse({
      id: req.params.id,
      title,
      duration,
      level,
      price,
      priceDetail: priceDetail || '',
      description,
      syllabus,
      maxPeople: maxPeople ?? 10,
      orden: orden ?? 1,
      activo: activo !== undefined ? activo : true,
    });
    return res.json({ success: true, message: 'Curso actualizado exitosamente.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticateToken, requireRole('admin', 'editor'), async (req, res) => {
  try {
    await dbService.deleteCourse(req.params.id);
    return res.json({ success: true, message: 'Curso eliminado.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
