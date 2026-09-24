# ⚡ Checklist de Arranque (otro PC / primera vez)

Guía corta para clonar y poner el proyecto a correr con **MySQL** desde cero.
Para el despliegue en producción (Hostinger Business) ver **[README-DEPLOY.md](README-DEPLOY.md)**.

---

## 1. Clonar e instalar

```bash
git clone https://github.com/CamiloInDev/jaguar-produccion.git
cd jaguar-produccion
npm install
```

## 2. Crear el `.env` ⚠️ (no viene con el clone)

El `.env` está gitignorado, así que **no se descarga**. Cópialo de la plantilla:

```bash
cp .env.example .env
```

Complétalo. Mínimo para correr en local:

```env
NODE_ENV="development"
PORT=3000
APP_URL="http://localhost:3000"

# Genera con: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET="pega_aqui_un_hex_de_64_bytes"

# MySQL local
DB_HOST="localhost"
DB_PORT=3306
DB_USER="root"
DB_PASSWORD="tu_password_mysql"
DB_NAME="jaguar_dev"

# Admin inicial (lo crea el seed; sin hardcode en el código)
ADMIN_EMAIL="admin@jaguar.com"
ADMIN_PASSWORD="cambia_esto_123"
ADMIN_NOMBRE="Administrador"
ADMIN_APELLIDO="Jaguar"

# Mercado Pago — placeholders mientras NO haya credenciales reales (solo para que arranque)
MP_ACCESS_TOKEN="APP_USR-placeholder"
MP_WEBHOOK_SECRET="placeholder_webhook_secret"
```

> ⚠️ **Mercado Pago:** el servidor valida las variables al arrancar y **no levanta** si `MP_ACCESS_TOKEN` o `MP_WEBHOOK_SECRET` están vacías. Con los placeholders de arriba corre todo; solo el **pago real** queda pendiente hasta tener las credenciales de prueba de la app en *Tus integraciones*. Probar el checkout completo requiere una URL HTTPS pública (Mercado Pago no acepta `localhost`): ver README-DEPLOY.md §12.

## 3. Crear la base de datos e importar el esquema

```bash
mysql -u root -p -e "CREATE DATABASE jaguar_dev CHARACTER SET utf8mb4"
mysql -u root -p jaguar_dev < db/schema.sql
```

## 4. Sembrar datos y correr

```bash
npm run db:seed     # crea el admin (desde .env) + importa el catálogo
npm run dev         # http://localhost:3000
```

---

## Verificación rápida

```bash
curl http://localhost:3000/api/health      # -> {"status":"ok",...}
curl http://localhost:3000/api/productos    # -> 26 productos (JSON)
```

- Entra al admin con `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
- Navega la tienda, agrega al carrito.

---

## Si algo falla en el primer arranque

| Síntoma | Causa probable | Solución |
|---------|----------------|----------|
| El server no arranca y lista variables | Falta alguna var en `.env` | Complétala (ver §2) |
| `ER_ACCESS_DENIED` / `ECONNREFUSED` | `DB_*` incorrectas o MySQL apagado | Verifica credenciales y que MySQL esté corriendo |
| Error al importar `schema.sql` | Versión de MySQL/MariaDB | Revisa el mensaje; el esquema usa `utf8mb4` y `JSON` |
| `/api/productos` devuelve `[]` | Falta correr el seed | `npm run db:seed` |
| Login falla con el admin | Seed no corrió o `ADMIN_*` distinto | Re-corre `npm run db:seed` (es idempotente) |

---

## Notas

- El `.env` **nunca** se sube al repo.
- Runtime con MySQL **verificado**: build de producción (`npm run build`) + seed + `node dist/server.cjs` probado contra una BD MySQL real (health check, catálogo, login y creación de orden respondiendo correctamente).
- Pendientes del proyecto: ver **[README-DEPLOY.md](README-DEPLOY.md) §12** (Mercado Pago producción, panel de usuarios, backups).
