import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCartStore, useAuthStore } from '../store';
import { CreditCard, MapPin, ClipboardList, ArrowLeft, Phone } from 'lucide-react';
import axios from 'axios';

declare global {
  interface Window {
    WidgetCheckout?: new (options: Record<string, unknown>) => { open: (callback: (result: any) => void) => void };
  }
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { items, total, clearCart } = useCartStore();

  const [address, setAddress] = useState({
    direccion: '',
    ciudad: 'Bogotá',
    departamento: 'Cundinamarca',
    telefono: user?.telefono || ''
  });
  const [notas, setNotas] = useState('');
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Colombian departments and cities
  const departamentos = [
    'Antioquia', 'Cundinamarca', 'Valle del Cauca', 'Atlántico', 'Quindío', 'Risaralda', 'Caldas', 'Huila', 'Santander'
  ];

  if (items.length === 0) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-4">
        <h2 className="font-display text-xl font-bold">No hay artículos para pagar</h2>
        <button onClick={() => navigate('/tienda')} className="px-4 py-2 bg-stone-900 text-white rounded-lg">
          Dirigirse a la Tienda
        </button>
      </div>
    );
  }

  const handleOpenWompi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.direccion || !address.telefono) {
      alert('Por favor diligencie su dirección de envío y teléfono de contacto.');
      return;
    }
    if (!privacyAccepted) {
      alert('Debes aceptar la Política de Tratamiento de Datos Personales para continuar con el pago.');
      return;
    }
    if (!window.WidgetCheckout) {
      alert('No se pudo cargar la pasarela de pagos de Wompi. Verifica tu conexión e intenta de nuevo.');
      return;
    }

    setLoading(true);
    try {
      // 1. Pide al backend la referencia + firma de integridad (nunca se calcula en el cliente)
      const prepRes = await axios.post('/api/ordenes/preparar-pago', { total });
      const { reference, signature, amount, currency, publicKey } = prepRes.data;

      // 2. Crea la orden como 'pendiente' ANTES de abrir el widget: algunos medios de pago
      // (PSE, transferencias) redirigen el navegador directo a redirectUrl sin pasar por el
      // callback de abajo, así que la orden debe existir de antemano para esa ruta también.
      const checkoutItems = items.map(item => ({
        product_id: item.product_id,
        nombre: item.product?.nombre || 'Producto',
        precio_unit: item.product?.precio || 0,
        cantidad: item.cantidad
      }));

      await axios.post('/api/ordenes/checkout', {
        reference,
        items: checkoutItems,
        total,
        direccion_envio: address,
        notas
      });

      // 3. Abre el Widget real de Wompi — el estado final de la orden ('pagado') lo
      // confirma el webhook server-to-server (/api/ordenes/wompi-webhook), nunca este callback.
      const checkout = new window.WidgetCheckout({
        currency,
        amountInCents: amount,
        reference,
        publicKey,
        signature: { integrity: signature },
        redirectUrl: `${window.location.origin}/checkout/confirmacion?ref=${reference}`,
        customerData: {
          email: user?.email,
          fullName: user ? `${user.nombre} ${user.apellido}` : undefined,
          phoneNumber: address.telefono,
          phoneNumberPrefix: '+57',
        },
        shippingAddress: {
          addressLine1: address.direccion,
          city: address.ciudad,
          region: address.departamento,
          country: 'CO',
          phoneNumber: address.telefono,
        },
      });

      clearCart();
      checkout.open((result: any) => {
        setLoading(false);
        if (result?.transaction) {
          navigate(`/checkout/confirmacion?ref=${reference}`);
        }
        // Si el cliente cierra el widget sin completar el pago, la orden queda 'pendiente'
        // y puede retomarla o contactarnos con la referencia.
      });
    } catch (err: any) {
      setLoading(false);
      console.error(err);
      alert('Error iniciando el pago con Wompi: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div id="checkout-view" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      
      {/* Visual Navigation Bar */}
      <div>
        <button
          onClick={() => navigate('/carrito')}
          className="inline-flex items-center gap-2 text-sm font-semibold text-stone-500 hover:text-[#1C1917] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Carrito</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        
        {/* Left Hand: Delivery Address Formulation (7 Columns) */}
        <form onSubmit={handleOpenWompi} className="lg:col-span-7 bg-white border border-stone-200 rounded-3xl p-8 shadow-sm space-y-6">
          <h2 className="font-display text-2xl font-bold text-stone-900 border-b border-stone-100 pb-3 flex items-center gap-2.5">
            <MapPin className="w-6 h-6 text-[#FFA42C]" />
            <span>Detalles del Despacho</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-stone-700 font-mono uppercase">Departamento</label>
              <select
                value={address.departamento}
                onChange={(e) => setAddress({ ...address, departamento: e.target.value })}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-300 rounded-lg text-sm text-stone-900 font-medium"
              >
                {departamentos.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-stone-700 font-mono uppercase">Ciudad / Municipio</label>
              <input
                type="text"
                required
                value={address.ciudad}
                onChange={(e) => setAddress({ ...address, ciudad: e.target.value })}
                placeholder="Ej. Medellín, Bogotá"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-300 rounded-lg text-sm text-stone-900"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-stone-700 font-mono uppercase">Dirección de Envío Completa</label>
            <input
              type="text"
              required
              value={address.direccion}
              onChange={(e) => setAddress({ ...address, direccion: e.target.value })}
              placeholder="Ej. Calle 10 Sur # 43A - 12 Apt 402"
              className="w-full px-4 py-2.5 bg-stone-50 border border-stone-300 rounded-lg text-sm text-stone-900"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-stone-700 font-mono uppercase">Teléfono de Entrega</label>
            <div className="relative">
              <input
                type="text"
                required
                value={address.telefono}
                onChange={(e) => setAddress({ ...address, telefono: e.target.value })}
                placeholder="+57 321 456 7890"
                className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-300 rounded-lg text-sm text-stone-900"
              />
              <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-stone-400" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-stone-700 font-mono uppercase">Notas o Instrucciones para la cocina / transportador (Opcional)</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Ej. Dejar en portería, moler bien fino para expreso..."
              rows={3}
              className="w-full px-4 py-2.5 bg-stone-50 border border-stone-300 rounded-lg text-sm text-stone-900 resize-none"
            />
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              required
              checked={privacyAccepted}
              onChange={(e) => setPrivacyAccepted(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-stone-300 text-[#122C9B] focus:ring-[#FFA42C] cursor-pointer"
            />
            <span className="text-[11px] text-stone-600 font-light leading-relaxed">
              Acepto la{' '}
              <Link to="/privacidad" target="_blank" className="font-bold text-[#FFA42C] hover:text-[#3D5FC9] underline underline-offset-2">
                Política de Tratamiento de Datos Personales
              </Link>{' '}
              y autorizo el tratamiento de mis datos de envío y contacto para procesar este pedido.
            </span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#122C9B] border border-[#122C9B] hover:bg-[#FFA42C] text-white text-sm font-bold rounded-lg cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <CreditCard className="w-4 h-4" />
            )}
            <span>{loading ? 'Abriendo pasarela de pago...' : 'Pagar con Wompi'}</span>
          </button>
        </form>

        {/* Right Hand: Facturation Overviews (5 Columns) */}
        <div className="lg:col-span-5 bg-[#FFF9F5] border border-stone-200 rounded-3xl p-6 shadow-sm space-y-6">
          <h3 className="font-display text-lg font-bold text-stone-900 border-b border-stone-150 pb-2 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-[#FFA42C]" />
            <span>Resumen del Café</span>
          </h3>

          {/* Cart review scroll-panel */}
          <div className="space-y-4 max-h-72 overflow-y-auto pr-2">
            {items.map((item) => (
              <div key={item.product_id} className="flex items-center justify-between text-xs gap-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 bg-stone-200 text-stone-800 text-[10px] font-bold font-mono rounded flex items-center justify-center">
                    {item.cantidad}
                  </span>
                  <span className="font-semibold text-stone-900 truncate max-w-[160px] md:max-w-xs block">
                    {item.product?.nombre}
                  </span>
                </div>
                <span className="font-mono text-stone-605">
                  ${((item.product?.precio || 0) * item.cantidad).toLocaleString('es-CO')} COP
                </span>
              </div>
            ))}
          </div>

          <hr className="border-stone-200" />

          {/* Totals timeline */}
          <div className="space-y-3.5 text-xs">
            <div className="flex justify-between text-stone-500 font-light">
              <span>Subtotal del Carrito</span>
              <span className="font-mono">${total.toLocaleString('es-CO')} COP</span>
            </div>
            <div className="flex justify-between text-stone-500 font-light">
              <span>Envio Express</span>
              <span className="text-emerald-600 font-bold font-mono">GRATUITO</span>
            </div>
            <div className="flex justify-between text-stone-900 font-bold text-sm">
              <span>Monto Total a Pagar</span>
              <span className="font-sans text-base font-extrabold">${total.toLocaleString('es-CO')} COP</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
