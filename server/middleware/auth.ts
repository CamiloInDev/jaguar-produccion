import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { dbService } from '../db';
import { UserRole } from '../../src/types';

export interface AuthenticatedRequest extends Request {}

/**
 * Valida la cookie de sesión y carga el usuario DESDE LA BD en cada petición.
 *
 * El JWT solo prueba quién es (id) y con qué versión de sesión se emitió (tv). El rol
 * NO se toma del token: antes sí, y eso hacía que un cambio de rol no aplicara hasta
 * volver a iniciar sesión — un admin degradado o borrado seguía siendo admin hasta 7
 * días, y un usuario recién promovido veía el panel vacío (sus peticiones daban 403).
 * `tv` distinto al `token_version` actual = sesión revocada (cambio de contraseña).
 */
export async function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.token;

  if (!token) {
    res.status(401).json({ error: 'Inicie sesión para continuar.' });
    return;
  }

  let decoded: any;
  try {
    decoded = jwt.verify(token, env.JWT_SECRET, { issuer: 'cafe-jaguar', audience: env.APP_URL });
  } catch {
    res.clearCookie('token');
    res.status(403).json({ error: 'Su sesión ha expirado.' });
    return;
  }

  try {
    const user = await dbService.getAuthUser(String(decoded?.id ?? ''));
    if (!user || Number(decoded?.tv ?? 0) !== user.token_version) {
      res.clearCookie('token');
      res.status(401).json({ error: 'Su sesión ya no es válida. Inicie sesión de nuevo.' });
      return;
    }
    req.user = { id: user.id, email: user.email, rol: user.rol as UserRole };
    next();
  } catch (err) {
    next(err);
  }
}

/** Requiere rol admin (compatibilidad con rutas existentes). */
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.rol !== 'admin') {
    res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
    return;
  }
  next();
}

/** Requiere que el usuario tenga uno de los roles indicados. */
export function requireRole(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.rol)) {
      res.status(403).json({ error: 'Acceso denegado. No tiene permisos para esta operación.' });
      return;
    }
    next();
  };
}
