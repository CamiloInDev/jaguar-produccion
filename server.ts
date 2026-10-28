import express from 'express';
import path from 'path';
import fs from 'fs';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';

import type { HelmetOptions } from 'helmet';
import { env } from './server/config/env';
import { errorHandler } from './server/middleware/errorHandler';
import { apiRateLimiter } from './server/middleware/rateLimiter';

import authRoutes from './server/routes/auth';
import productRoutes from './server/routes/products';
import experienceRoutes from './server/routes/experiences';
import haciendaRoutes from './server/routes/haciendas';
import courseRoutes from './server/routes/courses';
import uploadRoutes from './server/routes/uploads';
import contactRoutes from './server/routes/contact';
import orderRoutes from './server/routes/orders';
import slideRoutes from './server/routes/slides';
import reservationRoutes from './server/routes/reservations';
import userRoutes from './server/routes/users';
import chatRoutes from './server/routes/chat';
import { UPLOADS_DIR, ensureUploadsDir } from './server/lib/uploads';
import { cspDirectives } from './server/config/csp';
import { buildSeo, sitemapUrls, clearSeoCache } from './server/seo';
import { invalidateCatalogCache, isChatEnabled } from './server/services/chatbot';
import { dbService } from './server/db';
import { startReconciliacionPagos } from './server/jobs/reconciliar-pagos';

// -----------------------------------------------------------------------------
// Global error handlers to catch ALL crashes
// -----------------------------------------------------------------------------
process.on('uncaughtException', (err) => {
  console.log(`[UNCAUGHT EXCEPTION] ${err.message}`);
  console.log(`[STACK] ${err.stack}`);
  console.log('[SERVER] Restarting in 2 seconds...');
  setTimeout(() => process.exit(1), 2000);
});

process.on('unhandledRejection', (reason, _promise) => {
  console.log(`[UNHANDLED REJECTION] ${reason}`);
  console.log('[SERVER] Restarting in 2 seconds...');
  setTimeout(() => process.exit(1), 2000);
});

// -----------------------------------------------------------------------------
// Express application setup
// -----------------------------------------------------------------------------
const app = express();

// Trust proxy when running behind a reverse proxy in production
if (env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Security headers — relaxed in development for Vite HMR
const helmetConfig: HelmetOptions & { crossOriginEmbedderPolicy?: boolean } = {
  crossOriginEmbedderPolicy: env.NODE_ENV === 'production' ? undefined : false,
  strictTransportSecurity: env.NODE_ENV === 'production'
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false,
  // Directivas en server/config/csp.ts (compartidas con la <meta> que inyecta vite.config.ts)
  contentSecurityPolicy: env.NODE_ENV === 'production'
    ? { useDefaults: false, directives: cspDirectives }
    : false,
};

app.use(helmet(helmetConfig));

// CORS — open in development, restricted in production
app.disable('x-powered-by');

app.use(cors({
  origin: env.NODE_ENV === 'production' ? env.APP_URL : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

let sitemapCache: { at: number; xml: string } | null = null;

// Una sola versión del host para Google: www.jaguarcoffeeco.com → jaguarcoffeeco.com (301)
if (env.NODE_ENV === 'production') {
  const canonicalHost = new URL(env.APP_URL).hostname;
  app.use((req, res, next) => {
    if (req.hostname === 'www.' + canonicalHost) {
      return res.redirect(301, `${env.APP_URL}${req.originalUrl}`);
    }
    next();
  });
}

// Rate limiting for API routes
app.use(apiRateLimiter);

// Al editar catálogo desde Admin se vacía el caché del SEO por ruta y del sitemap,
// para que títulos, precios e imágenes nuevos salgan de inmediato en previews y en Google.
app.use(/^\/api\/(productos|experiencias|haciendas)/, (req, res, next) => {
  if (req.method !== 'GET') {
    res.on('finish', () => {
      if (res.statusCode < 400) { clearSeoCache(); sitemapCache = null; invalidateCatalogCache(); }
    });
  }
  next();
});

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Request logging for API only
app.use((req, res, next) => {
  if (req.url.startsWith('/api/')) {
    console.log(`${req.method} ${req.url}`);
  }
  next();
});

// -----------------------------------------------------------------------------
// Health check
// -----------------------------------------------------------------------------
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// -----------------------------------------------------------------------------
// API routes
// -----------------------------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/productos', productRoutes);
app.use('/api/experiencias', experienceRoutes);
app.use('/api/haciendas', haciendaRoutes);
app.use('/api/cursos', courseRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/contacto', contactRoutes);
app.use('/api/ordenes', orderRoutes);
app.use('/api/slides', slideRoutes);
app.use('/api/reservas', reservationRoutes);
app.use('/api/usuarios', userRoutes);
app.use('/api/chat', chatRoutes);

// Cualquier petición que no haya casado con una ruta /api (ruta o método inexistente):
// 404 JSON para TODOS los métodos. Sin esto, un DELETE/GET no registrado caía en el
// 404 por defecto de Express, que responde HTML.
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'No encontrado.' });
});

// Purga de conversaciones viejas del asistente (>90 días): una vez por arranque.
// Si el bot está desactivado no hay por qué tocar la tabla.
if (isChatEnabled()) {
  dbService.pruneOldChatMessages(90)
    .then(deleted => { if (deleted > 0) console.log(`[CHAT] Purga de chat_messages: ${deleted} filas >90 días borradas`); })
    .catch(err => console.error(`[CHAT] Purga de chat_messages falló: ${err.message}`));
}

// -----------------------------------------------------------------------------
// SEO: robots.txt y sitemap.xml dinámico (solo URLs públicas, canónicas y activas).
// Las rutas privadas NO se bloquean aquí: llevan noindex y Google necesita poder leerlo.
// -----------------------------------------------------------------------------
app.get('/robots.txt', (_req, res) => {
  res.type('text/plain').send(`User-agent: *\nDisallow: /api/\nAllow: /\n\nSitemap: ${env.APP_URL}/sitemap.xml\n`);
});

app.get('/sitemap.xml', async (_req, res, next) => {
  try {
    if (!sitemapCache || Date.now() - sitemapCache.at > 10 * 60 * 1000) {
      const urls = await sitemapUrls(env.APP_URL);
      const body = urls.map(u => `  <url><loc>${u.replace(/&/g, '&amp;')}</loc></url>`).join('\n');
      sitemapCache = {
        at: Date.now(),
        xml: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`,
      };
    }
    res.type('application/xml').send(sitemapCache.xml);
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// Archivos subidos por el admin (imágenes optimizadas). En producción viven fuera de la app (ver server/lib/uploads.ts)
// -----------------------------------------------------------------------------
ensureUploadsDir();
console.log(`[uploads] Carpeta de imágenes: ${UPLOADS_DIR}`);
app.use('/uploads', express.static(UPLOADS_DIR));

// -----------------------------------------------------------------------------
// Global error handler
// -----------------------------------------------------------------------------
app.use(errorHandler);

// -----------------------------------------------------------------------------
// Vite / static serving and server start
// -----------------------------------------------------------------------------
async function start() {
  try {
    if (env.NODE_ENV !== 'production') {
      console.log('Starting Vite dev server...');
      const vite = await createViteServer({
        server: {
          middlewareMode: true,
          hmr: { overlay: false }
        },
        appType: 'spa',
      });
      console.log('Vite server created successfully');
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      // Plantilla leída una vez; el <title> fijo se reemplaza por el head SEO de cada ruta.
      const indexTemplate = fs.readFileSync(path.join(distPath, 'index.html'), 'utf8');
      const titleTag = /<title>[\s\S]*?<\/title>/;
      if (!titleTag.test(indexTemplate)) throw new Error('dist/index.html no tiene <title>: no se puede inyectar el SEO');

      // dist/ también contiene el backend compilado (server.cjs y su .map con el código fuente):
      // nunca se sirve como archivo estático.
      app.use((req, res, next) => {
        let p = req.path;
        try { p = decodeURIComponent(p); } catch { /* ruta mal codificada: la decide static */ }
        if (/\/server\.cjs(\.map)?$/i.test(p)) return res.status(404).json({ error: 'No encontrado.' });
        next();
      });
      app.use(express.static(distPath, {
        index: false, // "/" también pasa por el inyector SEO de abajo
        setHeaders: (res, filePath) => {
          // Los assets de Vite llevan hash en el nombre: se pueden cachear para siempre
          if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
        },
      }));
      app.get('*', async (req, res, next) => {
        // Rutas de API o archivos inexistentes no deben devolver la SPA
        if (req.path.startsWith('/api/') || path.extname(req.path)) {
          return res.status(404).json({ error: 'No encontrado.' });
        }
        try {
          const seo = await buildSeo(env.APP_URL, req.path);
          if (seo.noindex) res.setHeader('X-Robots-Tag', 'noindex');
          res.setHeader('Cache-Control', 'no-cache');
          res.status(seo.status).type('html').send(indexTemplate.replace(titleTag, seo.head));
        } catch (err) {
          next(err);
        }
      });
      app.use(errorHandler);
    }

    app.listen(env.PORT, '0.0.0.0', () => {
      console.log(`[JAGUAR-SERVER] Running on http://localhost:${env.PORT}`);
      startReconciliacionPagos();
    });
  } catch (err) {
    console.log(`[STARTUP ERROR] ${err}`);
    process.exit(1);
  }
}

start();
