# Jaguar Coffee — Guía de Despliegue y Operación (Hostinger Business + MySQL)

Guía para desplegar, operar y mantener la plataforma en **Hostinger Business**
con **MySQL**. Pensada para que un dev nuevo pueda desplegarla y luego
mantenerla sin conocer la historia interna del proyecto.

**Índice**
1. [Stack](#1-stack)
2. [Estructura del proyecto](#2-estructura-del-proyecto)
3. [Requisitos en Hostinger Business](#3-requisitos-en-hostinger-business)
4. [Variables de entorno](#4-variables-de-entorno)
5. [Despliegue paso a paso](#5-despliegue-paso-a-paso)
6. [Verificación post-deploy](#6-verificación-post-deploy)
7. [Desarrollo local](#7-desarrollo-local)
8. [Cómo usar la aplicación (panel Admin)](#8-cómo-usar-la-aplicación-panel-admin)
9. [Cómo actualizar el sitio ya desplegado](#9-cómo-actualizar-el-sitio-ya-desplegado)
10. [Tests](#10-tests)
11. [Problemas comunes](#11-problemas-comunes)
12. [Tareas pendientes conocidas](#12-tareas-pendientes-conocidas)
13. [Seguridad ya implementada](#13-seguridad-ya-implementada)
14. [Comandos útiles](#14-comandos-útiles)

---

## 1. Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + Vite 6 (SPA, se compila a estáticos en `dist/`) |
| Backend | Node.js + Express 4 (TypeScript) |
| Base de datos | **MySQL** (incluida en el plan Business) |
| Auth | JWT en cookie httpOnly + bcrypt |
| Pagos | Wompi (hoy **sandbox** — ver §12) |
| Seguridad | Helmet, CORS, rate-limit, validación express-validator, 4 roles |

El servidor Express sirve **la API** y, en producción, **los estáticos del
frontend** desde `dist/`. Es **una sola app Node** — no hay servicios
separados que desplegar.

---

## 2. Estructura del proyecto

```
Jaguar/
├── server.ts              # Punto de entrada del servidor Express (dev y producción)
├── src/                    # Frontend: React + Vite + Zustand + Tailwind
│   ├── pages/               # Una página por ruta (Home, Tienda, Admin, etc.)
│   ├── components/          # Componentes reutilizables
│   ├── store.ts             # Estado global (carrito, sesión) con Zustand
│   └── types.ts             # Tipos compartidos front/back
├── server/                 # Backend
│   ├── routes/               # Un archivo por recurso (auth, products, orders...)
│   ├── middleware/           # auth (JWT), rateLimiter, validate, errorHandler
│   ├── config/                # env.ts (variables validadas), db-pool.ts (MySQL)
│   ├── db.ts                  # Toda la lógica de acceso a datos (dbService)
│   └── seed.ts                 # Script que puebla la BD (admin + catálogo)
├── db/schema.sql            # Esquema MySQL completo (12 tablas). Se importa UNA vez.
├── db.json                  # Fixture del catálogo real, lo lee seed.ts (no es la BD en sí)
├── tests/                   # Tests unitarios + integración (contra MySQL real)
├── e2e/                     # Tests end-to-end con Playwright
└── dist/                    # Output del build (generado, no se versiona)
```

**En dev:** `npm run dev` arranca Express, que monta Vite en "middleware mode"
dentro del mismo proceso — un solo puerto (3000), hot-reload incluido.

**En producción:** `npm run build` genera `dist/` (frontend compilado +
`dist/server.cjs`, el backend empaquetado con esbuild). El proceso que corre
en Hostinger es literalmente `node dist/server.cjs`, que sirve la API y los
estáticos desde el mismo Express.

---

## 3. Requisitos en Hostinger Business

- Plan **Business** (o superior): soporta hasta 5 apps Node.js + MySQL + acceso SSH.
- Acceso a **hPanel** (Websites → Node.js web app + Bases de datos MySQL + phpMyAdmin).
- **Acceso SSH** habilitado (hPanel → tu sitio → Avanzado → SSH Access). No hace
  falta para el build (lo hace hPanel automáticamente, ver §5), pero sí para
  importar `schema.sql` y correr `npm run db:seed` la primera vez.
- Node.js **20 LTS** o superior (hPanel permite elegir 18/20/22/24 al crear la app).

> **Cómo funciona hoy (2026) el hosting Node.js de Hostinger:** no es un VPS con
> SSH libre — es una plataforma gestionada tipo Vercel/Render. Creas la app en
> **hPanel → Websites → Add Website → Node.js web app**, conectas el repo de
> GitHub (o subes un `.zip`), y hPanel corre `npm install` + tu *build command*
> automáticamente en cada push, y arranca el *entry file* que configures.
> El SSH es una función aparte (Avanzado → SSH Access) pensada para tareas
> puntuales (importar la BD, correr el seed), no para el ciclo de build/deploy.
> Fuentes: [Creating a Node.js App](https://docs.hostinger.com/node.js/creating-an-app),
> [Node.js hosting options](https://www.hostinger.com/support/node-js-hosting-options-at-hostinger/),
> [FTP & SSH Access](https://docs.hostinger.com/websites/ftp-ssh).

---

## 4. Variables de entorno

Se configuran en **hPanel → Node.js app → Environment variables**. Todas se
leen y validan al arrancar (con Zod, en `server/config/env.ts`); si falta una
crítica, el servidor **no arranca** y el log dice exactamente cuál falta.

| Variable | Ejemplo / valor | Notas |
|----------|-----------------|-------|
| `NODE_ENV` | `production` | |
| `PORT` | `3000` | Hostinger normalmente inyecta el puerto; usa el que indique el panel |
| `APP_URL` | `https://tudominio.com` | Dominio real. Restringe CORS y va en el `audience` del JWT |
| `JWT_SECRET` | *(64 bytes hex)* | Generar: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `DB_HOST` | `localhost` | Lo da hPanel al crear la DB (suele ser `localhost`) |
| `DB_PORT` | `3306` | |
| `DB_USER` | `u123_jaguar` | Usuario MySQL de hPanel |
| `DB_PASSWORD` | *(secreto)* | Contraseña del usuario MySQL |
| `DB_NAME` | `u123_jaguar` | Nombre de la base de datos de hPanel |
| `ADMIN_EMAIL` | `admin@tudominio.com` | Solo lo usa el seed para crear el admin inicial |
| `ADMIN_PASSWORD` | *(secreto, ≥8)* | Contraseña del admin inicial. **No queda hardcodeada** en el código |
| `ADMIN_NOMBRE` | `Administrador` | Opcional |
| `ADMIN_APELLIDO` | `Jaguar` | Opcional |
| `WOMPI_INTEGRITY_KEY` | *(de Wompi)* | Firma la solicitud de pago (checkout). Sandbox o producción |
| `WOMPI_EVENTS_KEY` | *(de Wompi)* | Dashboard de Wompi → Eventos. Es un secreto **distinto** al de integridad; firma el webhook entrante |
| `VITE_WOMPI_PUBLIC_KEY` | *(de Wompi)* | El frontend la necesita en **build** (ver §5.4) |
| `SMTP_HOST` | `smtp.hostinger.com` | hPanel → Correos → cuenta de correo (ej. `noreply@tudominio.com`). Obligatorio en producción |
| `SMTP_PORT` | `587` | |
| `SMTP_USER` | `noreply@tudominio.com` | |
| `SMTP_PASSWORD` | *(secreto)* | Contraseña de esa cuenta de correo |
| `SMTP_FROM` | `Jaguar Coffee <noreply@tudominio.com>` | Remitente que ve el usuario en el correo de recuperación de contraseña |

> Usa `.env.example` como plantilla. En local se copia a `.env` (nunca se sube
> al repo, está en `.gitignore`). Si dejas los `SMTP_*` vacíos en local/dev, el
> correo de recuperación se imprime en la consola del servidor en vez de
> enviarse — útil para probar el flujo sin una cuenta de correo real.

---

## 5. Despliegue paso a paso

### 5.1 Crear la base de datos

1. **hPanel → Bases de datos MySQL → Crear**: crea la DB y el usuario. Anota
   host, nombre, usuario y contraseña — van en las variables `DB_*` del §4.
2. **hPanel → phpMyAdmin → Importar**: sube y ejecuta **`db/schema.sql`**.
   Esto crea las 12 tablas del proyecto.
   - Alternativa por SSH: `mysql -u DB_USER -p DB_NAME < db/schema.sql`

El esquema usa `utf8mb4`, columnas `JSON` para arrays (imágenes, dirección de
envío) y una tabla hija `order_items` para los ítems de cada orden.

### 5.2 Configurar las variables de entorno

En **hPanel → Node.js app → Environment variables**, carga todas las de la
tabla del §4. Sin esto el servidor arranca y se cae inmediatamente (a propósito).

### 5.3 Crear la app Node.js en hPanel (recomendado: GitHub)

**hPanel → Websites → Add Website → Node.js web app** → *Import Git repository*
→ conecta GitHub (instala la Hostinger GitHub App) → elige el repo
`jaguar-produccion` y la rama (`master` para producción, otra rama/subdominio
para staging — ver §5.6). Configura:

| Campo del asistente | Valor |
|---|---|
| Node.js version | 20 (o 22/24) |
| Package manager | npm (auto-detectado por `package-lock.json`) |
| Build command | `npm run build` |
| Output directory | `dist` |
| Entry file | `dist/server.cjs` |
| Environment variables | pega el `.env` completo con *Import from .env file*, o cárgalas una por una (tabla del §4) |

Cada `git push` a esa rama dispara un rebuild + restart automático.

> ⚠️ **Verificar en el primer deploy:** `vite`, `esbuild`, `typescript` y `tsx`
> son `devDependencies` — el build los necesita. Si el log de build falla con
> `vite: command not found` o similar, es porque hPanel corrió `npm install`
> en modo producción (sin devDependencies). Solución: cambia el *Build command*
> a `npm install --include=dev && npm run build` (o revisa si el asistente
> tiene un campo de *Install command* separado donde forzar esto).

**Alternativa sin GitHub (subir manualmente):** *Upload your files* → sube un
`.zip` del proyecto **sin** `node_modules/`, `dist/` ni `.git/` — hPanel corre
el mismo `npm install` + build al recibirlo. Cada actualización futura implica
volver a subir el `.zip`.

### 5.4 Base de datos y seed (por SSH, una sola vez)

El build/deploy automático de hPanel **no** corre tareas puntuales como el
seed — para eso usa SSH (**hPanel → tu sitio → Avanzado → SSH Access**, anota
host/usuario/puerto, `ssh usuario@host -p puerto`):

```bash
# 1. Importar el esquema (una vez, o por phpMyAdmin — ver §5.1)
mysql -u DB_USER -p DB_NAME < db/schema.sql

# 2. Verificar que node/npm estén disponibles en esta shell
node -v && npm -v

# 3. Ir a la carpeta donde hPanel desplegó la app e instalar deps + seed
cd ~/domains/tudominio.com/public_html   # ruta real: la indica hPanel
npm install                              # si node_modules no quedó en el deploy automático
npm run db:seed                          # crea/actualiza admin + importa catálogo
```

`npm run db:seed` es **idempotente** — se puede correr varias veces sin
duplicar datos: crea o actualiza el admin (desde `ADMIN_EMAIL`/`ADMIN_PASSWORD`)
e importa el catálogo real (26 productos, experiencias, haciendas, slides)
leyendo `db.json` del repo.

> **Sobre `VITE_WOMPI_PUBLIC_KEY`:** se incrusta en el frontend en tiempo de
> **build**, no se lee en runtime. Si esa clave cambia después, hay que volver
> a disparar un rebuild (push a la rama, o *Redeploy* manual en hPanel). Las
> demás variables sí se leen en runtime — basta con **Restart**.

### 5.5 Arrancar / reiniciar la app

El proceso escucha en `process.env.PORT` (lo inyecta hPanel). Tras un cambio
de variables de entorno, o si necesitas forzar un reinicio, usa el botón
**Restart** sobre el badge "Running" del panel de la app en hPanel. En
producción sirve los estáticos de `dist/` y hace fallback SPA a `index.html`
para cualquier ruta del frontend.

### 5.6 Ambiente de staging

Recomendado: una **segunda app Node.js** en el mismo hosting (el plan Business
permite hasta 5), apuntando a un **subdominio** (ej. `staging.tudominio.com`)
y a una **base de datos MySQL separada** (ej. `u123_jaguar_staging`) — así
nunca se mezcla con los datos reales de producción.

Checklist para levantarlo:

1. **hPanel → Dominios** (o el panel del sitio) → crea el subdominio
   `staging.tudominio.com`.
2. **hPanel → Bases de datos MySQL** → crea una DB nueva para staging (no
   reutilices la de producción).
3. **hPanel → Avanzado → SSH Access** → actívalo si no lo está — se necesita
   para importar `schema.sql` y correr el seed (§5.4).
4. **hPanel → Websites → Add Website → Node.js web app** → conecta el mismo
   repo de GitHub, pero puede apuntar a otra rama (ej. `staging`) si quieres
   desacoplar despliegues, o a `master` si vas a probar exactamente lo que irá
   a producción. Asigna el subdominio del paso 1.
5. Variables de entorno propias de este ambiente:
   - `APP_URL=https://staging.tudominio.com` (crítico: CORS y el link del
     correo de recuperación de contraseña se generan con esta variable).
   - `NODE_ENV=production` (staging corre el mismo código que producción; lo
     que lo distingue es el dominio y la base de datos, no `NODE_ENV`).
   - `DB_*` apuntando a la base de datos de staging del paso 2.
   - `WOMPI_*` pueden quedarse en **sandbox** en staging sin problema.
   - `SMTP_*` reales (hPanel → Correos → crear cuenta, ej.
     `noreply@tudominio.com`) — son obligatorias porque `NODE_ENV=production`
     lo exige (ver `server/config/env.ts`); puede ser la misma cuenta de correo
     que usará producción.
   - `JWT_SECRET` **distinto** al que usará producción (genera uno nuevo con
     el comando del §4 — nunca reutilices secretos entre ambientes).
6. Importa `schema.sql` y corre `npm run db:seed` contra la DB de staging (§5.4).
7. Verifica con el checklist del §6, pero contra `https://staging.tudominio.com`.

---

## 6. Verificación post-deploy

```bash
curl https://tudominio.com/api/health          # -> {"status":"ok",...}
curl https://tudominio.com/api/productos        # -> lista de productos (JSON)
```

Checklist manual:

- [ ] Abre el sitio, navega el catálogo, agrega productos al carrito.
- [ ] Entra a `/admin` con `ADMIN_EMAIL` / `ADMIN_PASSWORD` y verifica que
      carguen productos, órdenes, mensajes, slides y reservas.
- [ ] Crea/edita un producto de prueba desde el panel y confirma que aparece
      en la tienda.
- [ ] Prueba un checkout completo con las llaves de Wompi que tengas cargadas
      (sandbox o producción).
- [ ] Revisa la consola del navegador — si algo se bloquea por CSP (imágenes,
      scripts o iframes de terceros que falten), sale como error `Content-
      Security-Policy` ahí. Los orígenes permitidos están en `server.ts`
      (`helmetConfig.contentSecurityPolicy`).

---

## 7. Desarrollo local

```bash
cp .env.example .env        # completa DB_* apuntando a un MySQL local + JWT/Wompi/ADMIN
# Crea la DB local e importa el esquema:
mysql -u root -p -e "CREATE DATABASE jaguar_dev CHARACTER SET utf8mb4"
mysql -u root -p jaguar_dev < db/schema.sql
npm install
npm run db:seed             # siembra admin + catálogo
npm run dev                 # http://localhost:3000 (Vite + API en un solo proceso)
```

---

## 8. Cómo usar la aplicación (panel Admin)

Entra a `https://tudominio.com/admin` con las credenciales de `ADMIN_EMAIL` /
`ADMIN_PASSWORD` (o las que hayas creado luego desde MySQL/seed). El panel
tiene 9 pestañas (`src/pages/Admin.tsx`):

| Pestaña | Qué se hace ahí | Endpoint detrás |
|---|---|---|
| **Productos** | Crear, editar, activar/desactivar y borrar productos del catálogo (precio, stock, categoría, imagen) | `/api/productos` |
| **Órdenes** | Ver todas las órdenes de todos los usuarios y cambiar su estado (`pendiente` → `pagado` → `enviado` → `entregado`, o `cancelado`) | `/api/ordenes` |
| **Mensajes** | Ver los mensajes enviados desde el formulario de contacto del sitio | `/api/contacto` |
| **Slides** | Editar el carrusel/hero de la home (título, imagen, botones, orden, activo/inactivo) | `/api/slides` |
| **Reservas** | Ver reservas de experiencias (academia) y estadías (haciendas), por fecha | `/api/reservas` |
| **Cursos Academia** | Crear, editar y borrar los cursos que se muestran en `/academia` (título, duración, nivel, precio, temario, cupo máximo) | `/api/cursos` |
| **Estadías** | Crear, editar y borrar las estadías que se muestran en `/turismo` (Glamping, ECO Hostal, o nuevas propiedades): precio/noche, capacidad, galería, features, links de Airbnb/Maps | `/api/haciendas` |
| **Experiencias** | Crear, editar y borrar las experiencias (cata, tueste, tours, etc.): precio, duración, capacidad, imagen, galería, detalles incluidos, recomendaciones | `/api/experiencias` |
| **Usuarios** | Ver todos los usuarios registrados, cambiar su rol (`admin`/`editor`/`support`/`cliente`) o eliminarlos. Un admin no puede cambiar su propio rol ni eliminarse a sí mismo | `/api/usuarios` |

Todos los campos de imagen del panel (Productos, Slides, Estadías, Experiencias)
tienen un botón **"Subir imagen"** que sube el archivo desde tu computador —
se optimiza automáticamente en el servidor (resize a máx. 1600px + conversión a
WebP calidad 80 vía `sharp`) y se guarda en `uploads/` (servido en `/uploads/...`).
El campo de texto para pegar una URL externa (ej. Unsplash) se mantiene como
alternativa. **Cursos no tiene campo de imagen** (el diseño de Academia no
muestra fotos por curso). Al borrar o reemplazar la imagen de un registro, el
archivo viejo se borra automáticamente del servidor si era uno subido (nunca
se borran URLs externas).

> ⚠️ **Verificar en el primer deploy real a Hostinger:** `uploads/` es una
> carpeta en disco local del servidor (no versionada en git). No está
> confirmado si el proceso de deploy de Hostinger reconstruye la carpeta de la
> app en cada push o solo hace `git pull` incremental — si reconstruye, las
> imágenes subidas se perderían en el siguiente deploy. Antes de depender de
> esto con contenido real del cliente: subir una imagen de prueba, hacer un
> segundo deploy, y confirmar que la imagen sigue accesible.

Roles disponibles (`server/middleware/auth.ts` → `requireRole`):

- `admin` — acceso total, incluida la gestión de roles de otros usuarios.
- `editor` — pensado para gestionar catálogo/contenido (confirmar alcance real
  por ruta si vas a asignar este rol a alguien).
- `support` — pensado para atención al cliente (ver órdenes/mensajes).
- `cliente` — el rol por defecto de cualquiera que se registra en el sitio.

### 8.1 Cuentas y contraseñas

- Cualquier usuario logueado puede cambiar su contraseña desde **Mi Cuenta →
  Perfil** (pide la contraseña actual).
- **¿Olvidaste tu clave?** en el login lleva a `/auth/recuperar`: se envía un
  correo (vía SMTP, ver §4) con un link a `/auth/restablecer?token=...` válido
  por 1 hora y de un solo uso.
- Si en un ambiente no hay `SMTP_*` configurado (p. ej. local sin correo real),
  el correo no se envía — se imprime en la consola del servidor para poder
  copiar el link manualmente y probar el flujo.

### 8.2 Asistente virtual (burbuja de chat)

Hay una burbuja flotante (junto a la del carrito) que abre un chat conectado a
un workflow de **n8n** (`src/components/ChatBubble.tsx`). Es un simple
`<iframe>` apuntando a la URL pública del Chat Trigger de n8n — no hay lógica
de chat propia en este repo, n8n aloja y sirve la interfaz completa.

- Si la URL del webhook cambia, actualiza la constante `N8N_CHAT_URL` en
  `ChatBubble.tsx`.
- El **texto y los colores del bot** (título, subtítulo, mensaje inicial, CSS)
  se configuran **dentro del nodo Chat Trigger en n8n**, no en este código.
- La CSP (`server.ts` → `helmetConfig.contentSecurityPolicy` → `frameSrc`)
  tiene que incluir el dominio del webhook de n8n o el iframe no cargará en
  producción.

---

## 9. Cómo actualizar el sitio ya desplegado

Para cualquier cambio de código después del primer deploy:

```bash
git pull origin master        # o el mecanismo de deploy de hPanel si usas Git integrado
npm ci                        # solo si cambiaron dependencias (package-lock.json)
npm run build                 # recompila frontend + server
# Restart en hPanel → Node.js app
```

Si el cambio incluye una modificación a `db/schema.sql` (nueva tabla/columna),
hay que aplicarla manualmente en producción **antes** del restart — no hay un
sistema de migraciones, así que cualquier `ALTER TABLE` se corre a mano por
phpMyAdmin o SSH.

Si el cambio toca `VITE_WOMPI_PUBLIC_KEY` o cualquier otra variable
`VITE_*`, hace falta un `npm run build` nuevo — cambiar solo la variable en
hPanel y reiniciar **no** es suficiente (ver nota en §5.4).

**Rollback:** si algo sale mal, `git checkout` al commit anterior (o
`git revert`), `npm run build` de nuevo, y Restart. No hay downtime automático
ni blue-green — el restart tarda lo que tarde Node en levantar.

---

## 10. Tests

Hay tres capas, cada una prueba algo distinto:

1. **Unitarios** (`tests/unit/`) — funciones puras, sin BD ni red.
2. **Integración** (`tests/integration/`) — levantan la app de Express real
   (sin abrir puerto) y le pegan peticiones HTTP con `supertest`, contra una
   **base de datos MySQL real de prueba** (`jaguar_test`, mismo
   `db/schema.sql` que producción). `tests/setup.ts` fuerza
   `DB_NAME=jaguar_test` antes de que se cargue cualquier configuración, así
   que **nunca tocan `jaguar_dev`** por accidente. El rate-limiting y la
   llamada real a la API de Wompi se desactivan/simulan solo en este entorno.
3. **E2E** (`e2e/`, Playwright) — abren un navegador real y navegan el sitio
   como un usuario. Requieren el servidor levantado (`npm run dev` en otra
   terminal).

Primera vez en una máquina nueva:

```bash
mysql -u root -p -e "CREATE DATABASE jaguar_test CHARACTER SET utf8mb4"
mysql -u root -p jaguar_test < db/schema.sql
npm test              # unitarios + integración (126 tests)
npm run test:e2e       # end-to-end, con el server corriendo aparte
```

---

## 11. Problemas comunes

| Síntoma | Causa probable | Solución |
|---|---|---|
| El servidor no arranca, log dice `[ENV ERROR]` | Falta una variable de entorno obligatoria | Revisa el log — dice exactamente cuál falta (§4) |
| `/api/productos` devuelve `[]` | No se corrió el seed | `npm run db:seed` |
| Login del admin falla | Seed no corrió, o `ADMIN_EMAIL`/`ADMIN_PASSWORD` distintos a los que usas | Re-corre `npm run db:seed` (es idempotente) |
| Imágenes/mapas/scripts de terceros no cargan en producción | Bloqueado por la CSP (Content-Security-Policy) | Revisa la consola del navegador y agrega el origen que falte en `server.ts` → `helmetConfig.contentSecurityPolicy` |
| `/api/ordenes/preparar-pago` devuelve `502` | Las llaves de Wompi (`VITE_WOMPI_PUBLIC_KEY`) no son válidas o el merchant no tiene `presigned_acceptance` habilitado | Confirma las llaves con Wompi; revisa el log del server, imprime el motivo exacto |
| El pago se aprueba en Wompi pero la orden no cambia a `pagado` | El webhook no llega o la firma no coincide | Confirma que `WOMPI_EVENTS_KEY` sea el secreto de **Eventos** (no el de integridad) y que la URL del webhook en el dashboard de Wompi apunte a `https://tudominio.com/api/ordenes/wompi-webhook` |
| `429 Too Many Requests` en login/checkout durante pruebas manuales | Rate limiting activo (10 intentos de auth / 15 min, 30 de checkout / 15 min) | Es comportamiento esperado en producción; espera la ventana o reinicia el proceso en dev |
| Cambié una variable `VITE_*` y no se ve el cambio | Esas variables se incrustan en **build time**, no runtime | `npm run build` de nuevo y Restart |
| El correo de "recuperar contraseña" nunca llega | `SMTP_*` no configurado o incorrecto | Revisa el log del server — si no hay SMTP configurado, imprime el correo simulado ahí en vez de enviarlo; confirma credenciales de la cuenta de correo en hPanel |
| La burbuja del asistente (chat) no carga o queda en blanco | El dominio del webhook de n8n no está en la CSP, o el workflow de n8n está caído/pausado | Revisa la consola del navegador por errores de CSP; confirma que el workflow esté activo en n8n (`curl` a la URL del webhook debe devolver `200`) |

---

## 12. Tareas pendientes conocidas

1. **Wompi producción.** El checkout usa **sandbox**. Antes de aceptar pagos reales:
   - Cargar credenciales de **producción** de Wompi (cuenta del cliente con NIT verificado): `WOMPI_INTEGRITY_KEY`, `WOMPI_EVENTS_KEY` y `VITE_WOMPI_PUBLIC_KEY` (con prefijo `pub_prod_...`).
   - El `acceptanceToken` de `/api/ordenes/preparar-pago` se obtiene en tiempo real desde `GET {sandbox|production}.wompi.co/v1/merchants/{public_key}` (no es un valor simulado) — solo confirmar que el merchant de producción tenga `presigned_acceptance` habilitado.
   - El webhook (`/api/ordenes/wompi-webhook`) verifica la firma con el esquema real de eventos de Wompi (`signature.properties` concatenadas + `timestamp` + `WOMPI_EVENTS_KEY`, con `timingSafeEqual`). Antes de producción, probar contra un evento real de sandbox para confirmar el `properties` que Wompi efectivamente envía.

2. **Backups de MySQL.** Configurar respaldos automáticos de la base de datos en Hostinger (hPanel suele tener esta opción en el panel de la base de datos).

3. **Dependencia `csrf-csrf`** está en `package.json` pero no se ve conectada en `server.ts` — confirmar si hace falta en algún flujo o se puede quitar.

4. **Cuenta de correo SMTP.** El envío real del correo de "recuperar contraseña" necesita una cuenta de correo creada en hPanel (ej. `noreply@tudominio.com`) y sus datos cargados en `SMTP_*` (§4). Sin esto, el link de recuperación solo queda impreso en el log del servidor.

5. **Persistencia de `uploads/` en Hostinger — sin confirmar (ver §8).** Las imágenes subidas desde el panel de Admin se guardan en disco local del servidor, no en git. Falta confirmar en el primer deploy real si esa carpeta sobrevive a un segundo deploy o se pierde. Si se pierde, evaluar mover el almacenamiento a un servicio externo (Cloudinary, S3-compatible) — la función `optimizeAndSaveImage` en `server/lib/uploads.ts` es el único punto a cambiar.

---

## 13. Seguridad ya implementada

- Contraseñas con **bcrypt** (cost 12). Sin admin hardcodeado (se crea vía seed + env).
- **JWT** en cookie `httpOnly`, `secure` en producción, `sameSite: strict`, con `issuer`/`audience`.
- Bloqueo de cuenta tras 5 intentos fallidos de login (15 min).
- **Registro sin enumeración de emails** (respuesta genérica tanto si el email existe como si no).
- **4 roles** (`admin`, `editor`, `support`, `cliente`) con `requireRole` por endpoint.
- **Helmet** (CSP/HSTS en producción), **CORS** restringido a `APP_URL`, **rate-limit** por ruta (desactivado solo en tests).
- Validación de entrada con **express-validator** en auth, productos, slides, contacto, reservas, órdenes y roles.
- Órdenes creadas en **transacción** MySQL (orden + ítems + descuento de stock atómico — o se aplica todo o nada).
- Firma de pagos y verificación del webhook de Wompi con secretos separados que nunca llegan al frontend.
- **Gestión de contraseñas real** (no mocks): cambio de contraseña autenticado (`PUT /api/auth/password`, requiere la actual) y recuperación por correo con token de un solo uso, expira en 1 hora, se guarda solo su hash SHA-256 en `password_resets` (`POST /api/auth/recuperar` + `POST /api/auth/restablecer`).

---

## 14. Comandos útiles

| Comando | Qué hace |
|---------|----------|
| `npm run dev` | Desarrollo (Vite + API en :3000) |
| `npm run build` | Compila frontend + server a `dist/` |
| `npm start` | Arranca `dist/server.cjs` (producción) |
| `npm run db:seed` | Crea/actualiza admin + siembra catálogo en MySQL (idempotente) |
| `npm run lint` | Type-check (`tsc --noEmit`), no hay ESLint configurado |
| `npm test` | Tests unitarios + integración |
| `npm run test:e2e` | Tests end-to-end (Playwright) |
| `npm run test:all` | `npm test` + `npm run test:e2e` |
