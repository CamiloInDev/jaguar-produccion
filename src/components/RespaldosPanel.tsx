import { useEffect, useState } from 'react';
import axios from 'axios';
import { Database, Download, RefreshCw } from 'lucide-react';

interface Respaldo {
  nombre: string;
  bytes: number;
  fecha: string;
}

const tamano = (b: number) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const fecha = (iso: string) =>
  new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' });

/** Pestaña de Admin: respaldos automáticos de la base de datos (uno diario, se guardan los últimos 14). */
export default function RespaldosPanel() {
  const [respaldos, setRespaldos] = useState<Respaldo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState('');

  const cargar = async () => {
    setCargando(true);
    setError('');
    try {
      setRespaldos((await axios.get<Respaldo[]>('/api/respaldos')).data);
    } catch {
      setError('No se pudo cargar la lista de respaldos.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const crearAhora = async () => {
    setCreando(true);
    setError('');
    try {
      await axios.post('/api/respaldos');
      await cargar();
    } catch {
      setError('No se pudo crear el respaldo. Intenta de nuevo.');
    } finally {
      setCreando(false);
    }
  };

  return (
    <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="p-6 bg-stone-50 border-b border-stone-150 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display font-bold text-stone-900 text-sm flex items-center gap-2">
            <Database className="w-4 h-4 text-[#FFA42C]" /> Respaldos de la base de datos
          </h3>
          <p className="text-xs text-stone-500 mt-1">
            Se crea uno automático cada día y se guardan los últimos 14. Incluyen pedidos, clientes y catálogo.
          </p>
        </div>
        <button
          onClick={crearAhora}
          disabled={creando}
          className="inline-flex items-center gap-2 bg-[#122C9B] text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-[#3D5FC9] disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${creando ? 'animate-spin' : ''}`} />
          {creando ? 'Creando…' : 'Crear respaldo ahora'}
        </button>
      </div>

      {error && <p className="px-6 pt-4 text-xs text-red-600">{error}</p>}

      {cargando ? (
        <p className="p-6 text-xs text-stone-500">Cargando…</p>
      ) : respaldos.length === 0 ? (
        <p className="p-6 text-xs text-stone-500">Todavía no hay respaldos. El primero se crea solo pocos minutos después de cada despliegue, o puedes crearlo ahora.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-stone-150 text-stone-500 font-mono uppercase">
                <th className="p-4 font-semibold">Fecha</th>
                <th className="p-4 font-semibold">Tamaño</th>
                <th className="p-4 font-semibold text-right">Archivo</th>
              </tr>
            </thead>
            <tbody>
              {respaldos.map(r => (
                <tr key={r.nombre} className="border-b border-stone-100">
                  <td className="p-4 text-stone-800">{fecha(r.fecha)}</td>
                  <td className="p-4 text-stone-500">{tamano(r.bytes)}</td>
                  <td className="p-4 text-right">
                    <a
                      href={`/api/respaldos/${encodeURIComponent(r.nombre)}`}
                      download={r.nombre}
                      className="inline-flex items-center gap-1.5 text-[#122C9B] font-bold hover:text-[#FFA42C]"
                    >
                      <Download className="w-3.5 h-3.5" /> Descargar
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="px-6 py-4 text-[11px] text-stone-400 border-t border-stone-100">
        Guarda una copia fuera del servidor de vez en cuando. Para restaurar: phpMyAdmin → base de datos → Importar el archivo .sql.gz.
        Contiene datos personales: no lo compartas.
      </p>
    </div>
  );
}
