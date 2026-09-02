import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, HelpCircle, CheckCircle, Clock, Instagram, Facebook } from 'lucide-react';
import axios from 'axios';

export default function Contacto() {
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    asunto: '',
    mensaje: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await axios.post('/api/contacto', formData);
      setSuccess(true);
      setFormData({
        nombre: '',
        email: '',
        asunto: '',
        mensaje: ''
      });
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'No pudimos registrar su mensaje. Verifique los datos.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div id="contacto-view" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">

      {/* Visual Header */}
      <div className="max-w-3xl mx-auto text-center space-y-4">
        <span className="px-3 py-1 bg-[#FFA42C]/10 text-[#122C9B] rounded-full text-xs font-bold font-mono tracking-wider uppercase">
          Mesa de Ayuda
        </span>
        <h1 className="font-display text-4xl font-extrabold text-[#122C9B] tracking-tight">
          Ponte en Contacto con Jaguar Coffee
        </h1>
        <p className="text-[#122C9B]/60 font-light text-base leading-relaxed">
          ¿Deseas distribuir café de especialidad, tienes preguntas sobre experiencias o necesitas soporte de órdenes? Diligencia el formulario y te responderemos en menos de 12 horas.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start max-w-6xl mx-auto">

        {/* Left Side: Contact Information Cards (5 Columns) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-[#122C9B]/10 rounded-2xl p-6 shadow-sm space-y-6">
            <h3 className="font-display text-xl font-bold text-[#122C9B]">Oficinas Centrales</h3>
            <p className="text-sm text-[#122C9B]/60 font-light leading-relaxed">
              Nuestro laboratorio de catación principal y planta de tostión se encuentran en Silvania, Cundinamarca.
            </p>

            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#FFA42C] flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-[#122C9B] font-mono uppercase">Dirección</h4>
                  <p className="text-sm text-[#122C9B]/60 mt-0.5 font-light">Cra 4 # 12 – 78, La Candelaria, Bogotá, Colombia</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-[#FFA42C] flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-[#122C9B] font-mono uppercase">Correo electrónico</h4>
                  <a href="mailto:support.coffe.jaguar@gmail.com" className="text-sm text-[#122C9B]/60 mt-0.5 font-light hover:text-[#FFA42C] transition-colors break-all">support.coffe.jaguar@gmail.com</a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-[#FFA42C] flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-[#122C9B] font-mono uppercase">Canal de Whatsapp</h4>
                  <p className="text-sm text-[#122C9B]/60 mt-0.5 font-light">(+57) 315 7307016</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#122C9B]/10 space-y-3">
              <h4 className="text-sm font-bold text-[#122C9B] font-mono uppercase flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#FFA42C]" />
                Horarios Casa Jaguar
              </h4>
              <ul className="text-sm text-[#122C9B]/60 font-light space-y-1">
                <li><span className="font-semibold text-[#122C9B]/80">Lunes – Viernes:</span> 8:00 a.m. – 6:00 p.m.</li>
                <li><span className="font-semibold text-[#122C9B]/80">Sábados:</span> 9:00 a.m. – 5:00 p.m.</li>
                <li><span className="font-semibold text-[#122C9B]/80">Domingos:</span> 10:00 a.m. – 3:00 p.m.</li>
              </ul>
            </div>

            <div className="pt-4 border-t border-[#122C9B]/10 space-y-3">
              <h4 className="text-sm font-bold text-[#122C9B] font-mono uppercase">Síguenos</h4>
              <div className="flex items-center gap-3">
                <a
                  href="https://www.instagram.com/jaguarcoffeecolombia"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-[#FFF9F5] border border-[#122C9B]/20 rounded-lg text-sm font-semibold text-[#122C9B] hover:bg-[#122C9B] hover:text-white transition-colors"
                >
                  <Instagram className="w-4 h-4" />
                  <span>Instagram</span>
                </a>
                <a
                  href="https://www.facebook.com/share/1H51icMuVf/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-[#FFF9F5] border border-[#122C9B]/20 rounded-lg text-sm font-semibold text-[#122C9B] hover:bg-[#122C9B] hover:text-white transition-colors"
                >
                  <Facebook className="w-4 h-4" />
                  <span>Facebook</span>
                </a>
              </div>
            </div>
          </div>

          {/* Quick FAQ info Card */}
          <div className="p-5 bg-[#122C9B]/5 border border-[#122C9B]/10 rounded-xl flex items-start gap-3 leading-relaxed">
            <HelpCircle className="w-5 h-5 text-[#FFA42C] flex-shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-[#122C9B] uppercase tracking-wide font-mono">¿Eres Mayorista?</h4>
              <p className="text-sm text-[#122C9B]/60 mt-1 font-light">
                Brindamos tarifas especiales de saco verde o grano tostado para cafeterías, corporaciones y oficinas a nivel nacional. Escríbenos con el asunto "Socio Mayorista".
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Working Contact Message Form (7 Columns) */}
        <div className="lg:col-span-7 bg-white border border-[#122C9B]/10 rounded-2xl p-8 shadow-sm">
          {success ? (
            <div className="text-center py-10 space-y-4">
              <span className="p-3 bg-emerald-50 text-emerald-600 rounded-full inline-block">
                <CheckCircle className="w-8 h-8 mx-auto" />
              </span>
              <h3 className="font-display text-xl font-bold text-[#122C9B]">¡Mensaje Recibido Correctamente!</h3>
              <p className="text-xs text-[#122C9B]/60 max-w-sm mx-auto leading-relaxed font-light">
                Gracias por escribirnos. Uno de nuestros baristas o asesores de negocio se pondrá en contacto contigo a la mayor brevedad.
              </p>
              <button
                onClick={() => setSuccess(false)}
                className="px-5 py-2.5 bg-[#122C9B] text-[#FFF9F5] hover:bg-[#FFA42C] text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Enviar Otro Mensaje
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="nombre" className="block text-xs font-bold text-[#122C9B] font-mono uppercase">Nombre Completo</label>
                  <input
                    type="text"
                    id="nombre"
                    name="nombre"
                    required
                    value={formData.nombre}
                    onChange={handleChange}
                    placeholder="Ej. Mateo Gómez"
                    className="w-full px-4 py-3 bg-[#FFF9F5] border border-[#122C9B]/20 rounded-lg text-sm text-[#122C9B] focus:outline-none focus:border-[#FFA42C] transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="email" className="block text-xs font-bold text-[#122C9B] font-mono uppercase">Correo Electrónico</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Ej. mateo@gmail.com"
                    className="w-full px-4 py-3 bg-[#FFF9F5] border border-[#122C9B]/20 rounded-lg text-sm text-[#122C9B] focus:outline-none focus:border-[#FFA42C] transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="asunto" className="block text-xs font-bold text-[#122C9B] font-mono uppercase">Asunto o Categoría</label>
                <input
                  type="text"
                  id="asunto"
                  name="asunto"
                  required
                  value={formData.asunto}
                  onChange={handleChange}
                  placeholder="Ej. Cotización de Café Mayorista"
                  className="w-full px-4 py-3 bg-[#FFF9F5] border border-[#122C9B]/20 rounded-lg text-sm text-[#122C9B] focus:outline-none focus:border-[#FFA42C] transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="mensaje" className="block text-xs font-bold text-[#122C9B] font-mono uppercase">Detalles del Mensaje</label>
                <textarea
                  id="mensaje"
                  name="mensaje"
                  rows={4}
                  required
                  value={formData.mensaje}
                  onChange={handleChange}
                  placeholder="Describe con libertad tu consulta o solicitud..."
                  className="w-full px-4 py-3 bg-[#FFF9F5] border border-[#122C9B]/20 rounded-lg text-sm text-[#122C9B] resize-none focus:outline-none focus:border-[#FFA42C] transition-colors"
                />
              </div>

              {error && (
                <p className="text-xs text-rose-600 font-semibold font-mono">
                  ⚠️ {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-[#122C9B] border border-[#122C9B] hover:bg-[#FFA42C] text-white text-sm font-bold rounded-lg transition-all shadow-md mt-4 cursor-pointer"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-[#FFF9F5] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Enviar Mensaje Seguro</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

      </div>

    </div>
  );
}
