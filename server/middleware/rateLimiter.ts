import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

// Trust proxy in production (required when behind a reverse proxy)
const trustProxy = env.NODE_ENV === 'production';

// Los tests de integración ejercitan las rutas reales muchas más veces de lo que
// un cliente legítimo haría en 15 minutos (p. ej. login repetido por cada caso).
// El rate limiting es una preocupación de infraestructura, no de lógica de negocio,
// así que se desactiva en NODE_ENV=test y se mantiene intacto en producción/desarrollo.
const isTestEnv = env.NODE_ENV === 'test';

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isTestEnv || !req.url.startsWith('/api/'),
  handler: (_req, res) => {
    res.status(429).json({ error: 'Demasiadas solicitudes. Intente más tarde.' });
  }
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 auth attempts per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: false,
  skip: () => isTestEnv,
  handler: (_req, res) => {
    res.status(429).json({ error: 'Demasiados intentos de autenticación. Intente más tarde.' });
  }
});

export const checkoutRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv,
  handler: (_req, res) => {
    res.status(429).json({ error: 'Demasiadas solicitudes de pago. Intente más tarde.' });
  }
});
