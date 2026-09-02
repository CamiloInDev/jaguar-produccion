import { Router } from 'express';
import multer from 'multer';
import { authenticateToken, requireRole } from '../middleware/auth';
import { optimizeAndSaveImage } from '../lib/uploads';

const router = Router();

const ALLOWED_MIMETYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
      return cb(new Error('Formato de imagen no soportado. Usa JPG, PNG, WEBP o GIF.'));
    }
    cb(null, true);
  },
});

router.post('/', authenticateToken, requireRole('admin', 'editor'), (req, res) => {
  upload.single('image')(req, res, async (err: any) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Error subiendo la imagen.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió ningún archivo.' });
    }
    try {
      const url = await optimizeAndSaveImage(req.file.buffer);
      return res.status(201).json({ success: true, url });
    } catch (procErr: any) {
      return res.status(400).json({ error: 'No se pudo procesar la imagen: ' + procErr.message });
    }
  });
});

export default router;
