import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { MapPin, Coffee, TreePine, Sunrise, Moon, Users, ArrowRight, ExternalLink, Loader2 } from 'lucide-react';
import { Hacienda } from '../types';

const GOOGLE_MAPS_URL = 'https://maps.app.goo.gl/ekvGgp5soN9PfTr86?g_st=aw';

export default function Turismo() {
  const [haciendas, setHaciendas] = useState<Hacienda[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/haciendas')
      .then(res => setHaciendas(Array.isArray(res.data) ? res.data : []))
      .catch(err => console.error('Error cargando estadías', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div id="turismo-view" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">

      {/* Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#FFA42C]/10 text-[#FFA42C] border border-[#FFA42C]/20 rounded-full text-xs font-mono font-black tracking-widest uppercase">
          <Coffee className="w-4 h-4" />
          Estadías Cafeteras
        </span>
        <h1 className="font-sans text-4xl md:text-5xl font-extrabold text-[#122C9B] tracking-tighter uppercase leading-[0.9]">
          Vive la montaña<br />en Finca la Esperanza
        </h1>
        <p className="text-[#122C9B]/70 text-sm max-w-2xl mx-auto leading-relaxed">
          Ubicados en Silvania, Cundinamarca — a solo 42 km de Bogotá. Disfruta de la tranquilidad del campo, el aroma del café y la calidez de nuestras montañas en un entorno pet friendly.
        </p>
      </div>

      {/* Description Blocks */}
      <div className="bg-white border border-[#122C9B]/10 rounded-2xl p-8 space-y-4 shadow-sm">
        <p className="text-[#122C9B]/80 text-sm leading-relaxed">
          Brindamos una experiencia ecológica de tranquilidad y agro turismo en medio de la naturaleza. Caminatas al aire libre, atardeceres inolvidables, fogata bajo las estrellas y la grandeza de nuestras montañas cafeteras te esperan. Parqueadero, jardín y WiFi gratuito incluidos.
        </p>
        <p className="text-[#122C9B]/60 text-xs font-medium">
          Ya sea para una escapada romántica, un descanso en familia o una experiencia de conexión interior, nuestro glamping y ECO hostal son el destino perfecto para desconectarte de la rutina y reconectarte con lo esencial. ¡Trae a tu mascota!
        </p>
        <div className="flex items-center justify-center gap-4 pt-4 border-t border-[#122C9B]/10">
          <span className="flex items-center gap-2 text-[#FFA42C] text-sm font-bold">
            <Coffee className="w-4 h-4" /> Vive el café
          </span>
          <span className="flex items-center gap-2 text-[#FFA42C] text-sm font-bold">
            <TreePine className="w-4 h-4" /> Respira naturaleza
          </span>
          <span className="flex items-center gap-2 text-[#FFA42C] text-sm font-bold">
            <Moon className="w-4 h-4" /> Siente la tranquilidad
          </span>
        </div>
      </div>

      {/* Estadías Cards */}
      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 text-[#FFA42C] animate-spin mx-auto" />
        </div>
      ) : haciendas.length === 0 ? (
        <p className="text-center text-sm text-[#122C9B]/60 py-12">No hay estadías disponibles por el momento.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {haciendas.map((hacienda) => (
            <div
              key={hacienda.id}
              className="bg-white border border-[#122C9B]/10 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-[#122C9B]/5 transition-all duration-300 group"
            >
              {/* Image */}
              <Link to={`/turismo/${hacienda.slug}`}>
                <div className="relative aspect-[4/3] bg-[#122C9B]/5 overflow-hidden">
                  <img
                    src={hacienda.imagen_url}
                    alt={hacienda.nombre}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 left-4 bg-[#122C9B] text-white text-xs font-mono font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    {hacienda.tipo}
                  </div>
                </div>
              </Link>

              {/* Info */}
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <h3 className="font-sans text-xl font-bold text-[#122C9B]">
                    Finca la Esperanza
                  </h3>
                  <p className="font-sans text-lg font-semibold text-[#122C9B]/80">
                    {hacienda.nombre}
                  </p>
                  <p className="text-xs text-[#122C9B]/60 leading-relaxed">
                    {hacienda.descripcion_corta}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs text-[#122C9B]/60 font-mono">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-[#FFA42C]" />
                    Capacidad máxima para {hacienda.capacidad_max} personas
                  </span>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-[#122C9B]/10">
                  <div className="space-y-1">
                    <p className="text-xs text-[#122C9B]/50 font-mono uppercase tracking-wider">Desde</p>
                    <p className="text-2xl font-extrabold text-[#122C9B]">
                      ${hacienda.precio_noche.toLocaleString('es-CO')} COP
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      to={`/turismo/${hacienda.slug}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#122C9B]/10 hover:bg-[#FFA42C]/10 text-[#122C9B] text-xs font-bold rounded-xl uppercase tracking-wider transition-all"
                    >
                      Ver más
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                    {hacienda.airbnb_url && (
                      <a
                        href={hacienda.airbnb_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#FFA42C] hover:bg-[#122C9B] text-white text-xs font-bold rounded-xl uppercase tracking-wider transition-all"
                      >
                        Airbnb
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Features Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-[#122C9B]/10 rounded-2xl p-6 text-center space-y-3 shadow-sm">
          <span className="p-4 bg-[#FFA42C]/10 rounded-full inline-block text-[#FFA42C]">
            <Sunrise className="w-8 h-8" />
          </span>
          <h3 className="font-sans text-sm font-bold text-[#122C9B]">Atardeceres y fogata</h3>
          <p className="text-xs text-[#122C9B]/60">Cielo dorado y noches cálidas</p>
        </div>
        <div className="bg-white border border-[#122C9B]/10 rounded-2xl p-6 text-center space-y-3 shadow-sm">
          <span className="p-4 bg-[#FFA42C]/10 rounded-full inline-block text-[#FFA42C]">
            <Moon className="w-8 h-8" />
          </span>
          <h3 className="font-sans text-sm font-bold text-[#122C9B]">Noches estrelladas</h3>
          <p className="text-xs text-[#122C9B]/60">Cielo despejado y silencio</p>
        </div>
        <div className="bg-white border border-[#122C9B]/10 rounded-2xl p-6 text-center space-y-3 shadow-sm">
          <span className="p-4 bg-[#FFA42C]/10 rounded-full inline-block text-[#FFA42C]">
            <Coffee className="w-8 h-8" />
          </span>
          <h3 className="font-sans text-sm font-bold text-[#122C9B]">Agro turismo</h3>
          <p className="text-xs text-[#122C9B]/60">Caminatas entre cafetales</p>
        </div>
        <div className="bg-white border border-[#122C9B]/10 rounded-2xl p-6 text-center space-y-3 shadow-sm">
          <span className="p-4 bg-[#FFA42C]/10 rounded-full inline-block text-[#FFA42C]">
            <TreePine className="w-8 h-8" />
          </span>
          <h3 className="font-sans text-sm font-bold text-[#122C9B]">Pet friendly</h3>
          <p className="text-xs text-[#122C9B]/60">Tu mascota es bienvenida</p>
        </div>
      </div>

      {/* Location Note */}
      <div className="bg-[#122C9B] text-white rounded-2xl p-8 text-center space-y-4">
        <h3 className="font-sans text-xl font-bold">¿Cómo llegar?</h3>
        <p className="text-white/70 text-sm">
          Finca la Esperanza — Silvania, Cundinamarca | A solo 42 km de Bogotá
        </p>
        <a
          href={GOOGLE_MAPS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#FFA42C] hover:bg-white hover:text-[#122C9B] text-white text-sm font-bold rounded-xl transition-colors"
        >
          <MapPin className="w-4 h-4" />
          Abrir en Google Maps
        </a>
      </div>

    </div>
  );
}
