import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Clock, Users, ChevronRight, MessageCircle, Loader2 } from 'lucide-react';
import { Experience } from '../types';

export default function Experiencias() {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/experiencias')
      .then(res => setExperiences(Array.isArray(res.data) ? res.data.filter((e: Experience) => e.activo) : []))
      .catch(err => console.error('Error cargando experiencias', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center">
        <Loader2 className="w-8 h-8 text-[#FFA42C] animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div id="experiences-view" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">

      <div className="text-center max-w-3xl mx-auto space-y-4">
        <span className="px-3 py-1 bg-[#FFA42C]/10 text-[#122C9B] rounded-full text-xs font-bold font-mono tracking-wider uppercase">
          Línea Experiencias
        </span>
        <h1 className="font-display text-4xl font-extrabold text-[#122C9B] tracking-tight">
          Experiencias Sensoriales Jaguar Coffee
        </h1>
        <p className="text-[#122C9B]/60 font-light text-base leading-relaxed">
          Vive el café más allá de una taza. En Jaguar Coffee hemos diseñado experiencias inmersivas para que conozcas, disfrutes y comprendas el verdadero mundo del café de especialidad colombiano, guiadas por expertos y pensadas para conectar con el origen, los aromas, los sabores y los procesos que hacen único al café.
        </p>
      </div>

      {experiences.length === 0 ? (
        <p className="text-center text-sm text-[#122C9B]/60">No hay experiencias disponibles por el momento.</p>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {experiences.map((exp) => (
          <Link
            key={exp.id}
            to={`/experiencias/${exp.slug}`}
            className="group bg-white border border-[#122C9B]/10 hover:border-[#FFA42C]/30 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col"
          >
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#122C9B]/5">
              <img
                src={exp.imagen_url}
                alt={exp.nombre}
                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              <span className="absolute bottom-4 right-4 bg-[#122C9B]/90 text-white text-xs font-bold font-mono px-3 py-1.5 rounded-lg">
                ${exp.precio.toLocaleString('es-CO')} COP
              </span>
            </div>

            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <h3 className="font-display text-lg font-bold text-[#122C9B] group-hover:text-[#FFA42C] transition-colors line-clamp-2">
                  {exp.nombre}
                </h3>
                <p className="text-xs text-[#122C9B]/60 leading-relaxed font-light line-clamp-2">
                  {exp.descripcion}
                </p>
              </div>

              <div className="pt-3 border-t border-[#122C9B]/5 flex items-center justify-between text-xs text-[#122C9B]/60 font-mono">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#FFA42C]" />
                  <span>{exp.duracion_min >= 60 ? `${Math.round(exp.duracion_min / 60)}h` : `${exp.duracion_min} min`}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#FFA42C]" />
                  <span>Máx {exp.capacidad_max}</span>
                </div>
              </div>

              <div className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#122C9B]/5 hover:bg-[#122C9B] text-[#122C9B] hover:text-white rounded-xl text-sm font-semibold transition-all">
                <span>Ver Detalles</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </Link>
        ))}
      </div>
      )}

      <div className="p-6 bg-[#122C9B]/5 border border-[#122C9B]/10 rounded-2xl max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
        <span className="p-3 bg-white text-[#122C9B] border border-[#122C9B]/10 rounded-xl inline-block shadow-sm">
          <MessageCircle className="w-6 h-6" />
        </span>
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-[#122C9B]">Reservas por WhatsApp</h4>
          <p className="text-xs text-[#122C9B]/60 leading-normal font-light">
            Al presionar reservar, serás redirigido a nuestro canal de WhatsApp donde un asesor te confirmará disponibilidad y te ayudará a separar tu fecha.
          </p>
        </div>
      </div>

    </div>
  );
}
