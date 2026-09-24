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
| Pagos | Mercado Pago Checkout Pro (Preferences API; hoy sin credenciales reales — ver §12) |
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

- Plan **Business** (o superior). Soporta hasta 5 Web Apps de Node.js, MySQL y correo del dominio.
- Acceso a **hPanel**. Se usan: Sitios web → Web App Node.js, Bases de datos → Gestión, phpMyAdmin y Emails.
- **No hace falta SSH.** El esquema y los datos iniciales se importan por phpMyAdmin (§5.3).

> **Cómo funciona en esta cuenta** (confirmado en el primer despliegue, 2026-09-24):
> - **No hay integración con GitHub.** La app se despliega **subiendo un `.zip`** del proyecto, y cada actualización es subir un zip nuevo (§9).
> - Al recibir el zip, Hostinger corre `npm install` y `npm run build`, y arranca el *archivo de entrada* configurado.
> - El panel **no deja definir el comando de build**: solo gestor de paquetes y archivo de entrada. Además, con `NODE_ENV=production` instala **solo** `dependencies`. Por eso todo lo que usa `npm run build` (vite, esbuild, plugins) debe estar en `dependencies`, no en `devDependencies`.
> - Delante de la app hay un CDN de Hostinger (`Server: hcdn`) que **reemplaza la cabecera `Content-Security-Policy`** de la app por `upgrade-insecure-requests`. Ver §12.
>
> Fuentes: [Crear una app Node.js](https://docs.hostinger.com/node.js/creating-an-app) · [Conectar MySQL a Node.js](https://www.hostinger.com/support/connecting-a-hostinger-mysql-database-to-a-node-js-application/) · [Bases de datos](https://docs.hostinger.com/websites/databases)

---

## 4. Variables de entorno

Se configuran en **hPanel → Sitios web → [dominio] → Redistribuir → Variables de entorno** (§5.2). Todas se
leen y validan al arrancar (con Zod, en `server/config/env.ts`); si falta una
crítica, el servidor **no arranca** y el log dice exactamente cuál falta.

| Variable | Ejemplo / valor | Notas |
|----------|-----------------|-------|
| `NODE_ENV` | `production` | |
| `PORT` | *(no definir)* | Hostinger lo inyecta solo. En local, `3000` por defecto |
| `APP_URL` | `https://tudominio.com` | Dominio real. Restringe CORS y va en el `audience` del JWT |
| `JWT_SECRET` | *(64 bytes hex)* | Generar: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `DB_HOST` | `127.0.0.1` | **No** `localhost`: Node puede resolverlo por IPv6 (`::1`) y el usuario MySQL de Hostinger no tiene permiso ahí |
| `DB_PORT` | `3306` | |
| `DB_USER` | `u123_jaguar` | Usuario MySQL de hPanel |
| `DB_PASSWORD` | *(secreto)* | Contraseña del usuario MySQL |
| `DB_NAME` | `u123_jaguar` | Nombre de la base de datos de hPanel |
| `ADMIN_EMAIL` · `ADMIN_PASSWORD` · `ADMIN_NOMBRE` · `ADMIN_APELLIDO` | *(solo local)* | Los usa `npm run db:seed` en desarrollo. **En Hostinger no se cargan**: el admin se crea registrándose en el sitio y promoviéndolo (§5.4) |
| `MP_ACCESS_TOKEN` | *(de Mercado Pago)* | *Tus integraciones → [app] → Credenciales de prueba / producción → Access Token*. Solo backend. El de prueba **también** empieza con `APP_USR-`: cada ambiente con el suyo |
| `MP_WEBHOOK_SECRET` | *(de Mercado Pago)* | *Tus integraciones → [app] → Webhooks → Configurar notificaciones* → clave secreta. Valida la firma `x-signature` del webhook; **no** es el Access Token |
| `MP_STATEMENT_DESCRIPTOR` | `JAGUARCOFFEE` | Opcional. Texto en el extracto de la tarjeta (máx. 13) |
| `MP_EXCLUDED_PAYMENT_TYPES` · `MP_MAX_INSTALLMENTS` · `MP_PREFERENCE_EXPIRATION_MINUTES` | *(vacías)* | Opcionales — decisiones de producto: excluir medios (`ticket`=Efecty, `bank_transfer`=PSE), tope de cuotas, vigencia del link de pago. Vacías = comportamiento por defecto de Mercado Pago |
| `SMTP_HOST` | `smtp.hostinger.com` | hPanel → Correos → cuenta de correo (ej. `noreply@tudominio.com`). Obligatorio en producción |
| `SMTP_PORT` | `465` | SSL implícito (el código activa `secure` con 465). `587` también funciona con STARTTLS |
| `SMTP_USER` | `noreply@tudominio.com` | |
| `SMTP_PASSWORD` | *(secreto)* | Contraseña de esa cuenta de correo |
| `SMTP_FROM` | `Jaguar Coffee <noreply@tudominio.com>` | Remitente que ve el usuario en el correo de recuperación de contraseña |

> Usa `.env.example` como plantilla. En local se copia a `.env` (nunca se sube
> al repo, está en `.gitignore`). Si dejas los `SMTP_*` vacíos en local/dev, el
> correo de recuperación se imprime en la consola del servidor en vez de
> enviarse — útil para probar el flujo sin una cuenta de correo real.

---

## 5. Despliegue paso a paso

Este es el orden que se siguió en el primer despliegue a `jaguarcoffeeco.com` (2026-09-24).

### 5.1 Crear la base de datos y el correo

1. **Base de datos:** entra a *Sitios web → [dominio] → Bases de datos → Gestión → Crear nueva base de datos MySQL*. Hostinger antepone un prefijo (ej. `u842711520_`) al nombre y al usuario. Anota el nombre y el usuario completos; la contraseña va solo en `DB_PASSWORD`.
   - La tarjeta "Base de datos → Conectar" del tablero de la Web App **no sirve para MySQL**: solo ofrece guías para Supabase y MongoDB.
2. **Correo para SMTP:** entra a *Emails → [dominio]* y activa el plan gratis. Crea el buzón `noreply@[dominio]` y deja en verde los registros MX, SPF, DKIM y DMARC (*Ajustes del dominio*), para que los correos no lleguen a spam.

### 5.2 Crear la Web App y desplegar

1. **Genera el zip** desde el último commit con `npm run deploy:zip`. Queda en `../jaguar-deploy.zip`, sin `.env`, `node_modules/` ni `dist/`. Si hay cambios sin commitear, el script se detiene.
2. Ve a *Sitios web → Desplegar app Node.js*, elige el dominio y sube el zip.
3. Configura la pantalla **"Revisa los ajustes de compilación"** así:

| Campo | Valor |
|---|---|
| Preajuste del marco | Express |
| Versión del nodo | 20.x (o superior) |
| Directorio raíz | `./` |
| Ajustes de compilación → Gestor de paquetes | npm |
| Ajustes de compilación → **Archivo de entrada** | **`dist/server.cjs`**, con extensión. Con `dist/server` Node busca `.js` y la app queda en 503 |
| Variables de entorno | Todas las del §4 que aplican a producción, una por una, sin comillas ni espacios. `MP_*` pueden ir de relleno (`APP_USR-pendiente` / `pendiente`) hasta tener credenciales |

4. **Desplegar.** Cuando termine, comprueba que `https://[dominio]/api/health` devuelva `{"status":"ok",...}`.
   - Si falta una variable, el servidor se detiene al iniciar y se ve **503**. Revisa los *Registros de tiempo de ejecución* del tablero: el log dice cuál variable falta.

### 5.3 Tablas y catálogo (phpMyAdmin, una sola vez)

Entra a *Bases de datos → Gestión → phpMyAdmin*, selecciona la base a la izquierda y usa la pestaña **Importar**, con las opciones por defecto:

1. `db/schema.sql`: crea las 12 tablas.
2. El SQL del catálogo: 26 productos, experiencias, estadías, cursos y slides, **sin usuarios**. Se genera en local con el seed real sobre una base temporal:

```bash
mysql -u root -e "CREATE DATABASE jaguar_seed_tmp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
mysql -u root jaguar_seed_tmp < db/schema.sql
# NODE_ENV=production para que NO cree el cliente de prueba; ADMIN_* son desechables
NODE_ENV=production DB_NAME=jaguar_seed_tmp DB_USER=root ADMIN_EMAIL=temp@example.com ADMIN_PASSWORD=temporal123 \
  JWT_SECRET=<32+ caracteres> MP_ACCESS_TOKEN=x MP_WEBHOOK_SECRET=x SMTP_HOST=x SMTP_PORT=465 SMTP_USER=x SMTP_PASSWORD=x SMTP_FROM=x \
  npx tsx server/seed.ts
mysqldump -u root --no-create-info --skip-lock-tables --skip-add-locks --no-tablespaces --set-gtid-purged=OFF \
  --complete-insert jaguar_seed_tmp products experiences haciendas courses slides > jaguar-catalogo.sql
mysql -u root -e "DROP DATABASE jaguar_seed_tmp"
```

Comprueba que `https://[dominio]/api/productos` devuelva los productos.

### 5.4 Crear el administrador

Así la contraseña del admin no pasa por variables de entorno, ni por el seed, ni por nadie más:

1. Regístrate en `https://[dominio]/auth/registro` con el correo que va a administrar.
2. En phpMyAdmin, pestaña **SQL**, ejecuta `UPDATE users SET rol = 'admin' WHERE email = '<ese correo>';`. Debe decir "1 fila afectada".
3. Cierra sesión y vuelve a entrar, porque el rol se carga al iniciar sesión. `/admin` ya debe abrir.

Los siguientes admins no necesitan phpMyAdmin: se registran y un admin les cambia el rol en **Admin → Usuarios**.

### 5.5 Reiniciar la app

Después de cambiar una variable de entorno, por ejemplo al cargar las credenciales reales de Mercado Pago, usa **Redistribuir** con "Usa archivos anteriores", o el reinicio del panel. Todas las variables se leen en runtime: no hay variables `VITE_*`, así que no hace falta recompilar por un cambio de variables. En producción la app sirve `dist/` y hace fallback SPA a `index.html`.

---

## 6. Verificación post-deploy

```bash
curl https://tudominio.com/api/health          # -> {"status":"ok",...}
curl https://tudominio.com/api/productos        # -> lista de productos (JSON)
```

Checklist manual:

- [ ] Abre el sitio, navega el catálogo, agrega productos al carrito.
- [ ] Entra a `/admin` con el admin creado en §5.4 y verifica que
      carguen productos, órdenes, mensajes, slides y reservas.
- [ ] Pide "¿Olvidaste tu clave?" con el correo del admin y confirma que el
      correo llega (prueba real del SMTP).
- [ ] Crea/edita un producto de prueba desde el panel y confirma que aparece
      en la tienda.
- [ ] Prueba un checkout completo con las credenciales de Mercado Pago que
      tengas cargadas: con las de **prueba**, abre el checkout en incógnito con
      el *comprador de prueba* y la tarjeta Mastercard `5254 1336 7440 3564`
      (CVV `123`, vence `11/30`, titular `APRO` = aprobado, `OTHE` = rechazado,
      `CONT` = pendiente). La orden debe quedar `pagado` al volver al sitio.
      Guía completa: `.claude/skills/mercadopago-checkout/SKILL.md` §4.
- [ ] Revisa la consola del navegador — si algo se bloquea por CSP (imágenes,
      scripts o iframes de terceros que falten), sale como error `Content-
      Security-Policy` ahí. Los orígenes permitidos están en `server.ts`
      (`helmetConfig.contentSecurityPolicy`).

---

## 7. Desarrollo local

```bash
cp .env.example .env        # completa DB_* apuntando a un MySQL local + JWT/MP_*/ADMIN
# Crea la DB local e importa el esquema:
mysql -u root -p -e "CREATE DATABASE jaguar_dev CHARACTER SET utf8mb4"
mysql -u root -p jaguar_dev < db/schema.sql
npm install
npm run db:seed             # siembra admin + catálogo
npm run dev                 # http://localhost:3000 (Vite + API en un solo proceso)
```

---

## 8. Cómo usar la aplicación (panel Admin)

Entra a `https://tudominio.com/admin` con una cuenta de rol `admin`. En
producción se crea como en §5.4; en local la crea `npm run db:seed` con `ADMIN_*`. El panel
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

Esta cuenta de Hostinger no tiene auto-deploy desde GitHub. Cada cambio de código se despliega así:

1. Commitea el cambio. El zip solo incluye lo commiteado.
2. Ejecuta `npm run deploy:zip`, que genera `../jaguar-deploy.zip`.
3. En hPanel: *Sitios web → [dominio] → **Redistribuir** → Subir archivos nuevos* → elige el zip. La configuración y las variables se conservan. Revisa que el archivo de entrada siga siendo `dist/server.cjs` y pulsa **Desplegar**.
4. Comprueba `/api/health` y la parte que cambiaste.

Si el cambio modifica `db/schema.sql` (tabla o columna nueva), aplica el `ALTER TABLE` en phpMyAdmin **antes** de redistribuir. No hay sistema de migraciones.

**Rollback:** en *Todos los despliegues* del tablero están los despliegues anteriores. Otra opción es hacer `git checkout <commit bueno>`, generar el zip y redistribuir.

> ⚠️ **Pendiente de verificar:** hay que confirmar si `uploads/` (las imágenes subidas desde Admin) sobrevive a un redistribuir con archivos nuevos. Sube una imagen de prueba, redistribuye y comprueba que siga cargando (§12).

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
   llamadas a Mercado Pago se desactivan/simulan solo en este entorno (los tests
   mockean `server/services/mercadopago.ts`, pero validan la firma real del webhook).
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
| `/api/ordenes/crear-pago` devuelve `502` | Mercado Pago rechazó la preferencia: `MP_ACCESS_TOKEN` inválido/placeholder, o `400 collector_does_not_comply_with_current_regulation` (la cuenta de MP tiene pendiente la validación de identidad) | Revisa el log del server (`[MP] Error creando preferencia`), confirma el Access Token y el estado de la cuenta en Mercado Pago |
| El pago se aprueba pero la orden sigue `pendiente` | El webhook no llega (URL mal configurada, o pagos con credenciales de prueba, que pueden no notificar) o la firma no coincide (`[MP] Webhook con firma inválida`) | La página de confirmación verifica el pago al volver (`/verificar-pago`), así que normalmente se corrige sola. Si no: confirma que `MP_WEBHOOK_SECRET` sea la clave secreta de **Webhooks** (no el Access Token) y que la URL sea `https://tudominio.com/api/ordenes/mp-webhook` con el evento **Pagos**. Prueba con el **Simulador** de *Tus integraciones* |
| Log `[MP][ALERTA] pago aprobado que NO cuadra con la orden` | El monto/moneda cobrado no coincide con el total de la orden (a propósito, no se marca pagado) | Revisar el pago en el panel de Mercado Pago y decidir a mano (reembolsar o ajustar) |
| Al terminar de pagar no vuelve al sitio (en local) | `APP_URL` no es HTTPS: Mercado Pago descarta `back_urls`/`notification_url` HTTP y no acepta `localhost` | Probar en Hostinger (HTTPS) o con un túnel HTTPS (cloudflared/ngrok) apuntando `APP_URL` al túnel |
| `429 Too Many Requests` en login/checkout durante pruebas manuales | Rate limiting activo (10 intentos de auth / 15 min, 30 de checkout / 15 min) | Es comportamiento esperado en producción; espera la ventana o reinicia el proceso en dev |
| Cambié una variable `VITE_*` y no se ve el cambio | Esas variables se incrustan en **build time**, no runtime | `npm run build` de nuevo y Restart |
| El correo de "recuperar contraseña" nunca llega | `SMTP_*` no configurado o incorrecto | Revisa el log del server — si no hay SMTP configurado, imprime el correo simulado ahí en vez de enviarlo; confirma credenciales de la cuenta de correo en hPanel |
| La burbuja del asistente (chat) no carga o queda en blanco | El dominio del webhook de n8n no está en la CSP, o el workflow de n8n está caído/pausado | Revisa la consola del navegador por errores de CSP; confirma que el workflow esté activo en n8n (`curl` a la URL del webhook debe devolver `200`) |

---

## 12. Tareas pendientes conocidas

1. **Mercado Pago — credenciales y prueba de punta a punta.** La integración (Checkout Pro) está hecha y probada con tests; falta:
   - Que la empresa cree/verifique su cuenta de Mercado Pago y una app de **Checkout Pro con "Tipo de API: Preferences API"** en *Tus integraciones*.
   - Cargar `MP_ACCESS_TOKEN` + `MP_WEBHOOK_SECRET` de **prueba**, configurar el webhook en *modo prueba* (`https://jaguarcoffeeco.com/api/ordenes/mp-webhook`, evento **Pagos**) y hacer una compra de prueba de punta a punta (§6).
   - Para producción: activar credenciales de producción (industria + sitio web), cargarlas en Hostinger, webhook en *modo producción*, una compra real de monto bajo y su reembolso.
   - Decisiones de producto pendientes (variables opcionales `MP_*`, §4): ¿excluir Efecty?, ¿tope de cuotas?, ¿vigencia del link de pago?, ¿enviar IVA (`taxes`)? — Mercado Pago asume 19% incluido si no se envía; consultar con el contador.
   - Guía completa de implementación, pruebas y salida a producción: `.claude/skills/mercadopago-checkout/`.

2. **CSP recortada por el CDN de Hostinger.** En `jaguarcoffeeco.com` la cabecera `Content-Security-Policy` llega como `upgrade-insecure-requests`, porque el CDN (`Server: hcdn`) reemplaza la política de Helmet. En local, el mismo build manda la política completa. Las demás cabeceras de seguridad sí llegan (HSTS, `X-Frame-Options`, `nosniff`, CORS restringido). Antes de producción hay que revisar la configuración del CDN o de seguridad en hPanel para que respete la CSP de la app, o pedírselo a soporte de Hostinger. Mientras tanto, la defensa contra XSS depende solo del código.

3. **Contraseña y dueño del admin.** El admin inicial (`noreply@jaguarcoffeeco.com`) tiene una contraseña genérica de pruebas. Antes de producción:
   - Cambiarla desde *Mi Cuenta*.
   - Registrar el correo del cliente y darle rol `admin` en *Admin → Usuarios*.
   - Cambiar la contraseña no cierra las sesiones abiertas (duran hasta 7 días, el JWT no se revoca); ver mejora pendiente en la auditoría.

4. **Backups de MySQL.** El tablero de la Web App muestra "Respaldos: Diariamente". Falta confirmar que incluyan la base de datos y probar una restauración.

5. **Persistencia de `uploads/` en Hostinger — sin confirmar (ver §8 y §9).** Las imágenes subidas desde el panel de Admin se guardan en disco local del servidor, no en git. Falta confirmar en el primer deploy real si esa carpeta sobrevive a un segundo deploy o se pierde. Si se pierde, evaluar mover el almacenamiento a un servicio externo (Cloudinary, S3-compatible) — la función `optimizeAndSaveImage` en `server/lib/uploads.ts` es el único punto a cambiar.

6. **`npm audit`: vulnerabilidades en dependencias.** El build de Hostinger reporta 13 (7 altas). Las relevantes en runtime son `nodemailer` (alta; ahora el SMTP ya está activo), `react-router-dom` (alta), y `express`, `mysql2` y `axios` (moderadas). No se han aplicado porque varias implican saltos de versión mayor. Hay que actualizarlas en una rama aparte, correr `npm test` y `npx playwright test`, y redistribuir antes de recibir pagos reales.

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
- Pagos con **Mercado Pago Checkout Pro**: el monto se calcula siempre en el servidor desde `products`; el webhook valida la firma `x-signature` (HMAC-SHA256, `timingSafeEqual`) y **nunca confía en el body** — consulta el pago a la API y solo marca `pagado` si referencia, moneda (COP) y monto coinciden exactamente con la orden. Transiciones idempotentes y sin retroceso (`SELECT … FOR UPDATE`), stock descontado una sola vez. `MP_ACCESS_TOKEN` y `MP_WEBHOOK_SECRET` nunca llegan al frontend.
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
