import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UserRole } from '../../src/types';

export interface AuthenticatedRequest extends Request {}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const token = req.cookies?.token;

  if (!token) {
    res.status(401).json({ error: 'Inicie sesión para continuar.' });
    return;
  }

  jwt.verify(token, env.JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      res.clearCookie('token');
      res.status(403).json({ error: 'Su sesión ha expirado.' });
      return;
    }

    req.user = decoded as { id: string; email: string; rol: UserRole };
    next();
  });
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
