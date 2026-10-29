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

  // Mercado Pago (Checkout Pro, variante Preferences API)
  // Ojo: el Access Token de PRUEBA de Checkout Pro también empieza con APP_USR-,
  // así que no se distingue de producción por el prefijo — cada ambiente tiene el suyo.
  MP_ACCESS_TOKEN: z.string().min(1, 'MP_ACCESS_TOKEN is required'),
  // Clave secreta de "Tus integraciones > Webhooks" (firma x-signature). No es el Access Token.
  MP_WEBHOOK_SECRET: z.string().min(1, 'MP_WEBHOOK_SECRET is required'),
  // Texto en el extracto de la tarjeta del comprador (máx. 13 caracteres según Mercado Pago)
  MP_STATEMENT_DESCRIPTOR: z.string().min(1).max(13).default('JAGUARCOFFEE'),
  // Decisiones de producto (2026-10-29): sin Efecty, 1 cuota y link de pago de 2 horas.
  // Se pueden cambiar por variable de entorno sin tocar código.
  // tipos de pago a excluir separados por coma ("ticket" quita Efecty; "bank_transfer" quita PSE; vacío = ninguno)
  MP_EXCLUDED_PAYMENT_TYPES: z.string().default('ticket'),
  // tope de cuotas con tarjeta de crédito (1–36)
  MP_MAX_INSTALLMENTS: z.preprocess(v => (v === '' ? undefined : v), z.coerce.number().int().min(1).max(36).default(1)),
  // minutos que el link de pago sigue siendo válido; al vencer, la orden se cancela y libera el stock apartado
  MP_PREFERENCE_EXPIRATION_MINUTES: z.preprocess(v => (v === '' ? undefined : v), z.coerce.number().int().min(5).default(120)),

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

  // SMTP (envío de correos: recuperación de contraseña, etc.)
  // Obligatorias en producción; opcionales en dev/test (ver superRefine abajo).
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASSWORD: z.string().min(1).optional(),
  SMTP_FROM: z.string().min(1).optional(),
  // Buzón que recibe el aviso de cada venta nueva y de reembolsos (por defecto, el de soporte)
  ORDERS_NOTIFY_EMAIL: z.string().email().default('support.coffe.jaguar@gmail.com'),

  // Asistente de chat (POST /api/chat). Proveedor LLM compatible con la API de
  // OpenAI (chat/completions): sirve OpenAI directo o el endpoint compatible de
  // Gemini (?key= en URL, base https://generativelanguage.googleapis.com/v1beta/openai).
  // CHAT_BOT_ENABLED !== 'false' apaga todo el módulo (nada se expone).
  CHAT_BOT_ENABLED: z.union([z.literal('true'), z.literal('false')]).default('true'),
  CHAT_LLM_API_KEY: z.string().min(20).optional(),
  CHAT_LLM_BASE_URL: z.string().url().default('https://api.openai.com/v1'),
  CHAT_LLM_MODEL: z.string().min(1).default('gpt-4o-mini'),
  // techo de tokens por respuesta (control de costo). Tope duro: 800.
  CHAT_LLM_MAX_TOKENS: z.coerce.number().int().min(50).max(800).default(400),
});

const envSchemaWithRules = envSchema.superRefine((data, ctx) => {
  if (data.NODE_ENV === 'production') {
    (['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM'] as const).forEach((key) => {
      if (data[key] == null || data[key] === '') {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: `${key} is required in production` });
      }
    });
    // Si el chat está activo, la API key del LLM es obligatoria en producción.
    // (Se puede arrancar con CHAT_BOT_ENABLED=false para desactivarlo sin quitar la credencial.)
    if (data.CHAT_BOT_ENABLED === 'true' && !data.CHAT_LLM_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['CHAT_LLM_API_KEY'],
        message: 'CHAT_LLM_API_KEY is required in production when the chat bot is enabled (or set CHAT_BOT_ENABLED=false)',
      });
    }
  }
});

const parsed = envSchemaWithRules.safeParse(process.env);

if (!parsed.success) {
  console.error('[ENV ERROR] Invalid or missing environment variables:');
  parsed.error.issues.forEach((issue) => {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  });
  console.error('[ENV ERROR] Please check your .env file or environment configuration.');
  process.exit(1);
}

export const env = parsed.data as z.infer<typeof envSchema>;
