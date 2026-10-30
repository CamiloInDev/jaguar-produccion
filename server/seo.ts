import { dbService } from './db';

/**
 * SEO sin SSR: el servidor inyecta en index.html, por ruta, el <title>, la meta description,
 * el canonical, Open Graph / Twitter y JSON-LD, y responde 404 real cuando la página no existe.
 *
 * Por qué en el servidor: los crawlers de previews (WhatsApp, Facebook, X) no ejecutan JS, y
 * Google pide canonical y noindex en el HTML inicial. React sigue manejando la navegación.
 * Guía y fuentes: .claude/skills/seo-tienda/SKILL.md
 */

export const SITE = {
  name: 'Jaguar Coffee',
  locale: 'es_CO',
  defaultImage: '/images/og-default.jpg', // 1200×630
  defaultDescription:
    'Café de especialidad colombiano de Silvania, Cundinamarca. Compra en línea cafés de origen, vive experiencias de cata y tueste, estadías en finca cafetera y cursos de barismo.',
  // NAP: debe coincidir EXACTAMENTE con el footer, /contacto y el Perfil de Empresa de Google
  email: 'support.coffe.jaguar@gmail.com',
  telephone: '+57 315 7307016',
  address: { streetAddress: 'Cra 4 #12-78, La Candelaria', addressLocality: 'Bogotá', addressRegion: 'Bogotá D.C.', addressCountry: 'CO' },
  sameAs: ['https://www.instagram.com/jaguarcoffeecolombia', 'https://www.facebook.com/share/1H51icMuVf/'],
};

export interface SeoResult {
  status: number;
  head: string;
  noindex: boolean;
}

interface PageMeta {
  title: string;
  description: string;
  path: string;
  image?: string;
  imageAlt?: string;
  type?: 'website' | 'product';
  jsonLd?: object[];
  noindex?: boolean;
  price?: number;
}

// Rutas públicas fijas. El orden de las palabras importa: lo específico primero, la marca al final.
const STATIC_PAGES: Record<string, Omit<PageMeta, 'path'>> = {
  '/': {
    title: 'Jaguar Coffee | Café de especialidad colombiano',
    description: SITE.defaultDescription,
  },
  '/tienda': {
    title: 'Tienda de café de especialidad | Jaguar Coffee',
    description: 'Cafés de especialidad de origen colombiano en presentaciones de 250 g, 175 g, institucional y To-Go. Variedades Caturra, Bourbón, Typica y Gesha tostadas en Silvania.',
  },
  '/experiencias': {
    title: 'Experiencias cafeteras: cata, tueste y tours | Jaguar Coffee',
    description: 'Cata de cafés de especialidad, métodos de filtrado, tueste y tour histórico en scooter. Reserva tu experiencia cafetera con Jaguar Coffee.',
  },
  '/turismo': {
    title: 'Estadías en finca cafetera en Silvania | Jaguar Coffee',
    description: 'Glamping y ECO Hostal en Finca la Esperanza, Silvania (Cundinamarca), a 42 km de Bogotá. Naturaleza, café y entorno pet friendly.',
  },
  '/academia': {
    title: 'Academia de barismo y cursos de café | Jaguar Coffee',
    description: 'Cursos de barismo, catación y tueste con certificaciones internacionales SCA y CQI. Formación desde la semilla hasta la taza.',
  },
  '/casa-jaguar': {
    title: 'Casa Jaguar, tienda y barra de café en Bogotá | Jaguar Coffee',
    description: 'Visita Casa Jaguar en La Candelaria, Bogotá: café de especialidad, métodos de preparación y granos de nuestra finca.',
  },
  '/nuestra-planta': {
    title: 'Nuestra planta de trilla y tostión | Jaguar Coffee',
    description: 'Conoce la planta de trilla y tostión de Jaguar Coffee en Silvania, Cundinamarca, con certificaciones SCA y CQI.',
  },
  '/contacto': {
    title: 'Contacto | Jaguar Coffee',
    description: 'Escríbenos para pedidos, experiencias, estadías o cursos. WhatsApp (+57) 315 7307016 · Cra 4 #12-78, La Candelaria, Bogotá.',
  },
  '/privacidad': {
    title: 'Política de tratamiento de datos personales | Jaguar Coffee',
    description: 'Política de privacidad y tratamiento de datos personales de Jaguar Coffee S.A.S.',
  },
  '/terminos': {
    title: 'Términos y condiciones | Jaguar Coffee',
    description: 'Condiciones de compra de Jaguar Coffee: pagos, envíos, derecho de retracto, garantía, reversión del pago y PQR según la Ley 1480 de 2011.',
  },
};

// Páginas que no deben indexarse (se sirven, pero con noindex; NO se bloquean en robots.txt
// para que Google pueda leer ese noindex).
const PRIVATE_PREFIXES = ['/admin', '/mi-cuenta', '/checkout', '/carrito', '/auth'];

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** JSON-LD dentro de <script>: impide que un texto de la BD cierre la etiqueta. */
const jsonLdScript = (obj: object) =>
  `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;

const clip = (s: string, max = 160) => {
  const clean = s.replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : clean.slice(0, max - 1).replace(/\s+\S*$/, '') + '…';
};

export function absoluteUrl(appUrl: string, pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return appUrl.replace(/\/$/, '') + (pathOrUrl.startsWith('/') ? pathOrUrl : '/' + pathOrUrl);
}

function organizationLd(appUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'OnlineStore',
    '@id': absoluteUrl(appUrl, '/#org'),
    name: SITE.name,
    legalName: 'Jaguar Coffee S.A.S.',
    url: absoluteUrl(appUrl, '/'),
    logo: absoluteUrl(appUrl, '/images/logo-color.png'),
    description: SITE.defaultDescription,
    email: SITE.email,
    telephone: SITE.telephone,
    address: { '@type': 'PostalAddress', ...SITE.address },
    sameAs: SITE.sameAs,
    // El checkout muestra "Envío Express GRATUITO" a todo Colombia. Si cambia, actualizar aquí.
    hasShippingService: {
      '@type': 'ShippingService',
      shippingConditions: [{
        '@type': 'ShippingConditions',
        shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'CO' },
        shippingRate: { '@type': 'MonetaryAmount', value: 0, currency: 'COP' },
      }],
    },
  };
}

function breadcrumbLd(appUrl: string, trail: [string, string][]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map(([name, path], i) => ({
      '@type': 'ListItem', position: i + 1, name, item: absoluteUrl(appUrl, path),
    })),
  };
}

function offerLd(appUrl: string, path: string, price: number, inStock: boolean) {
  return {
    '@type': 'Offer',
    url: absoluteUrl(appUrl, path),
    price,
    priceCurrency: 'COP',
    availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    itemCondition: 'https://schema.org/NewCondition',
    seller: { '@id': absoluteUrl(appUrl, '/#org') },
  };
}

/** Datos de un slug, cacheados unos minutos para no sumar una consulta a cada visita. */
const cache = new Map<string, { at: number; value: PageMeta | null }>();
const CACHE_MS = 5 * 60 * 1000;

async function cached(key: string, load: () => Promise<PageMeta | null>): Promise<PageMeta | null> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;
  const value = await load();
  cache.set(key, { at: Date.now(), value });
  return value;
}

/** Se llama al guardar productos/experiencias/estadías desde Admin para no servir datos viejos. */
export function clearSeoCache(): void {
  cache.clear();
}

async function dynamicPage(appUrl: string, path: string): Promise<PageMeta | null | undefined> {
  const m = path.match(/^\/(tienda|experiencias|turismo)\/([^/]+)\/?$/);
  if (!m) return undefined; // no es una ruta dinámica
  const [, section, rawSlug] = m;
  const slug = decodeURIComponent(rawSlug);

  return cached(`${section}:${slug}`, async () => {
    if (section === 'tienda') {
      const p = await dbService.getProductBySlug(slug);
      if (!p) return null;
      const url = `/tienda/${p.slug}`;
      const description = clip(`${p.nombre}. ${p.descripcion} Origen: ${p.origen}. Tueste ${p.tueste}. Café de especialidad Jaguar Coffee.`);
      return {
        title: `${p.nombre} | Café de especialidad Jaguar Coffee`,
        description, path: url, image: p.imagen_url, imageAlt: p.nombre, type: 'product', price: p.precio,
        jsonLd: [
          {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: p.nombre,
            image: [absoluteUrl(appUrl, p.imagen_url)],
            description: clip(p.descripcion, 5000),
            sku: p.id,
            brand: { '@type': 'Brand', name: SITE.name },
            category: 'Café de especialidad',
            offers: offerLd(appUrl, url, p.precio, p.stock > 0),
          },
          breadcrumbLd(appUrl, [['Inicio', '/'], ['Tienda', '/tienda'], [p.nombre, url]]),
        ],
      };
    }

    if (section === 'experiencias') {
      const e = await dbService.getExperienceBySlug(slug);
      if (!e || !e.activo) return null;
      const url = `/experiencias/${e.slug}`;
      return {
        title: `${e.nombre} | Experiencias Jaguar Coffee`,
        description: clip(`${e.nombre}: ${e.descripcion}`),
        path: url, image: e.imagen_url, imageAlt: e.nombre,
        jsonLd: [
          {
            '@context': 'https://schema.org',
            '@type': ['Product', 'TouristTrip'],
            name: e.nombre,
            image: [absoluteUrl(appUrl, e.imagen_url)],
            description: clip(e.descripcion, 5000),
            brand: { '@type': 'Brand', name: SITE.name },
            ...(e.precio > 0 ? { offers: offerLd(appUrl, url, e.precio, true) } : {}),
          },
          breadcrumbLd(appUrl, [['Inicio', '/'], ['Experiencias', '/experiencias'], [e.nombre, url]]),
        ],
      };
    }

    const h = await dbService.getHaciendaBySlug(slug);
    if (!h || !h.activo) return null;
    const url = `/turismo/${h.slug}`;
    return {
      title: `${h.nombre} en Silvania | Estadías Jaguar Coffee`,
      description: clip(h.descripcion_corta || h.descripcion),
      path: url, image: h.imagen_url, imageAlt: h.nombre,
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'LodgingBusiness',
          name: h.nombre,
          description: clip(h.descripcion, 5000),
          image: [h.imagen_url, ...(h.galeria || [])].filter(Boolean).slice(0, 6).map(i => absoluteUrl(appUrl, i)),
          address: { '@type': 'PostalAddress', addressLocality: 'Silvania', addressRegion: 'Cundinamarca', addressCountry: 'CO' },
          ...(h.precio_noche > 0 ? { priceRange: `Desde $${h.precio_noche.toLocaleString('es-CO')} COP por noche` } : {}),
          petsAllowed: !!h.pet_friendly,
          url: absoluteUrl(appUrl, url),
        },
        breadcrumbLd(appUrl, [['Inicio', '/'], ['Estadías', '/turismo'], [h.nombre, url]]),
      ],
    };
  });
}

function renderHead(appUrl: string, meta: PageMeta): string {
  const url = absoluteUrl(appUrl, meta.path);
  const image = absoluteUrl(appUrl, meta.image || SITE.defaultImage);
  const isDefaultImage = !meta.image;
  const t = escapeHtml(meta.title);
  const d = escapeHtml(meta.description);
  const tags = [
    `<title>${t}</title>`,
    `<meta name="description" content="${d}" />`,
    meta.noindex ? '<meta name="robots" content="noindex" />' : `<link rel="canonical" href="${escapeHtml(url)}" />`,
    `<meta property="og:site_name" content="${SITE.name}" />`,
    `<meta property="og:locale" content="${SITE.locale}" />`,
    `<meta property="og:type" content="${meta.type || 'website'}" />`,
    `<meta property="og:title" content="${t}" />`,
    `<meta property="og:description" content="${d}" />`,
    `<meta property="og:url" content="${escapeHtml(url)}" />`,
    `<meta property="og:image" content="${escapeHtml(image)}" />`,
    ...(isDefaultImage ? ['<meta property="og:image:width" content="1200" />', '<meta property="og:image:height" content="630" />'] : []),
    `<meta property="og:image:alt" content="${escapeHtml(meta.imageAlt || meta.title)}" />`,
    ...(meta.type === 'product' && meta.price ? [
      `<meta property="product:price:amount" content="${meta.price}" />`,
      '<meta property="product:price:currency" content="COP" />',
    ] : []),
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${t}" />`,
    `<meta name="twitter:description" content="${d}" />`,
    `<meta name="twitter:image" content="${escapeHtml(image)}" />`,
    ...(meta.jsonLd || []).map(jsonLdScript),
  ];
  return tags.join('\n    ');
}

/** Resuelve el SEO de una ruta del frontend (path sin query). */
export async function buildSeo(appUrl: string, rawPath: string): Promise<SeoResult> {
  const path = rawPath.length > 1 ? rawPath.replace(/\/+$/, '') : rawPath;

  if (PRIVATE_PREFIXES.some(p => path === p || path.startsWith(p + '/'))) {
    return {
      status: 200, noindex: true,
      head: renderHead(appUrl, { title: SITE.name, description: SITE.defaultDescription, path, noindex: true }),
    };
  }

  const fixed = STATIC_PAGES[path];
  if (fixed) {
    const jsonLd = path === '/'
      ? [organizationLd(appUrl), { '@context': 'https://schema.org', '@type': 'WebSite', name: SITE.name, alternateName: ['Jaguar Coffee Co'], url: absoluteUrl(appUrl, '/') }]
      : fixed.jsonLd;
    return { status: 200, noindex: false, head: renderHead(appUrl, { ...fixed, path, jsonLd }) };
  }

  const dynamic = await dynamicPage(appUrl, path);
  if (dynamic) return { status: 200, noindex: false, head: renderHead(appUrl, dynamic) };

  // Slug inexistente/inactivo o ruta desconocida: 404 real (evita "soft 404" en Google).
  // Se sigue sirviendo la SPA, que muestra su propia pantalla de "no encontrado".
  return {
    status: 404, noindex: true,
    head: renderHead(appUrl, { title: `Página no encontrada | ${SITE.name}`, description: SITE.defaultDescription, path, noindex: true }),
  };
}

/** URLs públicas indexables para /sitemap.xml (solo canónicas y activas). */
export async function sitemapUrls(appUrl: string): Promise<string[]> {
  const [products, experiences, haciendas] = await Promise.all([
    dbService.getProducts(), dbService.getExperiences(), dbService.getHaciendas(),
  ]);
  const paths = [
    ...Object.keys(STATIC_PAGES),
    ...products.filter(p => p.activo).map(p => `/tienda/${p.slug}`),
    ...experiences.filter(e => e.activo).map(e => `/experiencias/${e.slug}`),
    ...haciendas.filter(h => h.activo).map(h => `/turismo/${h.slug}`),
  ];
  return paths.map(p => absoluteUrl(appUrl, p));
}
