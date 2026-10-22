// Sonda de la página de pago de Mercado Pago: navega al link guardado por la
// fase 1 y lista todos los elementos interactivos (inputs, selects, botones,
// iframes, dentro y fuera de frames) en texto para automatizar el pago.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.join(process.env.TEMP || '.', 'opencode', 'mp-e2e');
const estado = JSON.parse(fs.readFileSync(path.join(OUT, 'mp-checkout.json'), 'utf8'));

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ locale: 'es-CO', timezoneId: 'America/Bogota' });
const page = await context.newPage();
try {
  await page.goto(estado.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  try { await page.waitForLoadState('networkidle', { timeout: 20000 }); } catch { /* seguir */ }
  await page.waitForTimeout(6000);
  console.log('[url]', page.url());
  console.log('[title]', await page.title());

  const dump = [];
  const describir = async (p, marco) => {
    const info = await p.evaluate(() => {
      const out = [];
      const vis = el => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
      document.querySelectorAll('input, select, button, a[href], [role="button"]').forEach(el => {
        if (!vis(el)) return;
        out.push({
          tag: el.tagName.toLowerCase(),
          type: el.getAttribute('type') || '',
          id: el.id || '',
          name: el.getAttribute('name') || '',
          placeholder: el.getAttribute('placeholder') || '',
          aria: el.getAttribute('aria-label') || '',
          texto: (el.innerText || el.value || '').trim().slice(0, 60),
        });
      });
      return out;
    });
    for (const e of info) dump.push({ marco, ...e });
    const iframes = p.frames().filter(f => f !== p.mainFrame());
    for (const f of iframes) {
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
        for (const e of fi) dump.push({ marco: 'iframe:' + f.url().slice(0, 60), ...e });
      } catch { /* iframe cruzado */ }
    }
  };
  await describir(page, 'main');
  await page.screenshot({ path: path.join(OUT, '10-mp-sonda.png'), fullPage: true });
  const texto = (await page.evaluate(() => document.body.innerText)).slice(0, 2500);
  fs.writeFileSync(path.join(OUT, '10-mp-sonda.json'), JSON.stringify(dump, null, 2));
  fs.writeFileSync(path.join(OUT, '10-mp-sonda.txt'), texto);
  console.log('[texto]', texto.replace(/\n+/g, ' | ').slice(0, 1200));
  console.log('[elementos]', dump.length, '— detalle en 10-mp-sonda.json');
} catch (err) {
  console.error('[ERROR]', err.message);
  process.exitCode = 1;
} finally {
  await context.close();
  await browser.close();
}
