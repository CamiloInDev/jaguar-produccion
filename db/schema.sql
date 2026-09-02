-- ============================================================================
-- Jaguar Coffee — Esquema MySQL (Hostinger Business)
-- ----------------------------------------------------------------------------
-- Importar UNA sola vez desde hPanel → Bases de datos MySQL → phpMyAdmin,
-- o por SSH:  mysql -u USUARIO -p NOMBRE_DB < db/schema.sql
--
-- Fechas (created_at, fecha) se guardan como VARCHAR ISO/YYYY-MM-DD para
-- conservar la semántica original de la app (comparaciones y orden lexicográfico).
-- Los arrays y objetos (imagenes, direccion_envio, etc.) usan columnas JSON.
--
-- Si ya tienes una BD con el esquema viejo de `haciendas` (sin slug/tipo/
-- capacidad_max/etc.) y `courses` no existe todavía, corre esto una vez antes
-- de `npm run db:seed` (no hay sistema de migraciones, se aplica a mano):
--
--   DELETE FROM haciendas;  -- solo tenía datos mock, no usados por el frontend
--   ALTER TABLE haciendas
--     ADD COLUMN slug              VARCHAR(191) NOT NULL AFTER id,
--     ADD COLUMN tipo              VARCHAR(60)  NOT NULL DEFAULT 'glamping' AFTER slug,
--     ADD COLUMN descripcion_corta VARCHAR(255) NOT NULL DEFAULT '' AFTER descripcion,
--     ADD COLUMN capacidad_max     INT          NOT NULL DEFAULT 8 AFTER ubicacion,
--     ADD COLUMN precio_noche      INT          NOT NULL DEFAULT 0 AFTER capacidad_max,
--     ADD COLUMN galeria           JSON         NULL AFTER imagen_url,
--     ADD COLUMN features          JSON         NULL AFTER galeria,
--     ADD COLUMN google_maps_url   TEXT         NULL AFTER booking_url,
--     ADD COLUMN pet_friendly      TINYINT(1)   NOT NULL DEFAULT 0,
--     ADD COLUMN orden             INT          NOT NULL DEFAULT 1,
--     ADD COLUMN activo            TINYINT(1)   NOT NULL DEFAULT 1,
--     ADD UNIQUE KEY uq_haciendas_slug (slug);
--
-- Luego crea la tabla `courses` nueva corriendo el CREATE TABLE de más abajo
-- (o reimportando este archivo completo — todos los CREATE usan IF NOT EXISTS).
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 1;

-- --------------------------------------------------------------------------
-- Usuarios
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            VARCHAR(64)  NOT NULL PRIMARY KEY,
  email         VARCHAR(191) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  nombre        VARCHAR(100) NOT NULL,
  apellido      VARCHAR(100) NOT NULL,
  telefono      VARCHAR(30)  NOT NULL DEFAULT '',
  rol           ENUM('admin','editor','support','cliente') NOT NULL DEFAULT 'cliente',
  created_at    VARCHAR(32)  NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------------
-- Productos
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id           VARCHAR(64)  NOT NULL PRIMARY KEY,
  slug         VARCHAR(191) NOT NULL UNIQUE,
  nombre       VARCHAR(200) NOT NULL,
  descripcion  TEXT         NOT NULL,
  precio       INT          NOT NULL,
  precio_antes INT          NULL,
  stock        INT          NOT NULL DEFAULT 0,
  categoria    ENUM('250gr','175gr','institucional','togo') NOT NULL,
  origen       VARCHAR(150) NOT NULL,
  tueste       VARCHAR(60)  NOT NULL,
  imagen_url   TEXT         NOT NULL,
  activo       TINYINT(1)   NOT NULL DEFAULT 1,
  created_at   VARCHAR(32)  NOT NULL,
  INDEX idx_products_categoria (categoria),
  INDEX idx_products_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------------
-- Experiencias
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS experiences (
  id                 VARCHAR(64)  NOT NULL PRIMARY KEY,
  slug               VARCHAR(191) NOT NULL UNIQUE,
  nombre             VARCHAR(200) NOT NULL,
  descripcion        TEXT         NOT NULL,
  duracion_min       INT          NOT NULL,
  precio             INT          NOT NULL,
  capacidad_max      INT          NOT NULL,
  booking_widget     TEXT         NOT NULL,
  imagen_url         TEXT         NOT NULL,
  imagenes           JSON         NOT NULL,
  detalles_incluidos JSON         NULL,
  recomendaciones    JSON         NULL,
  activo             TINYINT(1)   NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------------
-- Haciendas / estadías
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS haciendas (
  id                VARCHAR(64)  NOT NULL PRIMARY KEY,
  slug              VARCHAR(191) NOT NULL UNIQUE,
  nombre            VARCHAR(200) NOT NULL,
  tipo              VARCHAR(60)  NOT NULL DEFAULT 'glamping',
  descripcion       TEXT         NOT NULL,
  descripcion_corta VARCHAR(255) NOT NULL DEFAULT '',
  ubicacion         VARCHAR(255) NOT NULL,
  capacidad_max     INT          NOT NULL DEFAULT 8,
  precio_noche      INT          NOT NULL DEFAULT 0,
  imagen_url        TEXT         NOT NULL,
  galeria           JSON         NULL,
  features          JSON         NULL,
  airbnb_url        TEXT         NOT NULL,
  booking_url       TEXT         NOT NULL,
  google_maps_url   TEXT         NULL,
  pet_friendly      TINYINT(1)   NOT NULL DEFAULT 0,
  orden             INT          NOT NULL DEFAULT 1,
  activo            TINYINT(1)   NOT NULL DEFAULT 1,
  INDEX idx_haciendas_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------------
-- Cursos (Academia de Barismo)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS courses (
  id           VARCHAR(64)  NOT NULL PRIMARY KEY,
  slug         VARCHAR(191) NOT NULL UNIQUE,
  title        VARCHAR(200) NOT NULL,
  duration     VARCHAR(100) NOT NULL,
  level        VARCHAR(100) NOT NULL,
  price        VARCHAR(100) NOT NULL,
  priceDetail  VARCHAR(255) NOT NULL DEFAULT '',
  description  TEXT         NOT NULL,
  syllabus     JSON         NOT NULL,
  maxPeople    INT          NOT NULL DEFAULT 10,
  orden        INT          NOT NULL DEFAULT 1,
  activo       TINYINT(1)   NOT NULL DEFAULT 1,
  created_at   VARCHAR(32)  NOT NULL,
  INDEX idx_courses_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------------
-- Órdenes + ítems (tabla hija)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id                   VARCHAR(80) NOT NULL PRIMARY KEY,
  user_id              VARCHAR(64) NOT NULL,
  estado               ENUM('pendiente','pagado','enviado','entregado','cancelado') NOT NULL DEFAULT 'pendiente',
  total                INT         NOT NULL,
  wompi_transaction_id VARCHAR(120) NULL,
  direccion_envio      JSON        NOT NULL,
  notas                TEXT        NULL,
  created_at           VARCHAR(32) NOT NULL,
  INDEX idx_orders_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_items (
  id          BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_id    VARCHAR(80)  NOT NULL,
  product_id  VARCHAR(64)  NOT NULL,
  nombre      VARCHAR(200) NOT NULL,
  precio_unit INT          NOT NULL,
  cantidad    INT          NOT NULL,
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  INDEX idx_order_items_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------------
-- Mensajes de contacto
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contact_messages (
  id         VARCHAR(64)  NOT NULL PRIMARY KEY,
  nombre     VARCHAR(150) NOT NULL,
  email      VARCHAR(191) NOT NULL,
  asunto     VARCHAR(255) NOT NULL,
  mensaje    TEXT         NOT NULL,
  respondido TINYINT(1)   NOT NULL DEFAULT 0,
  created_at VARCHAR(32)  NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------------
-- Slides del carrusel (hero)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS slides (
  id          VARCHAR(64)  NOT NULL PRIMARY KEY,
  title       VARCHAR(255) NOT NULL,
  subtitle    TEXT         NOT NULL,
  badge       VARCHAR(150) NOT NULL,
  buttonText  VARCHAR(80)  NOT NULL,
  buttonLink  VARCHAR(255) NOT NULL,
  button2Text VARCHAR(80)  NULL,
  button2Link VARCHAR(255) NULL,
  bgImage     TEXT         NOT NULL,
  orden       INT          NOT NULL DEFAULT 1,
  activo      TINYINT(1)   NOT NULL DEFAULT 1,
  INDEX idx_slides_orden (orden)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------------
-- Reservas (academia / estadía)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reservations (
  id                VARCHAR(64)  NOT NULL PRIMARY KEY,
  tipo              ENUM('academia','estadia') NOT NULL,
  item_id           VARCHAR(64)  NOT NULL,
  item_nombre       VARCHAR(200) NOT NULL,
  item_slug         VARCHAR(191) NOT NULL DEFAULT '',
  fecha             VARCHAR(10)  NOT NULL,
  nombre            VARCHAR(150) NOT NULL,
  email             VARCHAR(191) NOT NULL,
  telefono          VARCHAR(30)  NOT NULL,
  cantidad_personas INT          NOT NULL DEFAULT 1,
  estado            ENUM('pendiente','confirmada','cancelada') NOT NULL DEFAULT 'pendiente',
  notas             TEXT         NULL,
  created_at        VARCHAR(32)  NOT NULL,
  INDEX idx_reservations_item (tipo, item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------------
-- Intentos de login (bloqueo por fuerza bruta)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS login_attempts (
  email        VARCHAR(191) NOT NULL PRIMARY KEY,
  count        INT          NOT NULL DEFAULT 0,
  last_attempt BIGINT       NOT NULL,
  locked_until BIGINT       NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------------
-- Tokens de recuperación de contraseña
-- --------------------------------------------------------------------------
-- Se guarda el HASH SHA-256 del token, nunca el token en claro (el token real
-- solo viaja en el link del correo). Expira a la hora de creado.
CREATE TABLE IF NOT EXISTS password_resets (
  token_hash CHAR(64)     NOT NULL PRIMARY KEY,
  user_id    VARCHAR(64)  NOT NULL,
  expires_at VARCHAR(32)  NOT NULL,
  used       TINYINT(1)   NOT NULL DEFAULT 0,
  created_at VARCHAR(32)  NOT NULL,
  CONSTRAINT fk_password_resets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_password_resets_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
