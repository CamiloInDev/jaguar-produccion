// Compra de prueba de punta a punta contra producción con credenciales de
// prueba de Mercado Pago. Uso: node scripts/mp-compra-prueba.mjs [fase]
//   fase 1 (default): registra comprador, arma carrito, llena checkout y
//                     llega hasta la página de pago de Mercado Pago.
//   fase 2: completa el pago con la tarjeta de prueba (5254...APRO) — se
//           alimenta de mp-checkout.json que deja la fase 1.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'https://jaguarcoffeeco.com';
const OUT = path.join(process.env.TEMP || '.', 'opencode', 'mp-e2e');
fs.mkdirSync(OUT, { recursive: true });

const CARD = { number: '5254 1336 7440 3564', cvv: '123', exp: '11/30', holder: 'APRO' };
const fase = process.argv[2] || '1';
const estadoPath = path.join(OUT, 'mp-checkout.json');

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
  console.log(`[shot] ${name}`);
}

async function acceptPrivacy(page) {
  const btn = page.locator('button:has-text("Acepto la política")');
  try { await btn.waitFor({ state: 'visible', timeout: 3000 }); await btn.click(); } catch { /* no modal */ }
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  locale: 'es-CO', timezoneId: 'America/Bogota',
  recordVideo: { dir: OUT },
});
const page = await context.newPage();
page.on('console', m => console.log('[browser]', m.type(), m.text()));
page.on('pageerror', e => console.log('[pageerror]', e.message));

try {
  if (fase === '1') {
    // 1. Registrar comprador de prueba (crea la sesión en el contexto).
    const email = `mp.compra.prueba.${Date.now()}@jaguarcoffeeco.com`;
    const password = 'MpPrueba2026!x';
    const reg = await context.request.post(`${BASE}/api/auth/registro`, {
      data: { email, password, nombre: 'Comprador', apellido: 'Prueba MP', telefono: '3001234567' },
    });
    console.log('[registro]', reg.status(), (await reg.text()).slice(0, 200));
    if (reg.status() !== 201) throw new Error('registro falló');
    const me = await context.request.get(`${BASE}/api/auth/me`);
    console.log('[me]', me.status(), (await me.text()).slice(0, 120));

    // 2. Producto real con stock.
    const prodRes = await context.request.get(`${BASE}/api/productos`);
    const body = await prodRes.json();
    const lista = Array.isArray(body) ? body : (body.productos || body.data || []);
    const prod = lista.find(p => (p.stock ?? 0) > 0);
    if (!prod) throw new Error('sin productos con stock');
    console.log('[producto]', prod.id, prod.nombre, 'precio:', prod.precio, 'stock:', prod.stock);
    fs.writeFileSync(path.join(OUT, 'producto.json'), JSON.stringify(prod, null, 2));

    // 3. Carrito.
    await page.addInitScript(([p]) => {
      localStorage.setItem('jaguar_cart', JSON.stringify([{ product_id: p.id, cantidad: 1, product: p }]));
    }, [prod]);

    // 4. Checkout.
    await page.goto(`${BASE}/checkout`, { waitUntil: 'domcontentloaded' });
    try { await page.waitForLoadState('networkidle', { timeout: 8000 }); } catch { /* seguir */ }
    await acceptPrivacy(page);
    await shot(page, '01-checkout');
    await page.locator('input[placeholder^="Ej. Calle"]').fill('Calle 10 Sur # 43A - 12 Apt 402');
    await page.locator('input[placeholder^="+57"]').fill('+57 321 456 7890');
    await page.locator('#checkout-view input[type="checkbox"]').check();
    await shot(page, '02-checkout-lleno');
    await page.locator('button:has-text("Pagar con Mercado Pago")').click();

    // 5. Redirección a Mercado Pago.
    await page.waitForURL(/mercadopago/i, { timeout: 45000 });
    await page.waitForLoadState('domcontentloaded');
    try { await page.waitForLoadState('networkidle', { timeout: 15000 }); } catch { /* seguir */ }
    await page.waitForTimeout(8000);
    await shot(page, '03-mp-llegada');
    fs.writeFileSync(path.join(OUT, '03-mp.html'), await page.content());

    // 6. Sonda: listar campos/botones interactivos (dentro y fuera de iframes).
    const dump = [];
    const describir = async (p, marco) => {
      const info = await p.evaluate(() => {
        const out = [];
        const vis = el => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
        document.querySelectorAll('input, select, button, [role="button"]').forEach(el => {
          if (!vis(el)) return;
          out.push({
            tag: el.tagName.toLowerCase(), type: el.getAttribute('type') || '',
            id: el.id || '', name: el.getAttribute('name') || '',
            placeholder: el.getAttribute('placeholder') || '',
            aria: el.getAttribute('aria-label') || '',
            texto: (el.innerText || el.value || '').trim().slice(0, 60),
          });
        });
        return out;
      });
      for (const e of info) dump.push({ marco, ...e });
      for (const f of p.frames().filter(f => f !== p.mainFrame())) {
        try {
          const fi = await f.evaluate(() => {
            const out = [];
            document.querySelectorAll('input, select, button, [role="button"]').forEach(el => {
              out.push({
                tag: el.tagName.toLowerCase(), type: el.getAttribute('type') || '',
                id: el.id || '', name: el.getAttribute('name') || '',
                placeholder: el.getAttribute('placeholder') || '',
                aria: el.getAttribute('aria-label') || '',
                texto: (el.innerText || el.value || '').trim().slice(0, 60),
              });
            });
            return out;
          });
          for (const e of fi) dump.push({ marco: 'iframe:' + f.url().slice(0, 80), ...e });
        } catch { /* iframe cruzado */ }
      }
    };
    await describir(page, 'main');
    fs.writeFileSync(path.join(OUT, '10-mp-sonda.json'), JSON.stringify(dump, null, 2));
    fs.writeFileSync(path.join(OUT, '10-mp-sonda.txt'),
      (await page.evaluate(() => document.body.innerText)).slice(0, 3000));
    console.log('[MP url]', page.url());
    console.log('[elementos]', dump.length);
    dump.forEach(e => console.log(JSON.stringify(e)));
    fs.writeFileSync(estadoPath, JSON.stringify({ email, password, orderId: null, url: page.url(), ts: Date.now() }, null, 2));
    console.log('FASE 1 OK — artifacts en', OUT);
  } else if (fase === '2') {
    const estado = JSON.parse(fs.readFileSync(estadoPath, 'utf8'));
    // Reentrar por la URL del checkout guardada y pagar con la tarjeta de prueba.
    await page.goto(estado.url, { waitUntil: 'domcontentloaded' });
    try { await page.waitForLoadState('networkidle', { timeout: 15000 }); } catch { /* seguir */ }
    await shot(page, '10-mp-fase2');
    // Los selectores se adaptan según el HTML de la fase 1 (03-mp.html).
    console.log('[fase2] url:', page.url());
    fs.writeFileSync(path.join(OUT, '10-mp-fase2.html'), await page.content());
  }
} catch (err) {
  console.error('[ERROR]', err.message);
  try { await shot(page, '99-error'); fs.writeFileSync(path.join(OUT, '99-error.html'), await page.content()); } catch { /* ignorar */ }
  process.exitCode = 1;
} finally {
  await context.close();
  await browser.close();
}
