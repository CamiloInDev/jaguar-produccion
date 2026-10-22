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

/**
 * Formularios públicos sin login (contacto, reservas): un límite propio y bajo, porque
 * cada envío escribe en la BD y le llega al equipo. Sin él solo aplicaba el global (500).
 */
export const publicFormRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv,
  handler: (_req, res) => {
    res.status(429).json({ error: 'Has enviado demasiados formularios seguidos. Intenta de nuevo en unos minutos.' });
  }
});

/**
 * Webhooks de la pasarela. No son usuarios: MP puede reintentar en ráfaga y cada aviso
 * legítimo debe entrar. El límite es alto (corta un bucle de peticiones falsas, que
 * cada una cuesta una consulta a la API de MP) pero no estorba a las notificaciones reales.
 */
export const webhookRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv,
  handler: (_req, res) => {
    res.status(429).json({ error: 'Demasiadas notificaciones.' });
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

/**
 * Mensajes hacia el asistente de chat. Cada uno cuesta tokens (dinero real), así que
 * el límite es por-mensaje y bajo: 20 mensajes por IP cada 15 minutos cubre una
 * conversación larga sin dejar abierta la llave de gasto a abuso automatizado.
 */
export const chatRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv,
  handler: (_req, res) => {
    res.status(429).json({ error: 'El asistente alcanzó el límite de mensajes por ahora. Escríbenos por WhatsApp: https://wa.me/573157307016' });
  }
});
