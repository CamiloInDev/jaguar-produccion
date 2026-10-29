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

/** Datos de marca de los correos (mismos que el footer del sitio). */
const BRAND = {
  name: 'Jaguar Coffee',
  supportEmail: 'support.coffe.jaguar@gmail.com',
  address: 'Cra 4 #12-78, La Candelaria, Bogotá',
  instagram: 'https://www.instagram.com/jaguarcoffeecolombia',
  dark: '#122C9B',
  accent: '#FFA42C',
  bg: '#FFF9F5',
};

/** Si SMTP_FROM es solo una dirección, le pone el nombre de la marca para que el buzón no muestre "noreply". */
function fromHeader(): string | undefined {
  const from = env.SMTP_FROM?.trim();
  if (!from) return undefined;
  return from.includes('<') ? from : `"${BRAND.name}" <${from}>`;
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

/**
 * Plantilla base de todos los correos: tablas y estilos en línea, que es lo único
 * que Gmail/Outlook respetan. `preheader` es el texto que se ve junto al asunto
 * en la bandeja de entrada.
 */
export function emailLayout(opts: { preheader: string; title: string; bodyHtml: string }): string {
  const site = env.APP_URL.replace(/\/$/, '');
  const font = "'Krub', 'Segoe UI', Helvetica, Arial, sans-serif";
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<title>${escapeHtml(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(opts.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #ece4dc;">
      <tr><td align="center" style="background:${BRAND.dark};padding:28px 24px;">
        <a href="${site}" style="text-decoration:none;">
          <img src="${site}/images/logo-blanco.png" width="120" alt="${BRAND.name}" style="display:block;width:120px;height:auto;border:0;color:#ffffff;font-family:${font};font-size:22px;font-weight:bold;">
        </a>
      </td></tr>
      <tr><td style="height:4px;background:${BRAND.accent};line-height:4px;font-size:0;">&nbsp;</td></tr>
      <tr><td style="padding:36px 32px 28px;font-family:${font};color:#2b2b2b;font-size:15px;line-height:1.6;">
        <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:${BRAND.dark};font-family:${font};">${escapeHtml(opts.title)}</h1>
        ${opts.bodyHtml}
      </td></tr>
      <tr><td style="padding:20px 32px 28px;border-top:1px solid #f0e9e2;font-family:${font};font-size:12px;line-height:1.6;color:#7a7a7a;" align="center">
        Café de especialidad colombiano<br>
        ${BRAND.address}<br>
        <a href="${site}" style="color:${BRAND.dark};text-decoration:none;font-weight:bold;">jaguarcoffeeco.com</a>
        &nbsp;·&nbsp;
        <a href="${BRAND.instagram}" style="color:${BRAND.dark};text-decoration:none;font-weight:bold;">Instagram</a><br>
        <span style="color:#a0a0a0;">Este correo se envía desde una dirección que no recibe respuestas. ¿Dudas? Escríbenos a
        <a href="mailto:${BRAND.supportEmail}" style="color:#a0a0a0;">${BRAND.supportEmail}</a>.</span>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

/** Botón principal compatible con clientes de correo (el enlace va también en texto plano debajo). */
export function emailButton(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;"><tr>
  <td style="background:${BRAND.accent};border-radius:999px;">
    <a href="${href}" style="display:inline-block;padding:14px 32px;font-family:'Krub','Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;font-weight:bold;color:${BRAND.dark};text-decoration:none;border-radius:999px;">${escapeHtml(label)}</a>
  </td></tr></table>`;
}

export async function sendMail(to: string, subject: string, html: string, text?: string): Promise<void> {
  if (!transporter) {
    console.log(`[MAILER] SMTP no configurado — correo simulado a ${to}: "${subject}"`);
    console.log(text ?? html);
    return;
  }
  await transporter.sendMail({ from: fromHeader(), replyTo: BRAND.supportEmail, to, subject, html, text });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string, nombre?: string): Promise<void> {
  const saludo = nombre?.trim() ? `Hola, ${escapeHtml(nombre.trim())}:` : 'Hola:';
  const html = emailLayout({
    preheader: 'Usa este enlace para crear una contraseña nueva. Vence en 1 hora.',
    title: 'Restablece tu contraseña',
    bodyHtml: `
        <p style="margin:0 0 12px;">${saludo}</p>
        <p style="margin:0;">Recibimos una solicitud para cambiar la contraseña de tu cuenta en ${BRAND.name}. Haz clic en el botón para crear una nueva:</p>
        ${emailButton(resetUrl, 'Crear contraseña nueva')}
        <p style="margin:0 0 12px;font-size:13px;color:#555;">El enlace vence en <strong>1 hora</strong> y solo se puede usar una vez.</p>
        <p style="margin:0 0 20px;font-size:13px;color:#555;">Si no pediste este cambio, ignora este correo: tu contraseña sigue igual y nadie puede cambiarla sin este enlace.</p>
        <p style="margin:0;font-size:12px;color:#8a8a8a;word-break:break-all;">¿El botón no funciona? Copia este enlace en tu navegador:<br>
        <a href="${resetUrl}" style="color:${BRAND.dark};">${resetUrl}</a></p>
        <p style="margin:24px 0 0;">Un abrazo cafetero,<br><strong style="color:${BRAND.dark};">Equipo ${BRAND.name}</strong></p>`,
  });
  const text = [
    nombre?.trim() ? `Hola, ${nombre.trim()}:` : 'Hola:',
    '',
    `Recibimos una solicitud para cambiar la contraseña de tu cuenta en ${BRAND.name}.`,
    'Crea una nueva desde este enlace (vence en 1 hora y solo se puede usar una vez):',
    resetUrl,
    '',
    'Si no pediste este cambio, ignora este correo: tu contraseña sigue igual.',
    '',
    `Equipo ${BRAND.name}`,
    `¿Dudas? ${BRAND.supportEmail}`,
  ].join('\n');
  await sendMail(to, `Restablece tu contraseña de ${BRAND.name}`, html, text);
}
