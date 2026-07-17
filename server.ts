import express from 'express';
import path from 'path';
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
import contactRoutes from './server/routes/contact';
import orderRoutes from './server/routes/orders';
import slideRoutes from './server/routes/slides';
import reservationRoutes from './server/routes/reservations';
import userRoutes from './server/routes/users';

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
  contentSecurityPolicy: env.NODE_ENV === 'production'
    ? {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "https://www.instagram.com", "https://*.cdninstagram.com"],
          frameSrc: ["'self'", "https://www.instagram.com", "https://*.cdninstagram.com", "https://www.google.com"],
          imgSrc: ["'self'", "data:", "https://www.instagram.com", "https://*.cdninstagram.com", "https://cafejaguar.com", "https://images.unsplash.com"],
          connectSrc: ["'self'", "https://www.instagram.com"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
          baseUri: ["'self'"],
        },
      }
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

// Rate limiting for API routes
app.use(apiRateLimiter);

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
app.use('/api/contacto', contactRoutes);
app.use('/api/ordenes', orderRoutes);
app.use('/api/slides', slideRoutes);
app.use('/api/reservas', reservationRoutes);
app.use('/api/usuarios', userRoutes);

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
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    app.listen(env.PORT, '0.0.0.0', () => {
      console.log(`[JAGUAR-SERVER] Running on http://localhost:${env.PORT}`);
    });
  } catch (err) {
    console.log(`[STARTUP ERROR] ${err}`);
    process.exit(1);
  }
}

start();
