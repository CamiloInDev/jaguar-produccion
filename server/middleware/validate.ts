import { body, param, query, ValidationChain, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

export function handleValidationErrors(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      error: 'Datos inválidos.',
      details: errors.array().map(e => ({ field: (e as any).path || e.msg, message: e.msg }))
    });
    return;
  }
  next();
}

export const registerValidation: ValidationChain[] = [
  body('email').isEmail().normalizeEmail().withMessage('Email inválido.'),
  body('password').isLength({ min: 8, max: 128 }).withMessage('La contraseña debe tener entre 8 y 128 caracteres.'),
  body('nombre').trim().isLength({ min: 2, max: 50 }).escape().withMessage('El nombre debe tener entre 2 y 50 caracteres.'),
  body('apellido').trim().isLength({ min: 2, max: 50 }).escape().withMessage('El apellido debe tener entre 2 y 50 caracteres.'),
  body('telefono').optional().trim().isLength({ max: 20 }).escape(),
];

export const loginValidation: ValidationChain[] = [
  body('email').isEmail().normalizeEmail().withMessage('Email inválido.'),
  body('password').isLength({ min: 1 }).withMessage('Contraseña requerida.'),
];

export const productValidation: ValidationChain[] = [
  body('nombre').trim().isLength({ min: 3, max: 100 }).escape().withMessage('Nombre inválido (3-100 caracteres).'),
  body('descripcion').trim().isLength({ min: 10, max: 2000 }).escape().withMessage('Descripción inválida.'),
  body('precio').isFloat({ min: 1 }).withMessage('Precio debe ser un número positivo.'),
  body('stock').isInt({ min: 0 }).withMessage('Stock debe ser un entero >= 0.'),
  body('categoria').isIn(['250gr', '175gr', 'institucional', 'togo']).withMessage('Categoría inválida.'),
  body('origen').trim().isLength({ min: 2, max: 100 }).escape().withMessage('Origen inválido.'),
  body('tueste').trim().isLength({ min: 2, max: 50 }).escape().withMessage('Tueste inválido.'),
  body('imagen_url').trim().isURL().withMessage('URL de imagen inválida.'),
  body('precio_antes').optional({ values: 'falsy' }).isFloat({ min: 1 }).withMessage('Precio anterior inválido.'),
];

export const slideValidation: ValidationChain[] = [
  body('title').trim().isLength({ min: 2, max: 200 }).escape().withMessage('Título inválido.'),
  body('subtitle').trim().isLength({ min: 2, max: 500 }).escape().withMessage('Subtítulo inválido.'),
  body('badge').trim().isLength({ min: 2, max: 100 }).escape().withMessage('Badge inválido.'),
  body('buttonText').trim().isLength({ min: 2, max: 50 }).escape().withMessage('Texto botón inválido.'),
  body('buttonLink').trim().isLength({ min: 1, max: 200 }).withMessage('Link botón inválido.'),
  body('bgImage').trim().isURL().withMessage('URL de imagen inválida.'),
];

export const contactValidation: ValidationChain[] = [
  body('nombre').trim().isLength({ min: 2, max: 100 }).escape().withMessage('Nombre inválido.'),
  body('email').isEmail().normalizeEmail().withMessage('Email inválido.'),
  body('asunto').trim().isLength({ min: 3, max: 200 }).escape().withMessage('Asunto inválido.'),
  body('mensaje').trim().isLength({ min: 10, max: 5000 }).escape().withMessage('Mensaje inválido (10-5000 caracteres).'),
];

export const orderStatusValidation: ValidationChain[] = [
  body('estado').isIn(['pendiente', 'pagado', 'enviado', 'entregado', 'cancelado']).withMessage('Estado de orden inválido.'),
];

export const reservationValidation: ValidationChain[] = [
  body('tipo').isIn(['academia', 'estadia']).withMessage('Tipo de reserva inválido.'),
  body('item_id').trim().notEmpty().withMessage('item_id requerido.'),
  body('item_nombre').trim().isLength({ min: 2, max: 200 }).escape().withMessage('Nombre del item inválido.'),
  body('fecha').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Formato de fecha inválido (YYYY-MM-DD).'),
  body('nombre').trim().isLength({ min: 2, max: 100 }).escape().withMessage('Nombre inválido.'),
  body('email').isEmail().normalizeEmail().withMessage('Email inválido.'),
  body('telefono').trim().isLength({ min: 7, max: 20 }).escape().withMessage('Teléfono inválido.'),
  body('cantidad_personas').isInt({ min: 1, max: 50 }).withMessage('Cantidad de personas inválida.'),
];

export const roleUpdateValidation: ValidationChain[] = [
  body('rol').isIn(['admin', 'editor', 'support', 'cliente']).withMessage('Rol inválido.'),
];

export const profileUpdateValidation: ValidationChain[] = [
  body('nombre').trim().isLength({ min: 2, max: 50 }).escape().withMessage('Nombre inválido.'),
  body('apellido').trim().isLength({ min: 2, max: 50 }).escape().withMessage('Apellido inválido.'),
  body('telefono').optional().trim().isLength({ max: 20 }).escape(),
];
