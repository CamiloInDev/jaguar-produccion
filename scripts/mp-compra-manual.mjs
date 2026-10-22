// Compra de prueba con login manual del comprador de prueba en Mercado Pago.
// Uso: node scripts/mp-compra-manual.mjs
// 1. Abre Edge en el login de Mercado Pago (el usuario entra a mano).
// 2. Detecta el login, arma comprador+carrito+checkout en la tienda y redirige
//    al link de pago (el usuario paga a mano con la tarjeta de prueba).
// 3. Detecta el retorno a la confirmación y consulta la orden vía API.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'https://jaguarcoffeeco.com';
const OUT = path.join(process.env.TEMP || '.', 'opencode', 'mp-e2e');
fs.mkdirSync(OUT, { recursive: true });

async function shot(name) {
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true }).catch(() => {});
  console.log(`[shot] ${name}`);
}
async function dumpText(name) {
  const t = await page.evaluate(() => document.body.innerText).catch(() => '');
  fs.writeFileSync(path.join(OUT, `${name}.txt`), t);
  console.log(`[${name} texto]`, t.replace(/\n+/g, ' | ').slice(0, 600));
}

const browser = await chromium.launch({
  headless: false,
  channel: 'msedge',
  args: ['--disable-blink-features=AutomationControlled'],
});
const context = await browser.newContext({ locale: 'es-CO', timezoneId: 'America/Bogota' });
const page = await context.newPage();
page.on('pageerror', e => console.log('[pageerror]', e.message.slice(0, 150)));

try {
  // ---------- 1. Login manual en Mercado Pago ----------
  await page.goto('https://www.mercadopago.com.co/', { waitUntil: 'domcontentloaded' });
  try { await page.locator('button:has-text("Aceptar cookies")').first().click({ timeout: 4000 }); } catch { /* sin banner */ }
  await shot('40-mp-login-inicio');
  console.log('=== INICIA SESION EN MERCADO PAGO (ventana abierta) ===');
  let logged = false;
  for (let i = 0; i < 150; i++) {
    const n = await page.locator('input[name="identifier"], input[type="password"]').count().catch(() => 0);
    const eligiendo = await page.locator('text=Elige un método').count().catch(() => 0);
    if (n === 0 && eligiendo === 0 && !/jms|lgz/.test(page.url())) { logged = true; break; }
    await page.waitForTimeout(4000);
  }
  console.log('[MP login]', logged ? 'OK, sesión iniciada' : 'TIMEOUT esperando login');
  if (!logged) throw new Error('no se inició sesión en MP');
  await shot('41-mp-logueado');

  // ---------- 2. Comprador + carrito + checkout en la tienda ----------
  const email = `mp.compra.prueba.${Date.now()}@jaguarcoffeeco.com`;
  const password = 'MpPrueba2026!x';
  const reg = await context.request.post(`${BASE}/api/auth/registro`, {
    data: { email, password, nombre: 'Comprador', apellido: 'Prueba MP', telefono: '3001234567' },
  });
  console.log('[registro tienda]', reg.status());
  if (reg.status() !== 201) throw new Error('registro falló');

  const prodRes = await context.request.get(`${BASE}/api/productos`);
  const body = await prodRes.json();
  const lista = Array.isArray(body) ? body : (body.productos || body.data || []);
  const prod = lista.find(p => (p.stock ?? 0) > 0);
  if (!prod) throw new Error('sin productos con stock');
  console.log('[producto]', prod.id, prod.nombre, 'precio:', prod.precio, 'stock:', prod.stock);

  await page.addInitScript(([p]) => {
    localStorage.setItem('jaguar_cart', JSON.stringify([{ product_id: p.id, cantidad: 1, product: p }]));
  }, [prod]);

  await page.goto(`${BASE}/checkout`, { waitUntil: 'domcontentloaded' });
  try { await page.waitForLoadState('networkidle', { timeout: 8000 }); } catch { /* seguir */ }
  const btnPrivacidad = page.locator('button:has-text("Acepto la política")');
  try { await btnPrivacidad.waitFor({ state: 'visible', timeout: 3000 }); await btnPrivacidad.click(); } catch { /* sin modal */ }
  await page.locator('input[placeholder^="Ej. Calle"]').fill('Calle 10 Sur # 43A - 12 Apt 402');
  await page.locator('input[placeholder^="+57"]').fill('+57 321 456 7890');
  await page.locator('#checkout-view input[type="checkbox"]').check();
  await shot('42-checkout');
  await page.locator('button:has-text("Pagar con Mercado Pago")').click();

  // ---------- 3. Página de pago de MP: el usuario paga a mano ----------
  await page.waitForURL(/mercadopago/i, { timeout: 45000 });
  try { await page.waitForLoadState('networkidle', { timeout: 20000 }); } catch { /* seguir */ }
  await page.waitForTimeout(8000);
  await shot('43-mp-checkout');
  await dumpText('43-mp-checkout');
  console.log('=== PAGA EN LA VENTANA CON LA TARJETA DE PRUEBA (5254 1336 7440 3564 / 123 / 11/30 / APRO) ===');

  let volvio = false;
  for (let i = 0; i < 200; i++) {
    if (/jaguarcoffeeco\.com/.test(page.url())) { volvio = true; break; }
    await page.waitForTimeout(4000);
  }
  console.log('[retorno]', volvio ? 'OK, de vuelta en el sitio' : 'TIMEOUT esperando el pago');
  await shot('44-retorno');
  if (!volvio) throw new Error('no volvió del checkout de MP');
  await dumpText('44-retorno');

  // ---------- 4. Verificar la orden ----------
  await page.waitForTimeout(60000); // dejar que la confirmación haga polling
  const m = page.url().match(/ref=([A-Za-z0-9_-]+)/);
  if (!m) throw new Error('sin ref en la URL de confirmación: ' + page.url());
  const orderId = m[1];
  const ord = await context.request.get(`${BASE}/api/ordenes/${orderId}`);
  const orden = await ord.json().catch(() => ({}));
  console.log('[orden]', orderId, JSON.stringify(orden).slice(0, 600));
  fs.writeFileSync(path.join(OUT, 'orden.json'), JSON.stringify({ orderId, email, password, orden }, null, 2));
  await shot('45-confirmacion');
  console.log('FLUJO COMPLETO — orden guardada en', path.join(OUT, 'orden.json'));
} catch (err) {
  console.error('[ERROR]', err.message);
  await shot('99-error');
  process.exitCode = 1;
  console.log('La ventana se deja abierta 2 minutos para inspección...');
  await page.waitForTimeout(120000).catch(() => {});
} finally {
  await context.close();
  await browser.close();
}
