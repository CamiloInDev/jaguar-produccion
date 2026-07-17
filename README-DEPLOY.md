# Jaguar Coffee — Guía de Despliegue (Hostinger Business + MySQL)

Guía paso a paso para montar la plataforma en **Hostinger Business** con **MySQL**.
Pensada para que el dev de Jaguar la despliegue sin conocer la historia interna del proyecto.

---

## 1. Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + Vite 6 (SPA, se compila a estáticos en `dist/`) |
| Backend | Node.js + Express 4 (TypeScript) |
| Base de datos | **MySQL** (incluida en el plan Business) |
| Auth | JWT en cookie httpOnly + bcrypt |
| Pagos | Wompi (hoy **sandbox** — ver §8) |
| Seguridad | Helmet, CORS, rate-limit, validación express-validator, 4 roles |

El servidor Express sirve **la API** y, en producción, **los estáticos del frontend** desde `dist/`. Es una sola app Node.

---

## 2. Requisitos en Hostinger Business

- Plan **Business** (o superior): soporta apps Node.js + MySQL + acceso SSH.
- Acceso a **hPanel** (Node.js app + Bases de datos MySQL + phpMyAdmin).
- **Acceso SSH** habilitado (necesario para `npm install`, `build` y `seed`).
- Node.js **20 LTS** o superior.

---

## 3. Variables de entorno

Se configuran en **hPanel → Node.js app → Environment variables**. Todas son leídas y validadas al arrancar (con Zod); si falta una crítica, el servidor **no arranca** y explica cuál falta.

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
| `ADMIN_PASSWORD` | *(secreto, ≥8)* | Contraseña del admin inicial. **No queda hardcodeada** |
| `ADMIN_NOMBRE` | `Administrador` | Opcional |
| `ADMIN_APELLIDO` | `Jaguar` | Opcional |
| `WOMPI_INTEGRITY_KEY` | *(de Wompi)* | Sandbox o producción |
| `VITE_WOMPI_PUBLIC_KEY` | *(de Wompi)* | El frontend la necesita en **build** (ver §7) |

> Copia `.env.example` como referencia. En local usa un archivo `.env` (ignorado por git).

---

## 4. Base de datos: crear e importar el esquema

1. **hPanel → Bases de datos MySQL → Crear**: crea la DB y el usuario. Anota host, nombre, usuario y contraseña (van en las `DB_*`).
2. **hPanel → phpMyAdmin → Importar**: sube y ejecuta **`db/schema.sql`**. Esto crea las 11 tablas.
   - Alternativa por SSH: `mysql -u DB_USER -p DB_NAME < db/schema.sql`

El esquema usa `utf8mb4`, columnas `JSON` para arrays (imágenes, dirección de envío) y una tabla hija `order_items` para los ítems de cada orden.

---

## 5. Subir el código

**Opción A — GitHub (recomendada):** en hPanel → Node.js app, conecta el repositorio y la rama `master`.

**Opción B — SSH/SFTP:** sube el proyecto **sin** `node_modules/` ni `dist/` (se generan en el servidor).

---

## 6. Instalar dependencias y sembrar datos (por SSH)

```bash
cd ~/domains/tudominio.com/public_html   # ruta de la app en Hostinger
npm ci --omit=dev=false                  # instala todo (incluye devDeps para el build)
npm run build                            # compila frontend (dist/) + server (dist/server.cjs)
npm run db:seed                          # crea admin (desde env) + importa catálogo
```

`npm run db:seed` es **idempotente** (se puede re-ejecutar): crea/actualiza el admin y **importa el catálogo real** (26 productos, experiencias, haciendas, slides) leyendo `db.json` del repo. No duplica filas.

---

## 7. Arrancar la app en hPanel

En **hPanel → Node.js app**:

- **Application startup file:** `dist/server.cjs`
- **Application root:** carpeta del proyecto
- **Node version:** 20+
- Pulsa **Restart** tras cada `build`.

> **Importante — build del frontend:** `VITE_WOMPI_PUBLIC_KEY` se incrusta en tiempo de **build** (`npm run build`), no en runtime. Si cambias esa clave, hay que **re-buildear**. Las demás variables se leen en runtime.

El server escucha en `process.env.PORT`. En producción sirve `dist/` (estáticos) y hace fallback SPA a `index.html`.

---

## 8. Verificación post-deploy

```bash
curl https://tudominio.com/api/health          # -> {"status":"ok",...}
curl https://tudominio.com/api/productos        # -> lista de productos (JSON)
```

- Abre el sitio, navega, agrega al carrito.
- Entra al panel admin con `ADMIN_EMAIL` / `ADMIN_PASSWORD` y verifica CRUD de productos/slides.
- Prueba un checkout (con Wompi sandbox).

---

## 9. Desarrollo local

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

## 10. Tareas pendientes conocidas (para el dev de Jaguar)

Estas quedaron identificadas y **documentadas a propósito**; no bloquean el arranque pero deben cerrarse:

1. **Wompi producción.** Hoy el checkout usa **sandbox** con un `acceptanceToken` simulado en `/api/ordenes/preparar-pago`. Para pagos reales:
   - Cargar credenciales de producción de Wompi (cuenta del cliente con NIT verificado).
   - **Validar el esquema de firma real del webhook** en `server/routes/orders.ts` (`/wompi-webhook`). La verificación SHA256 actual es una aproximación: Wompi firma los eventos con su propio esquema (checksum sobre propiedades específicas + timestamp), y además el `express.json()` global consume el body antes del `express.raw` de la ruta. Revisar contra la doc oficial de Wompi antes de ir a producción.

2. **Suite de tests de integración (DB + API).** Está **pausada** tras la migración a MySQL (estaba acoplada al `db.json` file-based). Los **tests unitarios siguen activos y verdes** (`npm test` → 16 tests). Para reactivar integración/E2E:
   - Crear una DB MySQL de prueba (p. ej. `jaguar_test`) e importar `db/schema.sql`.
   - Reescribir `tests/helpers.ts` (`createTestDb`) para sembrar vía SQL (truncate + insert) en vez de escribir `db.json`, y volver `async` los `beforeAll`.
   - Quitar `tests/integration` del `exclude` en `tsconfig.json` y `vitest.config.ts`.
   - Arreglar fixtures con categorías inválidas (`'grano'`/`'molido'` → categorías válidas `250gr|175gr|institucional|togo`).

3. **Panel Admin — gestión de usuarios (frontend).** El backend ya expone `/api/usuarios` (listar, cambiar rol, eliminar) con los 4 roles. La pestaña de UI para gestionarlos en `src/pages/Admin.tsx` quedó pendiente de (re)construir.

4. **Backups de MySQL.** Configurar respaldos automáticos de la base de datos en Hostinger.

---

## 11. Notas de seguridad ya implementadas

- Contraseñas con **bcrypt** (cost 12). Sin admin hardcodeado (se crea vía seed + env).
- **JWT** en cookie `httpOnly`, `secure` en producción, `sameSite: strict`, con `issuer`/`audience`.
- Bloqueo de cuenta tras 5 intentos fallidos (15 min).
- **Registro sin enumeración de emails** (respuesta genérica).
- **4 roles** (`admin`, `editor`, `support`, `cliente`) con `requireRole` por endpoint.
- **Helmet** (CSP/HSTS en producción), **CORS** restringido a `APP_URL`, **rate-limit** por ruta.
- Validación de entrada con **express-validator** en auth, productos, slides, contacto, reservas, órdenes y roles.
- Órdenes creadas en **transacción** (orden + ítems + descuento de stock atómico).

---

## 12. Comandos útiles

| Comando | Qué hace |
|---------|----------|
| `npm run dev` | Desarrollo (Vite + API en :3000) |
| `npm run build` | Compila frontend + server a `dist/` |
| `npm start` | Arranca `dist/server.cjs` (producción) |
| `npm run db:seed` | Siembra admin + catálogo en MySQL |
| `npm run lint` | Type-check (`tsc --noEmit`) |
| `npm test` | Tests unitarios |
