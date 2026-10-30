import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as zlib from 'zlib';
import type { RowDataPacket } from 'mysql2';
import { pool } from '../config/db-pool';

/**
 * Respaldo diario de la base de datos, sin depender de SSH ni de mysqldump.
 *
 * Genera un .sql.gz con DROP/CREATE/INSERT de todas las tablas, importable tal cual en
 * phpMyAdmin (Importar acepta .gz). En producción se guarda FUERA de la carpeta de la app
 * (~/jaguar-backups), igual que las imágenes, porque Hostinger reemplaza esa carpeta en
 * cada redistribución. Se conservan los últimos `RESPALDOS_CONSERVAR` archivos.
 *
 * Los archivos contienen datos personales y hashes de contraseñas: solo se descargan
 * desde Admin con rol admin y se escriben con permisos 600.
 */

function resolveBackupsDir(): string {
  if (process.env.BACKUPS_DIR) return path.resolve(process.env.BACKUPS_DIR);
  if (process.env.NODE_ENV === 'test') return path.join(os.tmpdir(), 'jaguar-backups-test');
  if (process.env.NODE_ENV === 'production') return path.join(os.homedir(), 'jaguar-backups');
  return path.join(process.cwd(), 'backups');
}

export const BACKUPS_DIR = resolveBackupsDir();
const CONSERVAR = Math.max(1, Number(process.env.RESPALDOS_CONSERVAR ?? 14) || 14);
const CADA_HORAS = 24;
export const NOMBRE_RESPALDO_RE = /^jaguar-\d{4}-\d{2}-\d{2}-\d{4}\.sql\.gz$/;

export interface RespaldoInfo {
  nombre: string;
  bytes: number;
  fecha: string;
}

function sqlValue(v: unknown): string {
  if (v === null || v === undefined) return 'NULL';
  if (Buffer.isBuffer(v) || v instanceof Date || typeof v !== 'object') return pool.escape(v);
  // Columnas JSON: mysql2 las devuelve ya parseadas; se vuelven a guardar como texto JSON.
  return pool.escape(JSON.stringify(v));
}

/** Arma el volcado SQL completo de la base actual. */
export async function volcarBaseDeDatos(): Promise<string> {
  const [tablas] = await pool.query<RowDataPacket[]>("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'");
  const nombres = tablas.map(t => String(Object.values(t)[0]));
  const partes: string[] = [
    `-- Respaldo Jaguar Coffee — ${new Date().toISOString()}`,
    '-- Restaurar: phpMyAdmin → base de datos → Importar este archivo (.sql.gz).',
    'SET NAMES utf8mb4;',
    'SET FOREIGN_KEY_CHECKS = 0;',
    '',
  ];

  for (const tabla of nombres) {
    const [[crear]] = await pool.query<RowDataPacket[]>(`SHOW CREATE TABLE \`${tabla}\``);
    partes.push(`DROP TABLE IF EXISTS \`${tabla}\`;`, `${crear['Create Table']};`, '');

    const [filas] = await pool.query<RowDataPacket[]>(`SELECT * FROM \`${tabla}\``);
    if (filas.length === 0) continue;
    const columnas = Object.keys(filas[0]).map(c => `\`${c}\``).join(', ');
    for (let i = 0; i < filas.length; i += 200) {
      const valores = filas.slice(i, i + 200)
        .map(f => `(${Object.values(f).map(sqlValue).join(', ')})`)
        .join(',\n');
      partes.push(`INSERT INTO \`${tabla}\` (${columnas}) VALUES\n${valores};`);
    }
    partes.push('');
  }

  partes.push('SET FOREIGN_KEY_CHECKS = 1;', '');
  return partes.join('\n');
}

export function listarRespaldos(): RespaldoInfo[] {
  if (!fs.existsSync(BACKUPS_DIR)) return [];
  return fs.readdirSync(BACKUPS_DIR)
    .filter(n => NOMBRE_RESPALDO_RE.test(n))
    .map(nombre => {
      const st = fs.statSync(path.join(BACKUPS_DIR, nombre));
      return { nombre, bytes: st.size, fecha: st.mtime.toISOString() };
    })
    .sort((a, b) => b.nombre.localeCompare(a.nombre));
}

/** Ruta absoluta de un respaldo existente, o null si el nombre no es válido o no existe. */
export function rutaRespaldo(nombre: string): string | null {
  if (!NOMBRE_RESPALDO_RE.test(nombre)) return null;
  const ruta = path.join(BACKUPS_DIR, nombre);
  return fs.existsSync(ruta) ? ruta : null;
}

function nombreParaAhora(ahora = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `jaguar-${ahora.getUTCFullYear()}-${p(ahora.getUTCMonth() + 1)}-${p(ahora.getUTCDate())}-${p(ahora.getUTCHours())}${p(ahora.getUTCMinutes())}.sql.gz`;
}

/** Crea un respaldo nuevo y borra los más viejos que exceden el límite. */
export async function crearRespaldo(): Promise<RespaldoInfo> {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  const sql = await volcarBaseDeDatos();
  const nombre = nombreParaAhora();
  const ruta = path.join(BACKUPS_DIR, nombre);
  fs.writeFileSync(ruta, zlib.gzipSync(Buffer.from(sql, 'utf8')), { mode: 0o600 });

  for (const viejo of listarRespaldos().slice(CONSERVAR)) {
    fs.rmSync(path.join(BACKUPS_DIR, viejo.nombre), { force: true });
  }
  const info = listarRespaldos().find(r => r.nombre === nombre)!;
  console.log(`[RESPALDO] ${nombre} (${Math.round(info.bytes / 1024)} KB) en ${BACKUPS_DIR}`);
  return info;
}

async function respaldarSiToca(): Promise<void> {
  const ultimo = listarRespaldos()[0];
  const edadHoras = ultimo ? (Date.now() - Date.parse(ultimo.fecha)) / 3_600_000 : Infinity;
  if (edadHoras >= CADA_HORAS - 1) await crearRespaldo();
}

/**
 * Revisa cada 6 h si el último respaldo tiene más de un día y, si es así, crea uno.
 * (Así un reinicio o redistribución no se salta el respaldo del día ni lo duplica.)
 */
export function startRespaldosAutomaticos(): NodeJS.Timeout | null {
  if (process.env.NODE_ENV === 'test') return null;
  const correr = () => respaldarSiToca().catch(err => console.error('[RESPALDO] falló:', err?.message || err));
  const timer = setInterval(correr, 6 * 3_600_000);
  timer.unref?.();
  setTimeout(correr, 2 * 60_000).unref?.();
  console.log(`[RESPALDO] automático diario activo (carpeta ${BACKUPS_DIR}, se guardan ${CONSERVAR})`);
  return timer;
}
