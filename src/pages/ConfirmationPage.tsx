import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, Clock, XCircle, ShieldCheck, Printer, FileText, MapPin, Eye, RefreshCw } from 'lucide-react';
import { Order } from '../types';
import { useCartStore } from '../store';
import axios from 'axios';

const POLL_INTERVAL_MS = 3000;
const POLL_MAX_MS = 60000;

/**
 * Página de retorno de Checkout Pro (back_urls). Mercado Pago agrega ?payment_id=&status=...
 * a la URL, pero esos parámetros los puede escribir cualquiera: aquí solo sirven para pedirle al
 * backend que verifique ese pago y para el texto provisional. Lo que se muestra como resultado
 * sale siempre del `estado` de la orden en el servidor.
 */
export default function ConfirmationPage() {
  const [searchParams] = useSearchParams();
  const ref = searchParams.get('ref');
  const paymentId = searchParams.get('payment_id');
  const mpStatus = searchParams.get('status') || searchParams.get('collection_status');
  const { clearCart } = useCartStore();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const startedAt = useRef(Date.now());

  const fetchOrder = async (): Promise<Order | null> => {
    try {
      const res = await axios.get(`/api/ordenes/${encodeURIComponent(ref!)}`);
      setOrder(res.data);
      return res.data;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (!ref) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      const current = await fetchOrder();
      if (cancelled) return;
      const stillWaiting = current?.estado === 'pendiente' && mpStatus !== 'rejected' && mpStatus !== 'null';
      if (stillWaiting && Date.now() - startedAt.current < POLL_MAX_MS) {
        setPolling(true);
        timer = setTimeout(poll, POLL_INTERVAL_MS);
      } else {
        setPolling(false);
      }
    };

    (async () => {
      // Si Mercado Pago devolvió un payment_id, el backend lo consulta y lo aplica a la orden
      // sin esperar al webhook (que puede tardar o, con credenciales de prueba, no llegar).
      if (paymentId && /^\d+$/.test(paymentId)) {
        await axios.post(`/api/ordenes/${encodeURIComponent(ref)}/verificar-pago`, { payment_id: paymentId }).catch(() => undefined);
      }
      await poll();
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [ref, paymentId]);

  // El carrito se vacía solo cuando la compra quedó registrada (pagada o en proceso de pago).
  // Si el pago fue rechazado se conserva para que el comprador pueda reintentar.
  useEffect(() => {
    if (!order) return;
    const rejected = mpStatus === 'rejected' && order.estado === 'pendiente';
    if (order.estado !== 'cancelado' && !rejected) clearCart();
  }, [order?.estado]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-10 h-10 border-4 border-amber-800 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-stone-500 text-sm">Confirmando tu pago con Mercado Pago...</p>
      </div>
    );
  }

  if (!ref || !order) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-6">
        <h2 className="font-display text-2xl font-bold text-stone-900">Referencia No Encontrada</h2>
        <p className="text-sm text-stone-500 font-light leading-relaxed">
          No pudimos localizar un registro de orden asociado a esta confirmación. Si acabas de pagar, revisa tus pedidos en unos minutos.
        </p>
        <Link to="/mi-cuenta" className="inline-block px-5 py-2.5 bg-stone-900 text-white rounded-lg text-xs font-semibold">
          Ir a Mi Cuenta
        </Link>
      </div>
    );
  }

  const isPaid = order.estado === 'pagado' || order.estado === 'enviado' || order.estado === 'entregado';
  const isRejected = order.estado === 'cancelado' || (order.estado === 'pendiente' && mpStatus === 'rejected');

  return (
    <div id="confirmation-view" className="max-w-3xl mx-auto px-4 py-12 space-y-10">

      {/* 1. Resultado del pago (según el estado de la orden en el servidor) */}
      <div className="bg-white border border-stone-200 rounded-3xl p-8 shadow-sm text-center space-y-5">
        {isPaid ? (
          <>
            <span className="p-4 bg-emerald-50 text-emerald-600 rounded-full inline-block animate-pulse">
              <CheckCircle2 className="w-12 h-12" />
            </span>
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-emerald-800 font-mono tracking-widest bg-emerald-100/60 px-3 py-1 rounded-full">
                Pago Aprobado
              </span>
              <h1 className="font-display text-3xl font-black text-stone-900 leading-tight">
                ¡Gracias por tu compra!
              </h1>
              <p className="text-sm text-stone-500 font-light max-w-sm mx-auto">
                Recibimos tu pago a través de Mercado Pago. Te avisaremos cuando despachemos tu café.
              </p>
            </div>
          </>
        ) : isRejected ? (
          <>
            <span className="p-4 bg-red-50 text-red-600 rounded-full inline-block">
              <XCircle className="w-12 h-12" />
            </span>
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-red-800 font-mono tracking-widest bg-red-100/60 px-3 py-1 rounded-full">
                Pago No Aprobado
              </span>
              <h1 className="font-display text-3xl font-black text-stone-900 leading-tight">
                No pudimos confirmar tu pago
              </h1>
              <p className="text-sm text-stone-500 font-light max-w-sm mx-auto">
                Mercado Pago no aprobó la transacción y no se realizó ningún cobro. Puedes intentarlo de nuevo con otro medio de pago.
              </p>
            </div>
          </>
        ) : (
          <>
            <span className="p-4 bg-amber-50 text-amber-600 rounded-full inline-block">
              <Clock className="w-12 h-12" />
            </span>
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-amber-800 font-mono tracking-widest bg-amber-100/60 px-3 py-1 rounded-full">
                Pago en Proceso
              </span>
              <h1 className="font-display text-3xl font-black text-stone-900 leading-tight">
                Estamos esperando la confirmación
              </h1>
              <p className="text-sm text-stone-500 font-light max-w-md mx-auto">
                {polling
                  ? 'Consultando el estado de tu pago con Mercado Pago...'
                  : 'Si pagaste por PSE, tu banco puede tardar unos minutos en confirmar. Si elegiste pagar en efectivo (Efecty), la orden se confirmará cuando pagues el cupón. Te avisaremos apenas se acredite.'}
              </p>
            </div>
          </>
        )}

        <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
          {isRejected ? (
            <Link
              to="/checkout"
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-stone-900 hover:bg-stone-850 text-white rounded-xl text-xs font-semibold transition"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Intentar de Nuevo</span>
            </Link>
          ) : (
            <Link
              to="/mi-cuenta"
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-stone-900 hover:bg-stone-850 text-white rounded-xl text-xs font-semibold transition"
            >
              <Eye className="w-4 h-4" />
              <span>Ver Mis Pedidos</span>
            </Link>
          )}
          {!isPaid && !isRejected && !polling && (
            <button
              onClick={() => { startedAt.current = Date.now(); fetchOrder(); }}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 rounded-xl text-xs font-semibold"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Actualizar Estado</span>
            </button>
          )}
          {isPaid && (
            <button
              onClick={() => window.print()}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 rounded-xl text-xs font-semibold"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Factura</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Detalle del pedido */}
      <div className="bg-white border border-stone-200 rounded-3xl p-8 shadow-sm space-y-6">
        <div className="flex justify-between items-center border-b border-stone-150 pb-4">
          <div className="space-y-1">
            <span className="text-xs text-stone-400 font-mono uppercase">Detalles del Recibo</span>
            <h3 className="font-display font-black text-lg text-stone-950">
              Referencia: {order.id}
            </h3>
          </div>
          <span className={`px-3.5 py-1.5 font-mono font-bold text-xs rounded-lg uppercase ${
            isPaid ? 'bg-emerald-50 text-emerald-850' : isRejected ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-800'
          }`}>
            Estado: {order.estado.toUpperCase()}
          </span>
        </div>

        <div className="space-y-4">
          <h4 className="text-[10px] font-bold font-mono uppercase text-stone-400 tracking-wider flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" />
            <span>Items del Pedido</span>
          </h4>
          <div className="divide-y divide-stone-150 space-y-3.5">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-xs pt-3.5 first:pt-0">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-stone-105 border border-stone-205 text-stone-800 font-bold font-mono rounded">
                    x{item.cantidad}
                  </span>
                  <span className="font-semibold text-stone-900">{item.nombre}</span>
                </div>
                <span className="font-mono text-stone-500">
                  ${(item.precio_unit * item.cantidad).toLocaleString('es-CO')} COP
                </span>
              </div>
            ))}
          </div>
        </div>

        <hr className="border-stone-150" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs font-light">
          <div className="space-y-2">
            <h4 className="text-[10px] font-bold font-mono uppercase text-[#44403C] tracking-wider flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>Lugar de Envío</span>
            </h4>
            <div className="text-stone-500 space-y-1">
              <p className="font-semibold text-stone-900">{order.direccion_envio.direccion}</p>
              <p>{order.direccion_envio.ciudad}, {order.direccion_envio.departamento}</p>
              <p>Móvil: {order.direccion_envio.telefono}</p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-[10px] font-bold font-mono uppercase text-[#44403C] tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Transacción Mercado Pago</span>
            </h4>
            <div className="text-stone-400 space-y-1 font-mono">
              <p className="text-stone-700">ID de pago: {order.payment_id || 'pendiente'}</p>
              <p>Fecha: {new Date(order.created_at).toLocaleString('es-CO')}</p>
            </div>
          </div>
        </div>

        <hr className="border-stone-150" />

        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold text-stone-800">{isPaid ? 'Total Pagado' : 'Total del Pedido'}</span>
          <span className="text-2xl font-black text-stone-950 font-sans">
            ${order.total.toLocaleString('es-CO')} <span className="text-xs text-stone-500 font-normal font-mono">COP</span>
          </span>
        </div>
      </div>

    </div>
  );
}
