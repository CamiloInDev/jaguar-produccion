import { Router } from 'express';
import { dbService } from '../db';
import { authenticateToken, requireRole } from '../middleware/auth';
import { productValidation, handleValidationErrors } from '../middleware/validate';
import { deleteUploadedFile } from '../lib/uploads';

const router = Router();

router.get('/', async (req, res) => {
  try {
    let products = await dbService.getProducts();
    const { categoria, q } = req.query;

    if (categoria && categoria !== 'todos') {
      products = products.filter(p => p.categoria === categoria);
    }
    if (q) {
      const search = (q as string).toLowerCase();
      products = products.filter(p =>
        p.nombre.toLowerCase().includes(search) ||
        p.descripcion.toLowerCase().includes(search) ||
        p.origen.toLowerCase().includes(search)
      );
    }
    return res.json(products);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const prod = await dbService.getProductBySlug(req.params.slug);
    if (!prod) {
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }
    return res.json(prod);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticateToken, requireRole('admin', 'editor'), productValidation, handleValidationErrors, async (req, res) => {
  try {
    const { nombre, descripcion, precio, precio_antes, stock, categoria, origen, tueste, imagen_url, activo } = req.body;
    await dbService.saveProduct({
      nombre,
      descripcion,
      precio: Number(precio),
      precio_antes: precio_antes ? Number(precio_antes) : undefined,
      stock: Number(stock),
      categoria,
      origen,
      tueste,
      imagen_url,
      activo: activo !== undefined ? activo : true,
    });
    return res.status(201).json({ success: true, message: 'Producto creado exitosamente.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticateToken, requireRole('admin', 'editor'), productValidation, handleValidationErrors, async (req, res) => {
  try {
    const id = req.params.id;
    const { nombre, descripcion, precio, precio_antes, stock, categoria, origen, tueste, imagen_url, activo } = req.body;
    const previous = await dbService.getProductById(id);
    await dbService.saveProduct({
      id,
      nombre,
      descripcion,
      precio: Number(precio),
      precio_antes: precio_antes ? Number(precio_antes) : undefined,
      stock: Number(stock),
      categoria,
      origen,
      tueste,
      imagen_url,
      activo: activo !== undefined ? activo : true,
    });
    if (previous && previous.imagen_url !== imagen_url) {
      await deleteUploadedFile(previous.imagen_url);
    }
    return res.json({ success: true, message: 'Producto actualizado exitosamente.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticateToken, requireRole('admin', 'editor'), async (req, res) => {
  try {
    const existing = await dbService.getProductById(req.params.id);
    await dbService.deleteProduct(req.params.id);
    if (existing) await deleteUploadedFile(existing.imagen_url);
    return res.json({ success: true, message: 'Producto eliminado.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
