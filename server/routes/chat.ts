import { Router } from 'express';
import * as crypto from 'crypto';
import { body, validationResult } from 'express-validator';
import { chatRateLimiter } from '../middleware/rateLimiter';
import { dbService } from '../db';
import { env } from '../config/env';
import {
  isChatEnabled, getSystemPrompt, sanitizeUserMessage, buildNavigationContext,
  streamCompletion, ChatProviderError, type ChatTurn,
} from '../services/chatbot';

const router = Router();

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  'X-Accel-Buffering': 'no',   // deshabilita buffering de nginx si lo hay
  'Connection': 'keep-alive',
};

/** Hash con sal de secret server-side: permite detectar abuso sin guardar la IP. */
const ipHash = (ip: string) =>
  crypto.createHash('sha256').update(`${ip}::${env.JWT_SECRET}`).digest('hex');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// La validación responde 400 con JSON si el mensaje o la sesión no cumplen
// (el frontend muestra un fallback amable). El límite real de 1000 chars lo
// aplica también sanitizeUserMessage() como segunda capa.
router.post(
  '/',
  chatRateLimiter,
  body('message').isString().trim().isLength({ min: 1, max: 1000 }).withMessage('Mensaje inválido.'),
  body('session_id').matches(UUID_RE).withMessage('Sesión inválida.'),
  // Ruta del sitio donde está el visitante (la manda el widget). Solo se usa si pasa la
  // forma de una ruta; buildNavigationContext() la revalida contra inyección de prompt.
  body('page').optional({ values: 'undefined' }).isString().isLength({ max: 200 }).withMessage('Página inválida.'),
  async (req, res) => {
    // Killswitch: con CHAT_BOT_ENABLED=false el endpoint no existe para el público.
    if (!isChatEnabled()) {
      return res.status(503).json({ error: 'El asistente no está disponible ahora.' });
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Mensaje o sesión inválidos.' });
    }

    const sessionId = req.body.session_id as string;
    const message = sanitizeUserMessage(String(req.body.message));
    if (!message) {
      return res.status(400).json({ error: 'Mensaje vacío.' });
    }

    let system: string;
    let history: Array<{ role: 'user' | 'assistant'; content: string }>;
    try {
      system = await getSystemPrompt();
      history = await dbService.getChatHistory(sessionId);
    } catch (err) {
      // BD abajo: sin contexto el chat no debe responder (no hay catálogo que citar).
      console.error('[CHAT] No se pudo preparar el contexto:', (err as Error).message);
      return res.status(503).json({ error: 'El asistente no está disponible ahora.' });
    }

    // Historial guardado en BD (privado, anónimo) — NUNCA se devuelven al cliente
    // turnos previos: el frontend mantiene su propia copia de la conversación.
    const ip = String(req.ip ?? '');
    await dbService.saveChatMessage({ session_id: sessionId, role: 'user', content: message, ip_hash: ipHash(ip) }).catch(err => {
      console.error('[CHAT] No se pudo guardar el mensaje del usuario:', (err as Error).message);
    });

    const systemTurn: ChatTurn = {
      role: 'system',
      content: system + buildNavigationContext(String(req.body?.page ?? '')),
    };
    const llmMessages: ChatTurn[] = [
      systemTurn,
      ...history,
      { role: 'user', content: message },
    ];

    const abort = new AbortController();
    req.on('close', () => abort.abort());

    res.writeHead(200, SSE_HEADERS);
    res.write(`data: ${JSON.stringify({ start: true })}\n\n`);

    let full = '';
    try {
      for await (const delta of streamCompletion(llmMessages, abort.signal)) {
        full += delta;
        res.write(`data: ${JSON.stringify({ delta })}\n\n`);
      }
      res.write('data: [DONE]\n\n');
      // Registro del turno completo solo en BD (para el historial del usuario),
      // sin logging a consola después de 'full' — no filtraría conversaciones a los logs.
    } catch (err) {
      const providerError = err instanceof ChatProviderError;
      console.error(`[CHAT] ${providerError ? 'Proveedor LLM' : 'Error en streaming'}: ${(err as Error).message}`);
      if (full) {
        res.write(`data: ${JSON.stringify({ error: 'stream', detail: 'partial' })}\n\n`);
      } else {
        res.write(`data: ${JSON.stringify({ error: 'provider' })}\n\n`);
      }
    } finally {
      if (full) {
        await dbService.saveChatMessage({ session_id: sessionId, role: 'assistant', content: full }).catch(err => {
          console.error('[CHAT] No se pudo guardar la respuesta:', (err as Error).message);
        });
      }
      res.end();
    }
  }
);

export default router;
