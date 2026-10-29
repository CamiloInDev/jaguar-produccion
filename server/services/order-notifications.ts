import { env } from '../config/env';
import { dbService } from '../db';
import { sendMail, emailLayout, emailButton, escapeHtml } from '../config/mailer';
import { Order, OrderStatus } from '../../src/types';

/**
 * Correos de los pedidos: al cliente en cada cambio de estado que le importa y al buzón
 * de la tienda (ORDERS_NOTIFY_EMAIL) cuando entra una venta o se cancela una pagada.
 *
 * Se llama DESPUÉS de que la transición quedó guardada y nunca bloquea ni rompe el flujo
 * del pago: si el SMTP falla, queda en el log y la orden sigue su curso.
 */

export type MotivoTransicion = 'vencido';

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

const PAGADAS: OrderStatus[] = ['pagado', 'enviado', 'entregado'];

const cop = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

function site(): string {
  return env.APP_URL.replace(/\/$/, '');
}

function itemsHtml(order: Order): string {
  const rows = order.items.map(i => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f0e9e2;">${escapeHtml(i.nombre)}<br><span style="color:#8a8a8a;font-size:13px;">${i.cantidad} × ${cop(i.precio_unit)}</span></td>
          <td style="padding:10px 0;border-bottom:1px solid #f0e9e2;text-align:right;white-space:nowrap;">${cop(i.precio_unit * i.cantidad)}</td>
        </tr>`).join('');
  return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;font-size:14px;">
        ${rows}
        <tr>
          <td style="padding:12px 0 0;font-weight:bold;color:#122C9B;">Total</td>
          <td style="padding:12px 0 0;text-align:right;font-weight:bold;color:#122C9B;font-size:16px;">${cop(order.total)}</td>
        </tr>
      </table>`;
}

function itemsText(order: Order): string {
  return [
    ...order.items.map(i => `- ${i.nombre} — ${i.cantidad} × ${cop(i.precio_unit)} = ${cop(i.precio_unit * i.cantidad)}`),
    `Total: ${cop(order.total)}`,
  ].join('\n');
}

function direccionTexto(order: Order): string {
  const d = order.direccion_envio;
  return `${d.direccion}, ${d.ciudad}, ${d.departamento} · Tel. ${d.telefono}`;
}

function direccionHtml(order: Order): string {
  return `<p style="margin:0 0 4px;font-size:13px;color:#8a8a8a;">Dirección de envío</p>
      <p style="margin:0 0 8px;font-size:14px;">${escapeHtml(direccionTexto(order))}</p>`;
}

function refHtml(order: Order): string {
  return `<p style="margin:0 0 4px;font-size:13px;color:#8a8a8a;">Pedido <strong style="color:#122C9B;">${escapeHtml(order.id)}</strong></p>`;
}

/** Correo para el cliente según la transición, o null si esa transición no le avisa nada. */
export function buildCustomerEmail(
  order: Order, previous: OrderStatus, nombre: string | undefined, motivo?: MotivoTransicion
): EmailContent | null {
  const hola = nombre?.trim() ? `Hola, ${nombre.trim()}` : 'Hola';
  const cuenta = `${site()}/mi-cuenta`;
  const tienda = `${site()}/tienda`;
  const firma = `<p style="margin:24px 0 0;">Un abrazo cafetero,<br><strong style="color:#122C9B;">Equipo Jaguar Coffee</strong></p>`;
  const firmaText = '\nEquipo Jaguar Coffee';

  switch (order.estado) {
    case 'pagado': {
      const title = '¡Pedido confirmado!';
      return {
        subject: `¡Pedido confirmado! ${order.id} — Jaguar Coffee`,
        html: emailLayout({
          preheader: `Recibimos tu pago de ${cop(order.total)}. Ya estamos preparando tu café.`,
          title,
          bodyHtml: `
        <p style="margin:0 0 12px;">${escapeHtml(hola)}:</p>
        <p style="margin:0;">Recibimos tu pago y ya estamos preparando tu café. Te escribiremos de nuevo cuando tu pedido salga hacia tu dirección.</p>
        <div style="margin:24px 0 0;">${refHtml(order)}</div>
        ${itemsHtml(order)}
        ${direccionHtml(order)}
        ${emailButton(cuenta, 'Ver mi pedido')}
        ${firma}`,
        }),
        text: `${hola}:\n\nRecibimos tu pago y ya estamos preparando tu café.\n\nPedido ${order.id}\n${itemsText(order)}\n\nEnvío a: ${direccionTexto(order)}\n\nVer tu pedido: ${cuenta}\n${firmaText}`,
      };
    }

    case 'enviado':
      return {
        subject: `Tu pedido ${order.id} va en camino — Jaguar Coffee`,
        html: emailLayout({
          preheader: 'Tu café ya salió y va hacia tu dirección.',
          title: 'Tu pedido va en camino',
          bodyHtml: `
        <p style="margin:0 0 12px;">${escapeHtml(hola)}:</p>
        <p style="margin:0 0 20px;">Tu pedido salió de nuestra planta y va hacia tu dirección. Muy pronto lo tendrás en casa.</p>
        ${refHtml(order)}
        ${direccionHtml(order)}
        ${emailButton(cuenta, 'Ver mi pedido')}
        ${firma}`,
        }),
        text: `${hola}:\n\nTu pedido ${order.id} salió de nuestra planta y va hacia: ${direccionTexto(order)}.\n\nVer tu pedido: ${cuenta}\n${firmaText}`,
      };

    case 'entregado':
      return {
        subject: `Tu pedido ${order.id} fue entregado — Jaguar Coffee`,
        html: emailLayout({
          preheader: 'Que lo disfrutes. Cuéntanos qué te pareció.',
          title: 'Tu pedido fue entregado',
          bodyHtml: `
        <p style="margin:0 0 12px;">${escapeHtml(hola)}:</p>
        <p style="margin:0 0 12px;">Tu pedido <strong>${escapeHtml(order.id)}</strong> fue entregado. Esperamos que disfrutes cada taza.</p>
        <p style="margin:0;">Si algo no llegó como esperabas, responde este correo y lo resolvemos.</p>
        ${emailButton(tienda, 'Volver a la tienda')}
        ${firma}`,
        }),
        text: `${hola}:\n\nTu pedido ${order.id} fue entregado. Esperamos que disfrutes cada taza.\nSi algo no llegó como esperabas, responde este correo y lo resolvemos.\n${firmaText}`,
      };

    case 'cancelado': {
      if (PAGADAS.includes(previous)) {
        return {
          subject: `Tu pedido ${order.id} fue cancelado — Jaguar Coffee`,
          html: emailLayout({
            preheader: `Devolvemos ${cop(order.total)} a tu medio de pago.`,
            title: 'Tu pedido fue cancelado',
            bodyHtml: `
        <p style="margin:0 0 12px;">${escapeHtml(hola)}:</p>
        <p style="margin:0 0 12px;">Cancelamos tu pedido <strong>${escapeHtml(order.id)}</strong>. El valor pagado, <strong>${cop(order.total)}</strong>, se devuelve a tu medio de pago original.</p>
        <p style="margin:0;font-size:13px;color:#555;">Según tu banco, el reembolso puede tardar algunos días hábiles en verse en tu extracto.</p>
        ${emailButton(tienda, 'Volver a la tienda')}
        ${firma}`,
          }),
          text: `${hola}:\n\nCancelamos tu pedido ${order.id}. El valor pagado (${cop(order.total)}) se devuelve a tu medio de pago original. Según tu banco, puede tardar algunos días hábiles en verse.\n${firmaText}`,
        };
      }
      if (previous === 'pendiente' && motivo === 'vencido') {
        const horas = Math.round(env.MP_PREFERENCE_EXPIRATION_MINUTES / 60);
        const plazo = horas >= 1 ? `${horas} hora${horas === 1 ? '' : 's'}` : `${env.MP_PREFERENCE_EXPIRATION_MINUTES} minutos`;
        return {
          subject: `Tu pedido ${order.id} venció sin pago — Jaguar Coffee`,
          html: emailLayout({
            preheader: 'No recibimos el pago. Si aún lo quieres, puedes volver a pedirlo.',
            title: 'Tu pedido venció',
            bodyHtml: `
        <p style="margin:0 0 12px;">${escapeHtml(hola)}:</p>
        <p style="margin:0 0 12px;">El link de pago de tu pedido <strong>${escapeHtml(order.id)}</strong> estuvo activo ${plazo} y no recibimos el pago, así que lo cancelamos. No se hizo ningún cobro.</p>
        <p style="margin:0;">Si aún quieres tu café, puedes volver a pedirlo cuando quieras:</p>
        ${itemsHtml(order)}
        ${emailButton(tienda, 'Volver a la tienda')}
        ${firma}`,
          }),
          text: `${hola}:\n\nEl link de pago de tu pedido ${order.id} venció y no recibimos el pago, así que lo cancelamos. No se hizo ningún cobro.\n\n${itemsText(order)}\n\nPuedes volver a pedirlo en ${tienda}\n${firmaText}`,
        };
      }
      if (previous === 'pendiente') {
        return {
          subject: `Tu pedido ${order.id} fue cancelado — Jaguar Coffee`,
          html: emailLayout({
            preheader: 'No se hizo ningún cobro.',
            title: 'Tu pedido fue cancelado',
            bodyHtml: `
        <p style="margin:0 0 12px;">${escapeHtml(hola)}:</p>
        <p style="margin:0 0 12px;">Tu pedido <strong>${escapeHtml(order.id)}</strong> fue cancelado y no se hizo ningún cobro.</p>
        <p style="margin:0;">Si fue un error o tienes preguntas, responde este correo.</p>
        ${emailButton(tienda, 'Volver a la tienda')}
        ${firma}`,
          }),
          text: `${hola}:\n\nTu pedido ${order.id} fue cancelado y no se hizo ningún cobro.\nSi fue un error o tienes preguntas, responde este correo.\n${firmaText}`,
        };
      }
      return null;
    }

    default:
      return null;
  }
}

/** Aviso interno para la tienda: venta nueva o cancelación de un pedido pagado. */
export function buildStoreEmail(
  order: Order, previous: OrderStatus, cliente: { nombre?: string; apellido?: string; email?: string }
): EmailContent | null {
  const quien = [cliente.nombre, cliente.apellido].filter(Boolean).join(' ') || 'Cliente';
  const panel = `${site()}/admin`;
  const clienteHtml = `<p style="margin:0 0 4px;font-size:13px;color:#8a8a8a;">Cliente</p>
      <p style="margin:0 0 8px;font-size:14px;">${escapeHtml(quien)} · ${escapeHtml(cliente.email ?? '')}</p>`;
  const notas = order.notas?.trim()
    ? `<p style="margin:0 0 4px;font-size:13px;color:#8a8a8a;">Notas del cliente</p><p style="margin:0 0 8px;font-size:14px;">${escapeHtml(order.notas.trim())}</p>`
    : '';

  if (order.estado === 'pagado' && !PAGADAS.includes(previous)) {
    const tarde = previous === 'cancelado'
      ? `<p style="margin:0 0 16px;padding:12px 14px;background:#fff4e5;border-radius:8px;font-size:14px;">⚠️ Este pago llegó después de que el pedido se canceló por vencimiento. Se reactivó como pagado: revisa que haya stock antes de despachar.</p>`
      : '';
    return {
      subject: `Nueva venta ${cop(order.total)} — ${order.id}`,
      html: emailLayout({
        preheader: `${quien} pagó ${cop(order.total)}.`,
        title: 'Nueva venta',
        bodyHtml: `
        ${tarde}
        ${refHtml(order)}
        ${clienteHtml}
        ${itemsHtml(order)}
        ${direccionHtml(order)}
        ${notas}
        ${emailButton(panel, 'Abrir panel de pedidos')}`,
      }),
      text: `Nueva venta ${order.id}\n${previous === 'cancelado' ? 'ATENCIÓN: el pago llegó después de que el pedido venció; revisar stock.\n' : ''}Cliente: ${quien} · ${cliente.email ?? ''}\n\n${itemsText(order)}\n\nEnvío a: ${direccionTexto(order)}${order.notas?.trim() ? `\nNotas: ${order.notas.trim()}` : ''}\n\nPanel: ${panel}`,
    };
  }

  if (order.estado === 'cancelado' && PAGADAS.includes(previous)) {
    return {
      subject: `Pedido pagado cancelado — ${order.id}`,
      html: emailLayout({
        preheader: `${cop(order.total)} · el stock volvió al inventario.`,
        title: 'Pedido pagado cancelado',
        bodyHtml: `
        <p style="margin:0 0 16px;">El pedido estaba <strong>${escapeHtml(previous)}</strong> y pasó a cancelado (reembolso, contracargo o cancelación manual). Sus unidades volvieron al inventario.</p>
        ${refHtml(order)}
        ${clienteHtml}
        ${itemsHtml(order)}
        ${emailButton(panel, 'Abrir panel de pedidos')}`,
      }),
      text: `Pedido pagado cancelado ${order.id} (antes: ${previous}).\nCliente: ${quien} · ${cliente.email ?? ''}\n\n${itemsText(order)}\n\nPanel: ${panel}`,
    };
  }

  return null;
}

async function enviar(order: Order, previous: OrderStatus, motivo?: MotivoTransicion): Promise<void> {
  const user = await dbService.getUserById(order.user_id);
  const alCliente = user?.email ? buildCustomerEmail(order, previous, user.nombre, motivo) : null;
  const aLaTienda = buildStoreEmail(order, previous, { nombre: user?.nombre, apellido: user?.apellido, email: user?.email });

  const envios: Promise<void>[] = [];
  if (alCliente && user?.email) envios.push(sendMail(user.email, alCliente.subject, alCliente.html, alCliente.text));
  if (aLaTienda) envios.push(sendMail(env.ORDERS_NOTIFY_EMAIL, aLaTienda.subject, aLaTienda.html, aLaTienda.text));
  const resultados = await Promise.allSettled(envios);
  for (const r of resultados) {
    if (r.status === 'rejected') console.error(`[MAILER] aviso del pedido ${order.id} falló: ${(r.reason as Error)?.message ?? r.reason}`);
  }
}

/** Dispara los correos de una transición ya guardada. No espera ni lanza errores. */
export function notifyOrderTransition(order: Order, previous: OrderStatus, motivo?: MotivoTransicion): void {
  if (env.NODE_ENV === 'test' || order.estado === previous) return;
  void enviar(order, previous, motivo).catch(err => {
    console.error(`[MAILER] aviso del pedido ${order.id} falló: ${(err as Error)?.message ?? err}`);
  });
}
