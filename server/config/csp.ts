/**
 * Content-Security-Policy de producción — fuente única para las dos formas en que se aplica:
 *
 * 1. Cabecera HTTP vía Helmet (server.ts).
 * 2. <meta http-equiv="Content-Security-Policy"> inyectada en index.html al compilar
 *    (vite.config.ts). Hace falta porque el CDN de Hostinger (`Server: hcdn`) reemplaza la
 *    cabecera por `upgrade-insecure-requests`; la meta llega intacta dentro del HTML.
 *
 * Este módulo no importa `env` a propósito: vite.config.ts lo carga al compilar, donde las
 * variables de entorno del servidor no existen.
 */
export const cspDirectives: Record<string, string[]> = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", 'https://www.instagram.com', 'https://*.cdninstagram.com'],
  scriptSrcAttr: ["'none'"],
  frameSrc: ["'self'", 'https://www.instagram.com', 'https://*.cdninstagram.com', 'https://www.google.com', 'https://n8n.skatmaskacore.com'],
  imgSrc: ["'self'", 'data:', 'https://www.instagram.com', 'https://*.cdninstagram.com', 'https://cafejaguar.com', 'https://images.unsplash.com'],
  connectSrc: ["'self'", 'https://www.instagram.com'],
  styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
  objectSrc: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"],
  // Solo cabecera: los navegadores ignoran frame-ancestors dentro de <meta>.
  // X-Frame-Options (Helmet) cubre el mismo caso y sí atraviesa el CDN.
  frameAncestors: ["'self'"],
  upgradeInsecureRequests: [],
};

const toKebab = (k: string) => k.replace(/[A-Z]/g, c => '-' + c.toLowerCase());

/** La misma política serializada para la etiqueta <meta> (sin las directivas que <meta> no admite). */
export function cspMetaContent(): string {
  return Object.entries(cspDirectives)
    .filter(([k]) => k !== 'frameAncestors')
    .map(([k, v]) => [toKebab(k), ...v].join(' '))
    .join('; ');
}
