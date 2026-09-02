import axios from 'axios';

/** Sube un archivo de imagen a /api/uploads (se optimiza/comprime en el servidor) y devuelve su URL pública. */
export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('image', file);
  const res = await axios.post('/api/uploads', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.url as string;
}
