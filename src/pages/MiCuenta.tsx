import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store';
import { useNavigate } from 'react-router-dom';
import { User, ClipboardList, PenTool, KeyRound, Calendar, ShoppingBag, MapPin, Eye, AlertTriangle } from 'lucide-react';
import { Order } from '../types';
import axios from 'axios';

export default function MiCuenta() {
  const { user, updateProfile, changePassword } = useAuthStore();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'pedidos' | 'experiencias' | 'perfil'>('pedidos');
  const [loading, setLoading] = useState(true);

  // Edit fields
  const [nombre, setNombre] = useState(user?.nombre || '');
  const [apellido, setApellido] = useState(user?.apellido || '');
  const [telefono, setTelefono] = useState(user?.telefono || '');
  const [profileMsg, setProfileMsg] = useState<{ type: 'ok' | 'err', text: string } | null>(null);

  // Change password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'ok' | 'err', text: string } | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth/login?returnUrl=/mi-cuenta');
      return;
    }

    setLoading(true);
    // Dynamic endpoints retrieval
    axios.get('/api/ordenes')
      .then(res => {
        setOrders(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching dashboard orders lists', err);
        setLoading(false);
      });
  }, [user, navigate]);

  const handleUpdateProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    try {
      await updateProfile({ nombre, apellido, telefono });
      setProfileMsg({ type: 'ok', text: '✓ Perfil actualizado exitosamente.' });
    } catch (err: any) {
      setProfileMsg({ type: 'err', text: err.message || 'Error actualizando el perfil.' });
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword !== confirmNewPassword) {
      setPasswordMsg({ type: 'err', text: 'Las contraseñas nuevas no coinciden.' });
      return;
    }

    setChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordMsg({ type: 'ok', text: '✓ Contraseña actualizada exitosamente.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      setPasswordMsg({ type: 'err', text: err.message || 'Error cambiando la contraseña.' });
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-10 h-10 border-4 border-amber-800 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-stone-500 text-sm">Cargando bitácora del cliente...</p>
      </div>
    );
  }

  return (
    <div id="account-portal-view" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Editorial Profile Frame */}
      <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6 md:p-8">
        <div className="flex items-center gap-5">
          <span className="w-14 h-14 bg-[#122C9B] text-[#FFA42C] rounded-2xl flex items-center justify-center font-display text-2xl font-black">
            {user?.nombre?.[0]?.toUpperCase()}
          </span>
          <div className="space-y-1">
            <h1 className="font-display text-2xl font-black text-stone-900 leading-none">Mi Cuenta Jaguar</h1>
            <p className="text-xs text-stone-500 font-light mt-0.5">Cliente desde: {user ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</p>
          </div>
        </div>

        <div className="flex gap-2">
          {user?.rol === 'admin' && (
            <button
              onClick={() => navigate('/admin')}
              className="px-4 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold rounded-xl transition duration-200 cursor-pointer"
            >
              🔐 Entrar a Consola Administrativa
            </button>
          )}
        </div>
      </div>

      {/* Row Tab selectors */}
      <div className="flex border-b border-stone-200 gap-6 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('pedidos')}
          className={`pb-3 text-sm font-semibold tracking-wide border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'pedidos' ? 'border-[#122C9B] text-[#122C9B] font-extrabold' : 'border-transparent text-stone-500 hover:text-[#122C9B]'
          }`}
        >
          🛒 Historial de Pedidos ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab('experiencias')}
          className={`pb-3 text-sm font-semibold tracking-wide border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'experiencias' ? 'border-[#122C9B] text-[#122C9B] font-extrabold' : 'border-transparent text-stone-500 hover:text-[#122C9B]'
          }`}
        >
          🎫 Mis Talleres & Catas
        </button>
        <button
          onClick={() => setActiveTab('perfil')}
          className={`pb-3 text-sm font-semibold tracking-wide border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'perfil' ? 'border-[#122C9B] text-[#122C9B] font-extrabold' : 'border-transparent text-stone-500 hover:text-[#122C9B]'
          }`}
        >
          👤 Editar Datos del Perfil
        </button>
      </div>

      {/* Sub tabs execution panel */}
      <div className="space-y-6">
        
        {/* TAB 1: HISTORIAL DE PEDIDOS */}
        {activeTab === 'pedidos' && (
          orders.length === 0 ? (
            <div className="text-center py-16 bg-white border border-stone-200 rounded-3xl space-y-4">
              <ClipboardList className="w-8 h-8 text-stone-300 mx-auto" />
              <p className="text-sm text-stone-500 font-light">Usted todavía no cuenta con transacciones de e-commerce registradas.</p>
              <button onClick={() => navigate('/tienda')} className="px-5 py-2.5 bg-amber-900 text-[#FAF8F5] rounded-xl text-xs font-semibold">
                Explorar el Catálogo
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.map((ord) => (
                <div
                  key={ord.id}
                  className="bg-white border border-stone-200 hover:border-stone-300 rounded-2xl p-6 shadow-sm divide-y divide-stone-150 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-stone-400 font-mono tracking-wider">Identificador Referencia</span>
                      <h3 className="font-display text-sm font-bold text-stone-900 mt-0.5">{ord.id}</h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase ${
                        ord.estado === 'pagado'
                          ? 'bg-emerald-50 text-emerald-800'
                          : ord.estado === 'pendiente'
                          ? 'bg-amber-50 text-amber-800'
                          : ord.estado === 'cancelado'
                          ? 'bg-rose-50 text-rose-800'
                          : 'bg-indigo-50 text-[#1E1B4B]'
                      }`}>
                        {ord.estado}
                      </span>
                      
                      <button
                        onClick={() => navigate(`/checkout/confirmacion?ref=${ord.id}`)}
                        className="px-3 py-1 bg-stone-50 border border-stone-250 hover:bg-stone-105 text-stone-750 text-[10px] font-mono font-bold rounded"
                      >
                        Ver Factura Completa
                      </button>
                    </div>
                  </div>

                  {/* Items quick outline */}
                  <div className="space-y-3 py-4 text-xs select-none">
                    <h4 className="text-[10px] font-bold font-mono uppercase text-stone-400">Resumen del Pedido</h4>
                    <ul className="space-y-2 text-stone-605">
                      {ord.items.map((it, idx) => (
                        <li key={idx} className="flex justify-between items-center bg-stone-50 px-3 py-2 rounded-lg">
                          <span>x{it.cantidad} {it.nombre}</span>
                          <span className="font-mono text-stone-5a0">${(it.precio_unit * it.cantidad).toLocaleString('es-CO')} COP</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center text-xs">
                    <span className="text-stone-400 font-mono">
                      Fecha: {new Date(ord.created_at).toLocaleString('es-CO')}
                    </span>
                    <span className="font-sans text-[#1C1917] font-extrabold text-sm">
                      Total Pagado: ${ord.total.toLocaleString('es-CO')} COP
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* TAB 2: TALLERES & RESERVAS SIMULATOR */}
        {activeTab === 'experiencias' && (
          <div className="space-y-6">
            <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm p-4 text-left space-y-4">
              <h3 className="font-display font-bold text-[#1C1917]">Reservaciones en Booking.com Experiences</h3>
              <p className="text-xs text-stone-510 leading-relaxed font-light">
                Recuerda que todas las reservas físicas a nuestra Cata Sensorial o Taller de Barismo son cursadas mediante Booking. Puedes ver los detalles aquí:
              </p>

              <div className="divide-y divide-stone-100 divide-dashed">
                <div className="py-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 text-xs font-light">
                  <div className="space-y-1">
                    <span className="font-bold text-stone-900 block font-display">Taller Práctico de Barismo Cafetero</span>
                    <p className="text-stone-410 font-mono">ID Booking: BK-987-1234</p>
                  </div>
                  <div className="text-right sm:text-left">
                    <span className="text-emerald-700 font-semibold font-mono block">Confirmado Oficial</span>
                    <span className="text-stone-400 text-[10px]">Asistencia: Sábado 30 de Mayo</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: MI PERFIL CLIENTE */}
        {activeTab === 'perfil' && (
          <div className="bg-white border border-stone-200 rounded-3xl p-8 shadow-sm">
            <h2 className="font-display text-xl font-bold text-stone-900 border-b border-stone-100 pb-3 flex items-center gap-2">
              <PenTool className="w-5 h-5 text-[#FFA42C]" />
              <span>Editar Datos Generales</span>
            </h2>

            <form onSubmit={handleUpdateProfileSubmit} className="space-y-5 pt-6 max-w-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-stone-700 font-mono uppercase">Primer Nombre</label>
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg text-sm text-stone-900 font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-stone-700 font-mono uppercase">Apellidos</label>
                  <input
                    type="text"
                    required
                    value={apellido}
                    onChange={(e) => setApellido(e.target.value)}
                    className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg text-sm text-stone-900 font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-stone-700 font-mono uppercase font-semibold text-stone-400">Correo Electrónico (No modificable)</label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full px-4 py-2 bg-stone-100 border border-stone-200 rounded-lg text-sm text-stone-400 font-mono font-medium cursor-not-allowed"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-stone-700 font-mono uppercase">Móvil de Contacto</label>
                <input
                  type="text"
                  required
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg text-sm text-stone-900"
                />
              </div>

              {profileMsg && (
                <div className={`p-3 rounded-lg text-xs font-medium font-mono border ${
                  profileMsg.type === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}>
                  {profileMsg.text}
                </div>
              )}

              <button
                type="submit"
                className="px-6 py-3 bg-[#122C9B] hover:bg-[#FFA42C] border border-stone-950 text-white text-xs font-semibold rounded-xl cursor-pointer"
              >
                Actualizar Mis Datos
              </button>
            </form>

            <h2 className="font-display text-xl font-bold text-stone-900 border-b border-stone-100 pb-3 pt-10 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-[#FFA42C]" />
              <span>Cambiar Contraseña</span>
            </h2>

            <form onSubmit={handleChangePasswordSubmit} className="space-y-5 pt-6 max-w-lg">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-stone-700 font-mono uppercase">Contraseña Actual</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg text-sm text-stone-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-stone-700 font-mono uppercase">Nueva Contraseña</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg text-sm text-stone-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-stone-700 font-mono uppercase">Confirmar Nueva</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="w-full px-4 py-2 bg-stone-50 border border-stone-300 rounded-lg text-sm text-stone-900"
                  />
                </div>
              </div>

              {passwordMsg && (
                <div className={`p-3 rounded-lg text-xs font-medium font-mono border flex items-start gap-2 ${
                  passwordMsg.type === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}>
                  {passwordMsg.type === 'err' && <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
                  <span>{passwordMsg.text}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={changingPassword}
                className="px-6 py-3 bg-[#122C9B] hover:bg-[#FFA42C] border border-stone-950 text-white text-xs font-semibold rounded-xl cursor-pointer"
              >
                {changingPassword ? 'Actualizando...' : 'Cambiar Contraseña'}
              </button>
            </form>
          </div>
        )}

      </div>

    </div>
  );
}
