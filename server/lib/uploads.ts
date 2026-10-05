import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as crypto from 'crypto';
import sharp from 'sharp';

/**
 * Carpeta de las imágenes subidas desde Admin.
 * En producción va FUERA de la carpeta de la app (~/jaguar-uploads): Hostinger reemplaza la carpeta
 * de la app en cada redistribución y las imágenes guardadas dentro se pierden (confirmado 2026-10-05).
 * UPLOADS_DIR permite fijar otra ruta absoluta.
 */
function resolveUploadsDir(): string {
  if (process.env.UPLOADS_DIR) return path.resolve(process.env.UPLOADS_DIR);
  if (process.env.NODE_ENV === 'test') return path.join(process.cwd(), 'uploads_test');
  if (process.env.NODE_ENV === 'production') return path.join(os.homedir(), 'jaguar-uploads');
  return path.join(process.cwd(), 'uploads');
}

export const UPLOADS_DIR = resolveUploadsDir();
const UPLOADS_URL_PREFIX = '/uploads/';

/** Crea la carpeta de uploads si no existe. Llamar una vez al arrancar el server. */
export function ensureUploadsDir(): void {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/** true si la URL apunta a un archivo que nosotros guardamos en /uploads (no una URL externa ni /images/... del repo). */
export function isLocalUpload(url: string | null | undefined): boolean {
  return typeof url === 'string' && url.startsWith(UPLOADS_URL_PREFIX);
}

/**
 * Redimensiona (máx 1600px, sin ampliar), auto-rota por EXIF y comprime a WebP calidad 80.
 * Guarda el resultado en UPLOADS_DIR con un nombre único y devuelve la URL pública (/uploads/xxx.webp).
 */
export async function optimizeAndSaveImage(buffer: Buffer): Promise<string> {
  ensureUploadsDir();
  const optimized = await sharp(buffer, { failOn: 'none' })
    .rotate()
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  const filename = `img_${crypto.randomUUID()}.webp`;
  await fs.promises.writeFile(path.join(UPLOADS_DIR, filename), optimized);
  return UPLOADS_URL_PREFIX + filename;
}

/** Borra un archivo subido si la URL es local (no-op para URLs externas o /images/... del repo). Ignora si ya no existe. */
export async function deleteUploadedFile(url: string | null | undefined): Promise<void> {
  if (!isLocalUpload(url)) return;
  const filename = (url as string).slice(UPLOADS_URL_PREFIX.length);
  // Evita path traversal: el nombre no debe contener separadores de ruta.
  if (!filename || filename.includes('/') || filename.includes('\\') || filename.includes('..')) return;
  try {
    await fs.promises.unlink(path.join(UPLOADS_DIR, filename));
  } catch (err: any) {
    if (err.code !== 'ENOENT') console.error('[uploads] Error borrando archivo:', err.message);
  }
}
