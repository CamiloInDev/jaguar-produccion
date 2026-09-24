import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('[FATAL ERROR]', err.stack || err.message || err);

  // Avoid leaking sensitive details in production
  const message = env.NODE_ENV === 'production'
    ? 'Error interno del servidor. Intente de nuevo.'
    : (err.message || 'Error interno del servidor. Intente de nuevo.');

  res.status(500).json({ error: message });
}

/**
 * Responde un 500 genérico a partir de un catch de ruta.
 * A diferencia de `errorHandler` (que solo atrapa errores no manejados vía
 * `next(err)`), la mayoría de rutas hacen try/catch propio y devolvían
 * `err.message` crudo al cliente — eso se saltaba el filtro de producción
 * y podía filtrar detalles internos (mensajes de MySQL, rutas de archivos, etc).
 * Este helper centraliza el mismo criterio de `errorHandler` para esos catches.
 */
export function internalError(res: Response, err: unknown): void {
  const raw = err instanceof Error ? (err.stack || err.message) : String(err);
  console.error('[ERROR]', raw);
  const message = env.NODE_ENV === 'production'
    ? 'Error interno del servidor. Intente de nuevo.'
    : (err instanceof Error ? err.message : 'Error interno del servidor. Intente de nuevo.');
  res.status(500).json({ error: message });
}
