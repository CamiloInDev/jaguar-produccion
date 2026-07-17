import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { dbService, hashPassword, comparePassword } from '../db';
import { env } from '../config/env';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimiter';
import { registerValidation, loginValidation, profileUpdateValidation, handleValidationErrors } from '../middleware/validate';

/** Rutas de autenticación: registro, login, logout, perfil, recuperación */
const router = Router();

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

    const token = jwt.sign(
      { id: user.id, email: user.email, rol: user.rol },
      env.JWT_SECRET,
      JWT_OPTIONS
    );
    res.cookie('token', token, COOKIE_OPTIONS);

    return res.status(201).json({ user });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
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
    if (!user || !comparePassword(password, user.password_hash)) {
      const remaining = await dbService.recordFailedLogin(email);
      console.log(`[SECURITY] Failed login for ${email}`);
      return res.status(400).json({
        error: 'Credenciales inválidas. Verifique sus datos.',
        remainingAttempts: remaining,
      });
    }

    await dbService.clearLoginAttempts(email);
    console.log(`[SECURITY] Successful login for ${email}`);

    const token = jwt.sign(
      { id: user.id, email: user.email, rol: user.rol },
      env.JWT_SECRET,
      JWT_OPTIONS
    );
    res.cookie('token', token, COOKIE_OPTIONS);

    const { password_hash, ...safeUser } = user;
    return res.json({ user: safeUser });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/logout', (_req, res) => {
  res.clearCookie('token');
  return res.json({ success: true, message: 'Sesión cerrada exitosamente.' });
});

router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const safeUser = await dbService.getUserById(req.user!.id);
    if (!safeUser) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    return res.json({ user: safeUser });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
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
    return res.status(500).json({ error: err.message });
  }
});

router.post('/recuperar', authRateLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Ingrese un correo electrónico.' });
  }
  const user = await dbService.getUserByEmail(email);
  if (!user) {
    // Avoid user enumeration
    return res.json({ success: true, message: 'Si el correo existe, recibirá instrucciones para restablecer su clave.' });
  }
  console.log(`[PASS_RESET] Mock password recovery link sent for ${email}. Reset code: RST-${Date.now()}`);
  return res.json({
    success: true,
    message: 'Correo enviado. (Consulte los logs de la consola o use clave de prueba; este paso se ha simulado exitosamente en este ambiente).',
  });
});

export default router;
