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
  body('nombre').trim().isLength({ min: 2, max: 50 }).withMessage('El nombre debe tener entre 2 y 50 caracteres.'),
  body('apellido').trim().isLength({ min: 2, max: 50 }).withMessage('El apellido debe tener entre 2 y 50 caracteres.'),
  body('telefono').optional().trim().isLength({ max: 20 }),
];

export const loginValidation: ValidationChain[] = [
  body('email').isEmail().normalizeEmail().withMessage('Email inválido.'),
  body('password').isLength({ min: 1 }).withMessage('Contraseña requerida.'),
];

export const productValidation: ValidationChain[] = [
  body('nombre').trim().isLength({ min: 3, max: 100 }).withMessage('Nombre inválido (3-100 caracteres).'),
  body('descripcion').trim().isLength({ min: 10, max: 2000 }).withMessage('Descripción inválida.'),
  body('precio').isFloat({ min: 1 }).withMessage('Precio debe ser un número positivo.'),
  body('stock').isInt({ min: 0 }).withMessage('Stock debe ser un entero >= 0.'),
  body('categoria').isIn(['250gr', '175gr', 'institucional', 'togo']).withMessage('Categoría inválida.'),
  body('origen').trim().isLength({ min: 2, max: 100 }).withMessage('Origen inválido.'),
  body('tueste').trim().isLength({ min: 2, max: 50 }).withMessage('Tueste inválido.'),
  body('imagen_url').trim().matches(/^(https?:\/\/|\/)/).withMessage('Imagen inválida (URL o ruta /images.../ /uploads/...).'),
  body('precio_antes').optional({ values: 'falsy' }).isFloat({ min: 1 }).withMessage('Precio anterior inválido.'),
];

export const slideValidation: ValidationChain[] = [
  body('title').trim().isLength({ min: 2, max: 200 }).withMessage('Título inválido.'),
  body('subtitle').trim().isLength({ min: 2, max: 500 }).withMessage('Subtítulo inválido.'),
  body('badge').trim().isLength({ min: 2, max: 100 }).withMessage('Badge inválido.'),
  body('buttonText').trim().isLength({ min: 2, max: 50 }).withMessage('Texto botón inválido.'),
  body('buttonLink').trim().isLength({ min: 1, max: 200 }).withMessage('Link botón inválido.'),
  body('bgImage').trim().matches(/^(https?:\/\/|\/)/).withMessage('Imagen inválida (URL o ruta /images.../ /uploads/...).'),
];

export const experienceValidation: ValidationChain[] = [
  body('nombre').trim().isLength({ min: 3, max: 200 }).withMessage('Nombre inválido.'),
  body('descripcion').trim().isLength({ min: 10, max: 5000 }).withMessage('Descripción inválida.'),
  body('duracion_min').isInt({ min: 1, max: 1440 }).withMessage('Duración inválida.'),
  body('precio').isFloat({ min: 0 }).withMessage('Precio inválido.'),
  body('capacidad_max').isInt({ min: 1, max: 200 }).withMessage('Capacidad inválida.'),
  body('imagen_url').trim().matches(/^(https?:\/\/|\/)/).withMessage('Imagen inválida (URL o ruta /images/...).'),
  body('imagenes').optional().isArray().withMessage('Galería inválida.'),
  body('detalles_incluidos').optional().isArray().withMessage('Detalles incluidos inválido.'),
  body('recomendaciones').optional().isArray().withMessage('Recomendaciones inválido.'),
  body('booking_widget').optional({ values: 'falsy' }).trim().isLength({ max: 4000 }),
];

export const courseValidation: ValidationChain[] = [
  body('title').trim().isLength({ min: 3, max: 200 }).withMessage('Título inválido.'),
  body('duration').trim().isLength({ min: 2, max: 100 }).withMessage('Duración inválida.'),
  body('level').trim().isLength({ min: 2, max: 100 }).withMessage('Nivel inválido.'),
  body('price').trim().isLength({ min: 1, max: 100 }).withMessage('Precio inválido.'),
  body('priceDetail').optional({ values: 'falsy' }).trim().isLength({ max: 255 }),
  body('description').trim().isLength({ min: 10, max: 3000 }).withMessage('Descripción inválida.'),
  body('syllabus').isArray({ min: 1 }).withMessage('El temario debe tener al menos un ítem.'),
  body('imagen_url').optional({ values: 'falsy' }).trim().matches(/^(https?:\/\/|\/)/).withMessage('Imagen inválida (URL o ruta /images.../ /uploads/...).'),
  body('maxPeople').isInt({ min: 1, max: 200 }).withMessage('Cupo máximo inválido.'),
];

export const haciendaValidation: ValidationChain[] = [
  body('nombre').trim().isLength({ min: 3, max: 200 }).withMessage('Nombre inválido.'),
  body('tipo').trim().isLength({ min: 2, max: 60 }).withMessage('Tipo inválido.'),
  body('descripcion').trim().isLength({ min: 10, max: 5000 }).withMessage('Descripción inválida.'),
  body('descripcion_corta').trim().isLength({ min: 5, max: 255 }).withMessage('Descripción corta inválida.'),
  body('ubicacion').trim().isLength({ min: 2, max: 255 }).withMessage('Ubicación inválida.'),
  body('capacidad_max').isInt({ min: 1, max: 100 }).withMessage('Capacidad inválida.'),
  body('precio_noche').isFloat({ min: 0 }).withMessage('Precio por noche inválido.'),
  body('imagen_url').trim().matches(/^(https?:\/\/|\/)/).withMessage('Imagen inválida (URL o ruta /images/...).'),
  body('galeria').optional().isArray().withMessage('Galería inválida.'),
  body('features').optional().isArray().withMessage('Features inválido.'),
  body('airbnb_url').optional({ values: 'falsy' }).trim().isURL().withMessage('URL de Airbnb inválida.'),
  body('booking_url').optional({ values: 'falsy' }).trim().isURL().withMessage('URL de Booking inválida.'),
  body('google_maps_url').optional({ values: 'falsy' }).trim().isURL().withMessage('URL de Google Maps inválida.'),
];

export const contactValidation: ValidationChain[] = [
  body('nombre').trim().isLength({ min: 2, max: 100 }).withMessage('Nombre inválido.'),
  body('email').isEmail().normalizeEmail().withMessage('Email inválido.'),
  body('asunto').trim().isLength({ min: 3, max: 200 }).withMessage('Asunto inválido.'),
  body('mensaje').trim().isLength({ min: 10, max: 5000 }).withMessage('Mensaje inválido (10-5000 caracteres).'),
];

export const orderStatusValidation: ValidationChain[] = [
  body('estado').isIn(['pendiente', 'pagado', 'enviado', 'entregado', 'cancelado']).withMessage('Estado de orden inválido.'),
];

export const reservationValidation: ValidationChain[] = [
  body('tipo').isIn(['academia', 'estadia']).withMessage('Tipo de reserva inválido.'),
  body('item_id').trim().notEmpty().withMessage('item_id requerido.'),
  body('item_nombre').trim().isLength({ min: 2, max: 200 }).withMessage('Nombre del item inválido.'),
  body('fecha').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Formato de fecha inválido (YYYY-MM-DD).'),
  body('nombre').trim().isLength({ min: 2, max: 100 }).withMessage('Nombre inválido.'),
  body('email').isEmail().normalizeEmail().withMessage('Email inválido.'),
  body('telefono').trim().isLength({ min: 7, max: 20 }).withMessage('Teléfono inválido.'),
  body('cantidad_personas').isInt({ min: 1, max: 50 }).withMessage('Cantidad de personas inválida.'),
];

export const roleUpdateValidation: ValidationChain[] = [
  body('rol').isIn(['admin', 'editor', 'support', 'cliente']).withMessage('Rol inválido.'),
];

export const profileUpdateValidation: ValidationChain[] = [
  body('nombre').trim().isLength({ min: 2, max: 50 }).withMessage('Nombre inválido.'),
  body('apellido').trim().isLength({ min: 2, max: 50 }).withMessage('Apellido inválido.'),
  body('telefono').optional().trim().isLength({ max: 20 }),
];

export const requestPasswordResetValidation: ValidationChain[] = [
  body('email').isEmail().normalizeEmail().withMessage('Email inválido.'),
];

export const resetPasswordValidation: ValidationChain[] = [
  body('token').trim().isLength({ min: 32 }).withMessage('Token inválido.'),
  body('password').isLength({ min: 8, max: 128 }).withMessage('La contraseña debe tener entre 8 y 128 caracteres.'),
];

export const changePasswordValidation: ValidationChain[] = [
  body('currentPassword').isLength({ min: 1 }).withMessage('Contraseña actual requerida.'),
  body('newPassword').isLength({ min: 8, max: 128 }).withMessage('La nueva contraseña debe tener entre 8 y 128 caracteres.'),
];
