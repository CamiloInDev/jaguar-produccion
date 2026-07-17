import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables from .env file in development
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),

  // Security
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),

  // Wompi payment gateway
  WOMPI_INTEGRITY_KEY: z.string().min(1, 'WOMPI_INTEGRITY_KEY is required'),
  VITE_WOMPI_PUBLIC_KEY: z.string().min(1, 'VITE_WOMPI_PUBLIC_KEY is required'),

  // Application
  APP_URL: z.string().url().default('http://localhost:3000'),

  // MySQL database (Hostinger Business)
  DB_HOST: z.string().min(1, 'DB_HOST is required').default('localhost'),
  DB_PORT: z.coerce.number().default(3306),
  DB_USER: z.string().min(1, 'DB_USER is required'),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().min(1, 'DB_NAME is required'),

  // Seed admin (only used by the seed script; optional for the running server)
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),
  ADMIN_NOMBRE: z.string().optional(),
  ADMIN_APELLIDO: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('[ENV ERROR] Invalid or missing environment variables:');
  parsed.error.issues.forEach((issue) => {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  });
  console.error('[ENV ERROR] Please check your .env file or environment configuration.');
  process.exit(1);
}

export const env = parsed.data;
