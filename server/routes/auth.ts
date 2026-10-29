import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { dbService, hashPassword, comparePassword } from '../db';
import { env } from '../config/env';
import { sendPasswordResetEmail } from '../config/mailer';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimiter';
import { internalError } from '../middleware/errorHandler';
import {
  registerValidation, loginValidation, profileUpdateValidation,
  requestPasswordResetValidation, resetPasswordValidation, changePasswordValidation,
  handleValidationErrors,
} from '../middleware/validate';

/** Rutas de autenticación: registro, login, logout, perfil, recuperación */
const router = Router();

/**
 * Hash bcrypt fijo (sin contraseña real detrás) usado únicamente para que
 * `comparePassword` tarde lo mismo cuando el email NO existe que cuando existe
 * pero la contraseña es incorrecta. Sin esto, un atacante podría enumerar
 * emails registrados midiendo el tiempo de respuesta (el compare de bcrypt
 * solo se ejecutaba si el usuario existía).
 */
const TIMING_SAFE_DUMMY_HASH = '$2b$12$9AeI1LvPvLNns1ctKyfRXOv9BvKV4bTm7xUfjHBSwR8//h75rvWZW';

const JWT_OPTIONS = {
  expiresIn: 604800, // 7 días en segundos
  issuer: 'cafe-jaguar',
  audience: env.APP_URL,
};

const COOKIE_OPTIONS: import('express').CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
};

/** Emite la cookie de sesión. `tv` ata el token a la versión de sesión vigente del usuario. */
function issueSession(res: import('express').Response, user: { id: string; email: string; rol: string }, tokenVersion: number): void {
  const token = jwt.sign({ id: user.id, email: user.email, rol: user.rol, tv: tokenVersion }, env.JWT_SECRET, JWT_OPTIONS);
  res.cookie('token', token, COOKIE_OPTIONS);
}

router.post('/registro', authRateLimiter, registerValidation, handleValidationErrors, async (req, res) => {
  try {
    const { email, password, nombre, apellido, telefono } = req.body;

    const existingUser = await dbService.getUserByEmail(email);
    if (existingUser) {
      // No revelar si el email existe — misma respuesta genérica
      return res.status(201).json({ success: true, message: 'Registro exitoso. Puede iniciar sesión.' });
    }

    const passHash = hashPassword(password);
    const user = await dbService.createUser({
      email,
      password_hash: passHash,
      nombre,
      apellido,
      telefono,
      rol: 'cliente',
    });

    issueSession(res, user, 0);

    return res.status(201).json({ user });
  } catch (err: any) {
    return internalError(res, err);
  }
});

router.post('/login', authRateLimiter, loginValidation, handleValidationErrors, async (req, res) => {
  try {
    const { email, password } = req.body;

    const lockStatus = await dbService.checkLoginAttempt(email);
    if (lockStatus.blocked) {
      console.log(`[SECURITY] Blocked login attempt for ${email}`);
      return res.status(429).json({
        error: `Demasiados intentos fallidos. Cuenta bloqueada por ${lockStatus.lockoutRemaining} minutos.`,
      });
    }

    const user = await dbService.getUserByEmail(email);
    // Siempre se ejecuta comparePassword (contra un hash real o el dummy) para
    // que el tiempo de respuesta no revele si el email existe o no.
    const passwordOk = comparePassword(password, user ? user.password_hash : TIMING_SAFE_DUMMY_HASH);
    if (!user || !passwordOk) {
      const remaining = await dbService.recordFailedLogin(email);
      console.log(`[SECURITY] Failed login for ${email}`);
      return res.status(400).json({
        error: 'Credenciales inválidas. Verifique sus datos.',
        remainingAttempts: remaining,
      });
    }

    await dbService.clearLoginAttempts(email);
    console.log(`[SECURITY] Successful login for ${email}`);

    const authUser = await dbService.getAuthUser(user.id);
    issueSession(res, user, authUser?.token_version ?? 0);

    const { password_hash, ...safeUser } = user;
    return res.json({ user: safeUser });
  } catch (err: any) {
    return internalError(res, err);
  }
});

router.post('/logout', async (req, res) => {
  // No basta con clearCookie: si la cookie fue copiada/robada (XSS, equipo compartido),
  // seguiría siendo válida hasta el exp del JWT (7 días). Se revoca subiendo
  // token_version, que invalida todas las sesiones emitidas antes. Token ausente o
  // vencido: no hay nada que revocar, y logout responde 200 igual (idempotente).
  const token = req.cookies?.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET, { issuer: 'cafe-jaguar', audience: env.APP_URL }) as { id?: string };
      if (decoded?.id) {
        await dbService.revokeUserSessions(String(decoded.id));
      }
    } catch { /* sesión inválida o expirada */ }
  }
  res.clearCookie('token');
  return res.json({ success: true, message: 'Sesión cerrada exitosamente.' });
});

// Sin cookie de sesión no es un error: el frontend consulta /me en cada carga para saber si hay
// usuario, y un 401 ensuciaba la consola de todos los visitantes. Con cookie inválida o
// revocada sigue respondiendo 401/403 vía authenticateToken.
router.get('/me', (req, res, next) => {
  if (!req.cookies?.token) return res.json({ user: null });
  next();
}, authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const safeUser = await dbService.getUserById(req.user!.id);
    if (!safeUser) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    return res.json({ user: safeUser });
  } catch (err: any) {
    return internalError(res, err);
  }
});

router.put('/perfil', authenticateToken, profileUpdateValidation, handleValidationErrors, async (req: AuthenticatedRequest, res) => {
  try {
    const { nombre, apellido, telefono } = req.body;
    const updated = await dbService.updateUserProfile(req.user!.id, { nombre, apellido, telefono });
    if (!updated) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    return res.json({ user: updated });
  } catch (err: any) {
    return internalError(res, err);
  }
});

router.post('/recuperar', authRateLimiter, requestPasswordResetValidation, handleValidationErrors, async (req, res) => {
  const { email } = req.body;
  const GENERIC_MESSAGE = 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.';

  try {
    const user = await dbService.getUserByEmail(email);
    if (user) {
      // Token y correo se generan/envían SIN esperarlos en la respuesta: el endpoint
      // siempre responde el mismo 200 genérico de inmediato, exista o no el correo,
      // y una falla de SMTP ya no rompe la recuperación (500) ni delata cuentas
      // registradas por tiempo de respuesta. El fallo queda en log para diagnóstico.
      const target = user;
      void (async () => {
        const rawToken = await dbService.createPasswordResetToken(target.id);
        const resetUrl = `${env.APP_URL}/auth/restablecer?token=${rawToken}`;
        await sendPasswordResetEmail(target.email, resetUrl, target.nombre);
      })().catch((err) => {
        console.error(`[MAILER] Correo de recuperación falló: ${(err as Error).message}`);
      });
    }
  } catch (err) {
    // BD caída u otro error interno: mismo 200 genérico (no revela estado ni cuentas).
    console.error(`[AUTH] /recuperar: ${(err as Error).message}`);
  }

  return res.json({ success: true, message: GENERIC_MESSAGE });
});

router.post('/restablecer', authRateLimiter, resetPasswordValidation, handleValidationErrors, async (req, res) => {
  try {
    const { token, password } = req.body;

    const userId = await dbService.getValidPasswordResetUserId(token);
    if (!userId) {
      return res.status(400).json({ error: 'El enlace de recuperación es inválido o expiró. Solicita uno nuevo.' });
    }

    await dbService.updateUserPassword(userId, hashPassword(password));
    await dbService.consumePasswordResetToken(token);

    const user = await dbService.getUserById(userId);
    if (user) {
      await dbService.clearLoginAttempts(user.email);
    }

    return res.json({ success: true, message: 'Contraseña actualizada. Ya puedes iniciar sesión.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'No fue posible restablecer la contraseña. Intenta de nuevo.' });
  }
});

router.put('/password', authenticateToken, changePasswordValidation, handleValidationErrors, async (req: AuthenticatedRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await dbService.getUserByEmail(req.user!.email);
    if (!user || !comparePassword(currentPassword, user.password_hash)) {
      return res.status(400).json({ error: 'La contraseña actual no es correcta.' });
    }

    // Sube token_version: se cierran las sesiones en otros dispositivos, y esta se re-emite
    // con la versión nueva para no sacar al usuario que acaba de cambiarla.
    const tokenVersion = await dbService.updateUserPassword(user.id, hashPassword(newPassword));
    issueSession(res, user, tokenVersion);
    return res.json({ success: true, message: 'Contraseña actualizada. Se cerró la sesión en tus otros dispositivos.' });
  } catch (err: any) {
    return internalError(res, err);
  }
});

export default router;
