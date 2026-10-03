import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X, CheckCircle2, Users, Phone, Mail, User, MessageSquare } from 'lucide-react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isBefore,
  startOfToday
} from 'date-fns';
import { es } from 'date-fns/locale';

interface BookingCalendarProps {
  tipo: 'academia' | 'estadia';
  itemId: string;
  itemNombre: string;
  itemSlug: string;
  whatsappNumber?: string;
  maxPeople?: number;
}

export default function BookingCalendar({
  tipo,
  itemId,
  itemNombre,
  itemSlug,
  whatsappNumber = '573157307016',
  maxPeople = 10
}: BookingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [occupiedDates, setOccupiedDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [occupiedLoading, setOccupiedLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    cantidad_personas: 1,
    notas: ''
  });

  const today = startOfToday();

  useEffect(() => {
    fetchOccupiedDates();
  }, [tipo, itemId]);

  const fetchOccupiedDates = async () => {
    try {
      setOccupiedLoading(true);
      const res = await axios.get(`/api/reservas/ocupadas?tipo=${tipo}&item_id=${itemId}`);
      setOccupiedDates(res.data.dates || []);
    } catch (err) {
      console.error('Error fetching occupied dates:', err);
      setOccupiedDates([]);
    } finally {
      setOccupiedLoading(false);
    }
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const isDateDisabled = (date: Date) => {
    if (isBefore(date, today)) return true;
    const dateStr = format(date, 'yyyy-MM-dd');
    return occupiedDates.includes(dateStr);
  };

  const isDateOccupied = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return occupiedDates.includes(dateStr);
  };

  const handleDateClick = (date: Date) => {
    if (isDateDisabled(date)) return;
    setSelectedDate(date);
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) return;

    setLoading(true);
    try {
      const fecha = format(selectedDate, 'yyyy-MM-dd');
      await axios.post('/api/reservas', {
        tipo,
        item_id: itemId,
        item_nombre: itemNombre,
        item_slug: itemSlug,
        fecha,
        nombre: formData.nombre,
        email: formData.email,
        telefono: formData.telefono,
        cantidad_personas: Number(formData.cantidad_personas),
        notas: formData.notas
      });

      setSuccess(true);
      fetchOccupiedDates();

      // Open WhatsApp with pre-filled message
      const message = encodeURIComponent(
        `Hola, soy ${formData.nombre}. Quiero separar una fecha para ${itemNombre} (${tipo}) el ${fecha}. ` +
        `Somos ${formData.cantidad_personas} persona(s). Mi teléfono es ${formData.telefono} y mi correo ${formData.email}.`
      );
      window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al enviar la solicitud. Intente de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedDate(null);
    setSuccess(false);
    setFormData({
      nombre: '',
      email: '',
      telefono: '',
      cantidad_personas: 1,
      notas: ''
    });
  };

  return (
    <div className="bg-white border border-[#122C9B]/10 rounded-2xl p-4 sm:p-6 shadow-sm">
      {/* flex-wrap: en pantallas angostas el selector de mes baja a su propia línea en vez de desbordar */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 mb-6">
        <h3 className="font-display text-base sm:text-lg font-bold text-[#122C9B] flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-[#FFA42C]" />
          <span>Selecciona una fecha</span>
        </h3>
        <div className="flex items-center gap-1 sm:gap-2 ml-auto">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 hover:bg-[#FFF9F5] rounded-lg transition-colors text-[#122C9B]"
            aria-label="Mes anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-bold text-[#122C9B] min-w-[7rem] text-center capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: es })}
          </span>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 hover:bg-[#FFF9F5] rounded-lg transition-colors text-[#122C9B]"
            aria-label="Mes siguiente"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {occupiedLoading && (
        <div className="flex justify-center py-4">
          <div className="w-6 h-6 border-2 border-[#FFA42C] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
          <div key={day} className="text-center text-xs font-bold text-[#122C9B]/60 uppercase py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((date, idx) => {
          const disabled = isDateDisabled(date);
          const occupied = isDateOccupied(date);
          const selected = selectedDate && isSameDay(date, selectedDate);
          const currentMonthDay = isSameMonth(date, currentMonth);

          return (
            <button
              key={idx}
              onClick={() => handleDateClick(date)}
              disabled={disabled || !currentMonthDay}
              className={`
                aspect-square rounded-xl text-sm font-semibold transition-all relative
                ${!currentMonthDay ? 'text-transparent bg-transparent cursor-default' : ''}
                ${currentMonthDay && disabled && !occupied ? 'text-[#122C9B]/30 bg-[#122C9B]/5 cursor-not-allowed' : ''}
                ${occupied ? 'bg-rose-100 text-rose-600 cursor-not-allowed line-through' : ''}
                ${currentMonthDay && !disabled && !selected ? 'text-[#122C9B] hover:bg-[#FFA42C]/10 hover:text-[#FFA42C]' : ''}
                ${selected ? 'bg-[#122C9B] text-white shadow-lg' : ''}
              `}
            >
              {currentMonthDay && format(date, 'd')}
              {occupied && currentMonthDay && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-rose-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mt-4 text-xs text-[#122C9B]/60">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-[#122C9B]" />
          <span>Seleccionada</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-rose-100 border border-rose-200" />
          <span>No disponible</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-[#122C9B]/5" />
          <span>Pasada</span>
        </div>
      </div>

      {/* Booking Modal */}
      {selectedDate && (
        <div className="fixed inset-0 bg-[#122C9B]/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-scaleUp">
            <div className="bg-[#122C9B] text-white p-5 flex items-center justify-between">
              <div>
                <h4 className="font-display text-lg font-extrabold">Separar fecha</h4>
                <p className="text-xs text-white/70">
                  {itemNombre} — {format(selectedDate, "d 'de' MMMM yyyy", { locale: es })}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 max-h-[80vh] overflow-y-auto">
              {success ? (
                <div className="text-center space-y-4 py-4">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h5 className="font-display text-lg font-bold text-[#122C9B]">¡Solicitud enviada!</h5>
                  <p className="text-sm text-[#122C9B]/60 font-light">
                    Hemos guardado tu solicitud y te hemos redirigido a WhatsApp. Un asesor te confirmará disponibilidad muy pronto.
                  </p>
                  <button
                    onClick={closeModal}
                    className="px-6 py-2.5 bg-[#122C9B] hover:bg-[#FFA42C] text-white text-sm font-bold rounded-xl transition-colors"
                  >
                    Cerrar
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="p-3 bg-[#FFA42C]/10 border border-[#FFA42C]/20 rounded-xl text-xs text-[#122C9B]">
                    <p className="font-semibold">Importante:</p>
                    <p className="text-[#122C9B]/70">
                      Al enviar, se guardará tu solicitud y se abrirá WhatsApp para que un asesor humano confirme tu separación.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#122C9B] font-mono uppercase flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" /> Nombre completo
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      className="w-full px-3 py-2.5 bg-[#FFF9F5] border border-[#122C9B]/20 rounded-lg text-sm text-[#122C9B] focus:outline-none focus:border-[#FFA42C]"
                      placeholder="Ej. María Gómez"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#122C9B] font-mono uppercase flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" /> Correo electrónico
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2.5 bg-[#FFF9F5] border border-[#122C9B]/20 rounded-lg text-sm text-[#122C9B] focus:outline-none focus:border-[#FFA42C]"
                      placeholder="Ej. maria@email.com"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#122C9B] font-mono uppercase flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" /> Teléfono
                      </label>
                      <input
                        type="tel"
                        required
                        value={formData.telefono}
                        onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                        className="w-full px-3 py-2.5 bg-[#FFF9F5] border border-[#122C9B]/20 rounded-lg text-sm text-[#122C9B] focus:outline-none focus:border-[#FFA42C]"
                        placeholder="Ej. 3157307016"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#122C9B] font-mono uppercase flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" /> Personas
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={maxPeople}
                        required
                        value={formData.cantidad_personas}
                        onChange={(e) => setFormData({ ...formData, cantidad_personas: Number(e.target.value) })}
                        className="w-full px-3 py-2.5 bg-[#FFF9F5] border border-[#122C9B]/20 rounded-lg text-sm text-[#122C9B] focus:outline-none focus:border-[#FFA42C]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#122C9B] font-mono uppercase flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" /> Notas adicionales
                    </label>
                    <textarea
                      rows={3}
                      value={formData.notas}
                      onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                      className="w-full px-3 py-2.5 bg-[#FFF9F5] border border-[#122C9B]/20 rounded-lg text-sm text-[#122C9B] resize-none focus:outline-none focus:border-[#FFA42C]"
                      placeholder="¿Alguna necesidad especial?"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-[#122C9B] hover:bg-[#FFA42C] text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <MessageSquare className="w-4 h-4" />
                        <span>Enviar solicitud y abrir WhatsApp</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
