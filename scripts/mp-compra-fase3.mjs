// Compra de prueba de punta a punta contra producción con credenciales de
// prueba de Mercado Pago. Uso:
//   node scripts/mp-compra-prueba.mjs 3 --user TESTUSER... --pass XXX --code 123456
// Fase 3: inicia sesión en Mercado Pago como comprador de prueba, registra
// comprador en la tienda, arma el carrito, paga con la tarjeta de prueba y
// verifica el retorno a la página de confirmación.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'https://jaguarcoffeeco.com';
const OUT = path.join(process.env.TEMP || '.', 'opencode', 'mp-e2e');
fs.mkdirSync(OUT, { recursive: true });

const args = process.argv.slice(2);
const getArg = k => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : null; };
const MP_USER = getArg('user');
const MP_PASS = getArg('pass');
const MP_CODE = getArg('code');
const CARD = { number: '5254133674403564', cvv: '123', month: '11', year: '2030', holder: 'APRO' };

if (!MP_USER || !MP_PASS) { console.error('faltan --user/--pass'); process.exit(1); }

const browser = await chromium.launch({
  headless: false,
  channel: 'msedge',
  args: ['--disable-blink-features=AutomationControlled', '--disable-background-networking'],
});
const context = await browser.newContext({
  locale: 'es-CO', timezoneId: 'America/Bogota',
  recordVideo: { dir: OUT },
});
const page = await context.newPage();
page.on('console', m => console.log('[browser]', m.type(), m.text().slice(0, 200)));
page.on('pageerror', e => console.log('[pageerror]', e.message.slice(0, 200)));

async function shot(name) {
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true }).catch(() => {});
  console.log(`[shot] ${name}`);
}
async function dump(name) {
  try {
    const dump = [];
    for (const f of page.frames()) {
      const marco = f === page.mainFrame() ? 'main' : 'iframe:' + f.url().slice(0, 80);
      const info = await f.evaluate(() => {
        const out = [];
        const vis = el => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
        document.querySelectorAll('input, select, button, [role="button"], a').forEach(el => {
          if (!vis(el)) return;
          out.push({
            tag: el.tagName.toLowerCase(), type: el.getAttribute('type') || '',
            id: el.id || '', name: el.getAttribute('name') || '',
            placeholder: el.getAttribute('placeholder') || '',
            aria: el.getAttribute('aria-label') || '',
            texto: (el.innerText || el.value || '').trim().slice(0, 50),
          });
        });
        return out;
      }).catch(() => []);
      for (const e of info) dump.push({ marco, ...e });
    }
    fs.writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify(dump, null, 2));
    fs.writeFileSync(path.join(OUT, `${name}.txt`),
      await page.evaluate(() => document.body.innerText).catch(() => ''));
    dump.forEach(e => console.log(JSON.stringify(e)));
  } catch { /* seguir */ }
}

try {
  // ---------- 1. Iniciar sesión en Mercado Pago como comprador de prueba ----------
  await page.goto('https://www.mercadopago.com.co/', { waitUntil: 'domcontentloaded' });
  try { await page.waitForLoadState('networkidle', { timeout: 10000 }); } catch { /* seguir */ }
  await shot('20-mp-home');
  // Enlace "Ingresar" del header.
  const ingresa = page.locator('a:has-text("Ingresa"), a:has-text("Iniciar sesión"), [data-testid*="login"]').first();
  try { await ingresa.click({ timeout: 10000 }); } catch { await page.goto('https://www.mercadopago.com.co/login', { waitUntil: 'domcontentloaded' }); }
  await page.waitForLoadState('domcontentloaded');
  try { await page.waitForLoadState('networkidle', { timeout: 10000 }); } catch { /* seguir */ }
  await shot('21-mp-login');
  await dump('21-mp-login');

  // Formulario de usuario (MP usa input[name="identifier"]).
  try { await page.locator('button:has-text("Aceptar cookies")').first().click({ timeout: 4000 }); } catch { /* sin banner */ }
  const userInput = page.locator('input[name="identifier"], input[type="email"], input[type="text"]').first();
  await userInput.waitFor({ state: 'visible', timeout: 20000 });
  await userInput.fill(MP_USER);
  await page.locator('button[type="submit"]:has-text("Continuar")').first().click();
  await page.waitForTimeout(4000);
  await shot('22-mp-login-usuario');

  // Pantalla "Elige un método de verificación": elegir Contraseña (los botones
  // de las opciones no exponen innerText, se busca por textContent).
  try {
    await page.waitForSelector('text=Elige un método', { timeout: 8000 });
    await page.evaluate(() => {
      const els = [...document.querySelectorAll('button, [role="button"], a, div')];
      const el = els.find(e => (e.textContent || '').trim().startsWith('Contraseña') && (e.textContent || '').trim().length < 40);
      if (el) el.click();
    });
    await page.waitForTimeout(4000);
    await shot('22b-mp-metodo-contrasena');
  } catch { /* no pidió elegir método */ }

  // Formulario de contraseña.
  const passInput = page.locator('input[type="password"]').first();
  await passInput.waitFor({ state: 'visible', timeout: 20000 });
  await passInput.fill(MP_PASS);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(5000);
  await shot('23-mp-login-password');
  await dump('23-mp-login-password');

  // Posible verificación por email (código de 6 dígitos) en un input.
  const codeInput = page.locator('input[autocomplete="one-time-code"], input[name*="code"], input[inputmode="numeric"]').first();
  try {
    await codeInput.waitFor({ state: 'visible', timeout: 8000 });
    if (MP_CODE) {
      await codeInput.fill(MP_CODE);
      await page.locator('button[type="submit"], button:has-text("Continuar")').first().click().catch(() => {});
      await page.waitForTimeout(5000);
      await shot('24-mp-login-codigo');
    }
  } catch { /* no pidió código */ }

  console.log('[MP sesión] url tras login:', page.url());

  // ---------- 2. Comprador en la tienda ----------
  const email = `mp.compra.prueba.${Date.now()}@jaguarcoffeeco.com`;
  const password = 'MpPrueba2026!x';
  const reg = await context.request.post(`${BASE}/api/auth/registro`, {
    data: { email, password, nombre: 'Comprador', apellido: 'Prueba MP', telefono: '3001234567' },
  });
  console.log('[registro]', reg.status());
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
  await shot('25-checkout');
  await page.locator('input[placeholder^="Ej. Calle"]').fill('Calle 10 Sur # 43A - 12 Apt 402');
  await page.locator('input[placeholder^="+57"]').fill('+57 321 456 7890');
  await page.locator('#checkout-view input[type="checkbox"]').check();
  await page.locator('button:has-text("Pagar con Mercado Pago")').click();

  // ---------- 3. Página de pago de Mercado Pago ----------
  await page.waitForURL(/mercadopago/i, { timeout: 45000 });
  try { await page.waitForLoadState('networkidle', { timeout: 20000 }); } catch { /* seguir */ }
  await page.waitForTimeout(8000);
  await shot('26-mp-checkout');
  await dump('26-mp-checkout');
  fs.writeFileSync(path.join(OUT, 'mp-checkout.json'), JSON.stringify({ email, password, url: page.url(), ts: Date.now() }, null, 2));

  // ---------- 4. Pagar con la tarjeta de prueba (heurístico) ----------
  // 4a. Elegir "Tarjeta de crédito" si hay lista de medios de pago.
  try {
    const tc = page.locator('text=/tarjeta de cr/i').first();
    await tc.waitFor({ state: 'visible', timeout: 8000 });
    await tc.click();
    await page.waitForTimeout(3000);
    await shot('27-mp-tarjeta');
  } catch { console.log('[MP] ya en formulario de tarjeta o selector distinto'); }

  // 4b. Número de tarjeta.
  const numInput = page.locator('input[name*="card_number"], input[id*="card_number"], input[placeholder*="número de tarjeta"], input[inputmode="numeric"][autocomplete="cc-number"]').first();
  await numInput.waitFor({ state: 'visible', timeout: 15000 });
  await numInput.fill(CARD.number);
  await shot('28-mp-numero');

  // 4c. Nombre del titular.
  try {
    const nameInput = page.locator('input[name*="cardholder"], input[name*="holder"], input[autocomplete="cc-name"], input[placeholder*="nombre"]').first();
    if (await nameInput.count()) await nameInput.fill(CARD.holder);
  } catch { /* opcional */ }

  // 4d. Vencimiento (selects mes/año o input MM/AA).
  try {
    const expInput = page.locator('input[autocomplete="cc-exp"], input[placeholder*="vencimiento"], input[placeholder*="MM"]').first();
    if (await expInput.count()) { await expInput.fill('11/30'); }
    else {
      const mes = page.locator('select[name*="month"], select[id*="month"]').first();
      const anio = page.locator('select[name*="year"], select[id*="year"]').first();
      if (await mes.count()) await mes.selectOption(CARD.month).catch(() => mes.selectOption({ label: '11' }).catch(() => {}));
      if (await anio.count()) await anio.selectOption(CARD.year).catch(() => anio.selectOption({ label: '2030' }).catch(() => {}));
    }
  } catch { /* buscar en dump si falla */ }

  // 4e. CVV.
  try {
    const cvv = page.locator('input[name*="security"], input[autocomplete="cc-csc"], input[id*="cvv"], input[placeholder*="CVV"], input[placeholder*="seguridad"]').first();
    if (await cvv.count()) await cvv.fill(CARD.cvv);
  } catch { /* buscar en dump si falla */ }

  await page.keyboard.press('Tab');
  await shot('29-mp-formulario');
  await dump('29-mp-formulario');

  // 4f. Enviar ("Pagar"/"Continuar").
  const pagar = page.locator('button:has-text("Pagar"), button:has-text("Continuar"), button[type="submit"]').last();
  await pagar.click({ timeout: 10000 });
  await page.waitForTimeout(8000);
  await shot('30-mp-resultado');
  console.log('[MP resultado url]', page.url());
  console.log('FASE 3 ejecutada — artifacts en', OUT);
} catch (err) {
  console.error('[ERROR]', err.message);
  await shot('99-error');
  await dump('99-error');
  process.exitCode = 1;
} finally {
  await context.close();
  await browser.close();
}
