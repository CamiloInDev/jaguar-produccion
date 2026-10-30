import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { internalError } from '../middleware/errorHandler';
import { crearRespaldo, listarRespaldos, rutaRespaldo } from '../jobs/respaldo-bd';

/** Respaldos de la base de datos: solo admin (contienen datos personales y hashes). */
const router = Router();
router.use(authenticateToken, requireRole('admin'));

router.get('/', (_req, res) => {
  try {
    return res.json(listarRespaldos());
  } catch (err: any) {
    return internalError(res, err);
  }
});

router.post('/', async (_req, res) => {
  try {
    return res.status(201).json(await crearRespaldo());
  } catch (err: any) {
    return internalError(res, err);
  }
});

router.get('/:nombre', (req, res) => {
  const ruta = rutaRespaldo(req.params.nombre);
  if (!ruta) return res.status(404).json({ error: 'Respaldo no encontrado.' });
  res.setHeader('Cache-Control', 'no-store');
  return res.download(ruta, req.params.nombre);
});

export default router;
