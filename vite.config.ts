import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';
import {cspMetaContent} from './server/config/csp';

/**
 * Inyecta la CSP como <meta> en el index.html de producción (solo `vite build`; en dev
 * rompería el HMR de Vite). El CDN de Hostinger reemplaza la cabecera CSP del servidor,
 * pero no toca el HTML. Directivas: server/config/csp.ts.
 */
function cspMetaTag(): Plugin {
  return {
    name: 'jaguar-csp-meta',
    apply: 'build',
    // Justo después de <meta charset>: el charset debe quedar en los primeros 1024 bytes,
    // y la CSP antes de cualquier <script> o <link> para que aplique a todos.
    transformIndexHtml(html) {
      const charset = '<meta charset="UTF-8" />';
      if (!html.includes(charset)) throw new Error('index.html sin <meta charset="UTF-8" />: no se pudo ubicar la CSP');
      return html.replace(charset, `${charset}
    <meta http-equiv="Content-Security-Policy" content="${cspMetaContent()}" />`);
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), cspMetaTag()],
    // Vite NO lee el .env de la raíz: ese archivo es del servidor (DB_*, JWT_SECRET, MP_*...)
    // y su NODE_ENV=development hacía que `vite build` en local empaquetara React en modo
    // desarrollo (~1.1 MB en vez de ~590 kB). El frontend no usa variables VITE_*; si algún
    // día las necesita, van en frontend.env/.env (nunca secretos: quedan públicas en el bundle).
    envDir: path.resolve(__dirname, 'frontend.env'),
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
