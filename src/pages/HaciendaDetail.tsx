import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import {
  ChevronLeft, ChevronRight, Users, Calendar, ArrowLeft, Coffee, MapPin, ExternalLink,
  PawPrint, Loader2, Sunrise, Moon, TreePine, Car, Wifi
} from 'lucide-react';
import BookingCalendar from '../components/BookingCalendar';
import { Hacienda } from '../types';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Sunrise, Moon, Coffee, TreePine, Car, Wifi, PawPrint, Users, MapPin,
};

export default function HaciendaDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [hacienda, setHacienda] = useState<Hacienda | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImage, setCurrentImage] = useState(0);
  const [bookingMode, setBookingMode] = useState<'directo' | 'airbnb'>('directo');

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setCurrentImage(0);
    axios.get(`/api/haciendas/${slug}`)
      .then(res => setHacienda(res.data))
      .catch(err => console.error('Error cargando estadía', err))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
        <Loader2 className="w-10 h-10 border-4 border-[#FFA42C] border-t-transparent rounded-full animate-spin mx-auto text-[#122C9B]" />
        <p className="text-[#122C9B]/60 text-sm">Cargando estadía...</p>
      </div>
    );
  }

  if (!hacienda) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-16 h-16 bg-[#122C9B]/10 rounded-full flex items-center justify-center mx-auto">
          <Coffee className="w-8 h-8 text-[#122C9B]/40" />
        </div>
        <h2 className="font-display text-2xl font-bold text-[#122C9B]">Estadía no encontrada</h2>
        <p className="text-sm text-[#122C9B]/60">La estadía seleccionada no existe o ya no está disponible.</p>
        <Link to="/turismo" className="inline-block px-6 py-3 bg-[#122C9B] hover:bg-[#FFA42C] text-white rounded-xl font-semibold transition-all">
          Volver a Estadías
        </Link>
      </div>
    );
  }

  const images = hacienda.galeria && hacienda.galeria.length > 0 ? hacienda.galeria : [hacienda.imagen_url];
  const nextImage = () => setCurrentImage((prev) => (prev + 1) % images.length);
  const prevImage = () => setCurrentImage((prev) => (prev - 1 + images.length) % images.length);
  const parrafos = hacienda.descripcion.split('\n\n').filter(Boolean);

  return (
    <div id="hacienda-detail-view" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">

      {/* Back Button */}
      <Link to="/turismo" className="inline-flex items-center gap-2 text-[#122C9B]/60 hover:text-[#FFA42C] text-sm font-bold transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Volver a Estadías
      </Link>

      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#FFA42C]/10 text-[#FFA42C] border border-[#FFA42C]/20 rounded-full text-xs font-mono font-black tracking-widest uppercase">
            <Coffee className="w-4 h-4" />
            {hacienda.tipo}
          </span>
          {hacienda.pet_friendly && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-mono font-black tracking-widest uppercase">
              <PawPrint className="w-3.5 h-3.5" />
              Pet Friendly
            </span>
          )}
        </div>
        <h1 className="font-sans text-4xl md:text-5xl font-extrabold text-[#122C9B] tracking-tighter uppercase leading-[0.9]">
          {hacienda.nombre}
        </h1>
        <p className="text-[#122C9B]/70 text-sm max-w-2xl mx-auto">
          {hacienda.ubicacion}
        </p>
      </div>

      {/* Image Gallery */}
      <div className="space-y-4">
        <div className="relative aspect-[16/9] bg-[#122C9B]/5 rounded-2xl overflow-hidden group">
          <img
            src={images[currentImage]}
            alt={`${hacienda.nombre} ${currentImage + 1}`}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          {images.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/90 hover:bg-white text-[#122C9B] rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/90 hover:bg-white text-[#122C9B] rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImage(idx)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      currentImage === idx ? 'bg-[#FFA42C] w-6' : 'bg-white/60 hover:bg-white'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {images.length > 1 && (
          <div className="grid grid-cols-4 gap-2">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentImage(idx)}
                className={`aspect-video rounded-lg overflow-hidden border-2 transition-all ${
                  currentImage === idx ? 'border-[#FFA42C]' : 'border-transparent hover:border-[#122C9B]/20'
                }`}
              >
                <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Info + Booking */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Description */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-[#122C9B]/10 rounded-2xl p-8 space-y-4 shadow-sm">
            <h2 className="font-sans text-2xl font-bold text-[#122C9B]">Sobre esta experiencia</h2>
            {parrafos.map((p, idx) => (
              <p key={idx} className="text-[#122C9B]/70 text-sm leading-relaxed">{p}</p>
            ))}
          </div>

          {/* Features */}
          {hacienda.features && hacienda.features.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {hacienda.features.map((f, idx) => {
                const Icon = ICONS[f.icono] || Coffee;
                return (
                  <div key={idx} className="bg-white border border-[#122C9B]/10 rounded-2xl p-4 text-center space-y-2 shadow-sm">
                    <Icon className="w-6 h-6 text-[#FFA42C] mx-auto" />
                    <p className="text-xs text-[#122C9B]/70">{f.texto}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Booking Sidebar */}
        <div className="space-y-4">
          {/* Price Card */}
          <div className="bg-white border border-[#122C9B]/10 rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="space-y-2 text-center">
              <p className="text-xs text-[#122C9B]/50 font-mono uppercase tracking-wider">Precio por noche</p>
              <p className="text-3xl font-extrabold text-[#122C9B]">${hacienda.precio_noche.toLocaleString('es-CO')}</p>
              <p className="text-xs text-[#122C9B]/50 font-mono">COP</p>
            </div>

            <div className="flex items-center justify-center gap-4 text-xs text-[#122C9B]/60 font-mono">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#FFA42C]" />
                Máx {hacienda.capacidad_max} personas
              </span>
            </div>

            {hacienda.google_maps_url && (
              <a
                href={hacienda.google_maps_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 text-xs text-[#122C9B]/50 hover:text-[#FFA42C] transition-colors"
              >
                <MapPin className="w-3.5 h-3.5" />
                {hacienda.ubicacion}
              </a>
            )}
          </div>

          {/* Booking Method Tabs */}
          {hacienda.airbnb_url && (
            <div className="bg-white border border-[#122C9B]/10 rounded-2xl p-1.5 shadow-sm">
              <div className="grid grid-cols-2 gap-1">
                <button
                  onClick={() => setBookingMode('directo')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                    bookingMode === 'directo'
                      ? 'bg-[#122C9B] text-white shadow-md'
                      : 'text-[#122C9B]/60 hover:text-[#122C9B] hover:bg-[#122C9B]/5'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  Reserva directa
                </button>
                <button
                  onClick={() => setBookingMode('airbnb')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                    bookingMode === 'airbnb'
                      ? 'bg-[#FFA42C] text-white shadow-md'
                      : 'text-[#122C9B]/60 hover:text-[#122C9B] hover:bg-[#122C9B]/5'
                  }`}
                >
                  <ExternalLink className="w-4 h-4" />
                  Airbnb
                </button>
              </div>
            </div>
          )}

          {/* Booking Content */}
          {bookingMode === 'directo' || !hacienda.airbnb_url ? (
            <BookingCalendar
              tipo="estadia"
              itemId={hacienda.id}
              itemNombre={hacienda.nombre}
              itemSlug={hacienda.slug}
              maxPeople={hacienda.capacidad_max}
            />
          ) : (
            <div className="bg-white border border-[#122C9B]/10 rounded-2xl p-6 space-y-4 shadow-sm text-center">
              <div className="w-14 h-14 bg-[#FFA42C]/10 rounded-full flex items-center justify-center mx-auto">
                <ExternalLink className="w-7 h-7 text-[#FFA42C]" />
              </div>
              <h3 className="font-sans text-lg font-bold text-[#122C9B]">Reserva en Airbnb</h3>
              <p className="text-xs text-[#122C9B]/60 leading-relaxed">
                Reserva al instante con pago seguro a través de Airbnb. Sin esperas ni formularios.
              </p>
              <a
                href={hacienda.airbnb_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-3.5 bg-[#FFA42C] hover:bg-[#122C9B] text-white text-sm font-bold rounded-xl transition-colors"
              >
                Ir a Airbnb
              </a>
              <p className="text-[10px] text-[#122C9B]/40">
                Serás redirigido a airbnb.es para completar tu reserva
              </p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
