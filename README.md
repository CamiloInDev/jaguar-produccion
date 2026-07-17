# Jaguar Coffee — Plataforma E-commerce

Tienda y plataforma de experiencias de **Jaguar Coffee** (café de especialidad colombiano):
catálogo, carrito, checkout (Wompi), experiencias, estadías, reservas y panel de administración.

## Stack

- **Frontend:** React 19 + Vite 6 + Tailwind (SPA)
- **Backend:** Node.js + Express 4 (TypeScript)
- **Base de datos:** MySQL
- **Auth:** JWT en cookie httpOnly + bcrypt · 4 roles (admin, editor, support, cliente)
- **Pagos:** Wompi
- **Seguridad:** Helmet, CORS, rate-limit, validación express-validator

El servidor Express sirve la API y, en producción, los estáticos del frontend.

## Arranque rápido (local)

```bash
cp .env.example .env          # completa DB_*, JWT_SECRET, WOMPI_*, ADMIN_*
mysql -u root -p -e "CREATE DATABASE jaguar_dev CHARACTER SET utf8mb4"
mysql -u root -p jaguar_dev < db/schema.sql
npm install
npm run db:seed               # admin (desde env) + catálogo
npm run dev                   # http://localhost:3000
```

## Despliegue

👉 **La guía completa de despliegue en producción (Hostinger Business + MySQL) está en [README-DEPLOY.md](README-DEPLOY.md).**

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Desarrollo (Vite + API en :3000) |
| `npm run build` | Compila frontend + server a `dist/` |
| `npm start` | Producción (`dist/server.cjs`) |
| `npm run db:seed` | Siembra admin + catálogo en MySQL |
| `npm run lint` | Type-check (`tsc --noEmit`) |
| `npm test` | Tests unitarios |
