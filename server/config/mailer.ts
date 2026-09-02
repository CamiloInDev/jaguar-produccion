import nodemailer from 'nodemailer';
import { env } from './env';

/**
 * Transporte SMTP compartido. En dev/test sin SMTP configurado, sendMail
 * hace fallback a loguear el contenido en consola en vez de fallar —
 * así no hace falta una cuenta de correo real para desarrollar localmente.
 */
const transporter = env.SMTP_HOST
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT ?? 587,
      secure: (env.SMTP_PORT ?? 587) === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
    })
  : null;

export async function sendMail(to: string, subject: string, html: string): Promise<void> {
  if (!transporter) {
    console.log(`[MAILER] SMTP no configurado — correo simulado a ${to}: "${subject}"`);
    console.log(html);
    return;
  }
  await transporter.sendMail({ from: env.SMTP_FROM, to, subject, html });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color:#122C9B;">Restablecer tu contraseña — Jaguar Coffee</h2>
      <p>Recibimos una solicitud para restablecer tu contraseña. Si fuiste tú, haz clic en el siguiente enlace (válido por 1 hora):</p>
      <p style="margin: 24px 0;">
        <a href="${resetUrl}" style="background:#122C9B;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
          Restablecer contraseña
        </a>
      </p>
      <p style="color:#666;font-size:12px;">Si no solicitaste esto, puedes ignorar este correo — tu contraseña no cambiará.</p>
    </div>
  `;
  await sendMail(to, 'Restablecer tu contraseña — Jaguar Coffee', html);
}
