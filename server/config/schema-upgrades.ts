import { RowDataPacket } from 'mysql2/promise';
import { pool } from './db-pool';

/**
 * Cambios de esquema que se aplican solos al arrancar, para no depender de correr
 * SQL a mano en phpMyAdmin en cada despliegue. Cada paso revisa information_schema
 * antes de tocar nada, así que correrlo muchas veces no hace nada extra.
 */

async function hasColumn(table: string, column: string): Promise<boolean> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT 1 FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    [table, column]
  );
  return rows.length > 0;
}

export async function ensureSchemaUpgrades(): Promise<void> {
  // 2026-10-29 — stock apartado: 1 = las unidades de esta orden están descontadas del
  // inventario. Las órdenes viejas pagadas/enviadas/entregadas ya habían descontado stock
  // con la lógica anterior, así que nacen en 1; las pendientes viejas nunca apartaron.
  if (!(await hasColumn('orders', 'stock_reservado'))) {
    await pool.query('ALTER TABLE orders ADD COLUMN stock_reservado TINYINT(1) NOT NULL DEFAULT 0 AFTER estado');
    await pool.query("UPDATE orders SET stock_reservado = 1 WHERE estado IN ('pagado','enviado','entregado')");
    console.log('[DB] Esquema actualizado: orders.stock_reservado');
  }
}
