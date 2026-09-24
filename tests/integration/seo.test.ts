import { describe, it, expect, beforeAll, afterAll } from 'vitest';

process.env.NODE_ENV = 'test';

// SEO inyectado por el servidor (server/seo.ts): lo que ven Google y los previews de
// WhatsApp/Facebook en el HTML inicial, sin ejecutar JavaScript.

const APP = 'https://jaguarcoffeeco.com';
let buildSeo: typeof import('../../server/seo').buildSeo;
let sitemapUrls: typeof import('../../server/seo').sitemapUrls;
let clearSeoCache: typeof import('../../server/seo').clearSeoCache;
let pool: any;

function jsonLd(head: string): any[] {
  return [...head.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]));
}

beforeAll(async () => {
  const helpers = await import('../helpers');
  await helpers.createTestDb();
  ({ buildSeo, sitemapUrls, clearSeoCache } = await import('../../server/seo'));
  pool = (await import('../../server/config/db-pool')).pool;
});

afterAll(async () => {
  const helpers = await import('../helpers');
  await helpers.restoreRealDb();
});

describe('buildSeo', () => {
  it('home: título, canonical absoluto, OG por defecto y OnlineStore + WebSite', async () => {
    const seo = await buildSeo(APP, '/');
    expect(seo.status).toBe(200);
    expect(seo.head).toContain('<link rel="canonical" href="https://jaguarcoffeeco.com/" />');
    expect(seo.head).toContain('og:image" content="https://jaguarcoffeeco.com/images/og-default.jpg"');
    const types = jsonLd(seo.head).map(b => b['@type']);
    expect(types).toEqual(expect.arrayContaining(['OnlineStore', 'WebSite']));
  });

  it('ficha de producto activo: Product + Offer en COP con disponibilidad y breadcrumb', async () => {
    clearSeoCache();
    const seo = await buildSeo(APP, '/tienda/test-product');
    expect(seo.status).toBe(200);
    expect(seo.noindex).toBe(false);
    expect(seo.head).toContain('<title>Test Product | Café de especialidad Jaguar Coffee</title>');
    const [product, breadcrumb] = jsonLd(seo.head);
    expect(product['@type']).toBe('Product');
    expect(product.offers).toMatchObject({ price: 25000, priceCurrency: 'COP', availability: 'https://schema.org/InStock' });
    expect(product.offers.url).toBe('https://jaguarcoffeeco.com/tienda/test-product');
    expect(breadcrumb.itemListElement).toHaveLength(3);
  });

  it('producto inactivo o inexistente y rutas desconocidas: 404 real con noindex', async () => {
    for (const path of ['/tienda/inactive-product', '/tienda/no-existe', '/ruta-inventada', '/turismo/nada']) {
      const seo = await buildSeo(APP, path);
      expect(seo.status).toBe(404);
      expect(seo.noindex).toBe(true);
      expect(seo.head).toContain('<meta name="robots" content="noindex" />');
      expect(seo.head).not.toContain('rel="canonical"');
    }
  });

  it('páginas privadas: noindex sin canonical', async () => {
    for (const path of ['/admin', '/mi-cuenta', '/checkout', '/checkout/confirmacion', '/carrito', '/auth/login']) {
      const seo = await buildSeo(APP, path);
      expect(seo.noindex).toBe(true);
      expect(seo.head).not.toContain('rel="canonical"');
    }
  });

  it('escapa el texto de la BD: ni el HTML ni el JSON-LD se pueden romper', async () => {
    await pool.query(
      "UPDATE products SET nombre = ?, descripcion = ? WHERE id = 'prod_1'",
      ['Café "Test" <b>', 'Desc </script><script>alert(1)</script>']
    );
    clearSeoCache();
    const seo = await buildSeo(APP, '/tienda/test-product');
    expect(seo.head).not.toContain('<script>alert(1)');
    expect(seo.head).toContain('Café &quot;Test&quot; &lt;b&gt;');
    const [product] = jsonLd(seo.head);
    expect(product.description).toContain('</script><script>alert(1)</script>'); // intacto como dato, no como HTML
    await pool.query("UPDATE products SET nombre = 'Test Product', descripcion = 'A test product' WHERE id = 'prod_1'");
    clearSeoCache();
  });
});

describe('sitemapUrls', () => {
  it('incluye estáticas y fichas activas; nunca privadas ni inactivas', async () => {
    const urls = await sitemapUrls(APP);
    expect(urls).toContain('https://jaguarcoffeeco.com/tienda/test-product');
    expect(urls).toContain('https://jaguarcoffeeco.com/tienda');
    expect(urls.some(u => u.includes('inactive-product'))).toBe(false);
    expect(urls.some(u => /\/(admin|checkout|carrito|mi-cuenta|auth)/.test(u))).toBe(false);
    expect(urls.every(u => u.startsWith('https://jaguarcoffeeco.com/'))).toBe(true);
  });
});
