-- ============================================================================
-- Jaguar Coffee — Esquema MySQL (Hostinger Business)
-- ----------------------------------------------------------------------------
-- Importar UNA sola vez desde hPanel → Bases de datos MySQL → phpMyAdmin,
-- o por SSH:  mysql -u USUARIO -p NOMBRE_DB < db/schema.sql
--
-- Fechas (created_at, fecha) se guardan como VARCHAR ISO/YYYY-MM-DD para
-- conservar la semántica original de la app (comparaciones y orden lexicográfico).
-- Los arrays y objetos (imagenes, direccion_envio, etc.) usan columnas JSON.
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
  id          VARCHAR(64)  NOT NULL PRIMARY KEY,
  nombre      VARCHAR(200) NOT NULL,
  descripcion TEXT         NOT NULL,
  ubicacion   VARCHAR(255) NOT NULL,
  imagen_url  TEXT         NOT NULL,
  airbnb_url  TEXT         NOT NULL,
  booking_url TEXT         NOT NULL
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
