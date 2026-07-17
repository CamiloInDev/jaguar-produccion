import mysql from 'mysql2/promise';
import { env } from './env';

/**
 * Pool de conexiones MySQL compartido por toda la aplicación.
 * Hostinger Business provee las credenciales vía variables de entorno (DB_*).
 */
export const pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: 'Z',
  // Devuelve DECIMAL/BIGINT como número cuando cabe en un JS safe integer
  supportBigNumbers: true,
  bigNumberStrings: false,
});

/** Cierra el pool (usado en tests y apagado ordenado). */
export async function closePool(): Promise<void> {
  await pool.end();
}
