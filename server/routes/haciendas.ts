import { Router } from 'express';
import { dbService } from '../db';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    return res.json(await dbService.getHaciendas());
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
