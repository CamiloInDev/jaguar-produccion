import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCartStore, useAuthStore } from '../store';
import { Trash2, ShoppingCart, ArrowRight, ShieldCheck, CornerUpLeft } from 'lucide-react';

export default function CartPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { items, total, updateQuantity, removeFromCart } = useCartStore();

  const handleCheckoutRedirect = () => {
    if (!user) {
      // Redirect to login with returnUrl pointing back to checkout
      navigate(`/auth/login?returnUrl=/checkout`);
    } else {
      navigate('/checkout');
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-6">
        <span className="p-4 bg-stone-100 text-stone-400 rounded-full inline-block shadow-inner">
          <ShoppingCart className="w-10 h-10 mx-auto" />
        </span>
        <h2 className="font-display text-2xl font-bold text-stone-900">Tu carrito está vacío</h2>
        <p className="text-sm text-stone-500 font-light max-w-sm mx-auto">
          ¿Aún no has elegido tus cosechas predilectas? Revisa la tienda de especialidad para comenzar.
        </p>
        <Link to="/tienda" className="inline-block px-6 py-3 bg-[#122C9B] text-white font-semibold rounded-xl text-sm">
          Ir a la Tienda
        </Link>
      </div>
    );
  }

  return (
    <div id="cart-view" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      
      {/* Editorial Header */}
      <div className="border-b border-stone-200 pb-5">
        <h1 className="font-display text-3xl font-extrabold text-stone-900 tracking-tight flex items-center gap-3">
          <ShoppingCart className="w-8 h-8 text-[#FFA42C]" />
          <span>Carrito de Compra</span>
        </h1>
        <p className="text-sm text-stone-500 mt-1">Revisa y edita los productos de especialidad seleccionados antes de facturar.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        
        {/* Left Column: Items List (8 Columns) */}
        <div className="lg:col-span-8 space-y-4">
          {items.map((item) => {
            if (!item.product) return null;
            const prod = item.product;
            
            return (
              <div
                key={item.product_id}
                className="bg-white border border-stone-200 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4"
              >
                {/* Product Thumbnail & Details */}
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-stone-100 flex-shrink-0 leading-none">
                    <img
                      src={prod.imagen_url}
                      alt={prod.nombre}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div>
                    <Link to={`/tienda/${prod.slug}`} className="font-display text-[#1C1917] font-bold text-sm hover:text-amber-805">
                      {prod.nombre}
                    </Link>
                    <p className="text-[11px] text-stone-400 font-mono mt-1">
                      Origen: {prod.origen} | Tueste: {prod.tueste}
                    </p>
                  </div>
                </div>

                {/* Quantitative controls & Removal */}
                <div className="flex items-center justify-between sm:justify-start gap-8 w-full sm:w-auto">
                  <div className="flex items-center border border-stone-200 rounded-lg overflow-hidden bg-stone-50">
                    <button
                      onClick={() => {
                        try {
                          updateQuantity(item.product_id, item.cantidad - 1);
                        } catch (err: any) {
                          alert(err.message);
                        }
                      }}
                      className="px-2.5 py-1 text-stone-605 text-sm font-bold cursor-pointer hover:bg-stone-100"
                    >
                      -
                    </button>
                    <span className="px-3 py-1 text-xs text-stone-900 font-mono font-bold">
                      {item.cantidad}
                    </span>
                    <button
                      onClick={() => {
                        try {
                          updateQuantity(item.product_id, item.cantidad + 1);
                        } catch (err: any) {
                          alert(err.message);
                        }
                      }}
                      className="px-2.5 py-1 text-stone-605 text-sm font-bold cursor-pointer hover:bg-stone-100"
                    >
                      +
                    </button>
                  </div>

                  {/* Pricing Subtotals */}
                  <div className="text-right flex-shrink-0">
                    <span className="block text-xs text-stone-400 font-mono">Subtotal</span>
                    <span className="text-sm font-extrabold text-stone-900">
                      ${(prod.precio * item.cantidad).toLocaleString('es-CO')} <span className="text-[10px] text-stone-500 font-normal">COP</span>
                    </span>
                  </div>

                  {/* Trash element */}
                  <button
                    onClick={() => removeFromCart(item.product_id)}
                    className="p-2 text-stone-400 hover:text-rose-600 transition-colors cursor-pointer"
                    title="Remover de mi selección"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            );
          })}

          <div className="pt-2 text-left">
            <Link
              to="/tienda"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#122C9B] hover:text-[#FFA42C] hover:underline"
            >
              <CornerUpLeft className="w-4 h-4" />
              <span>Seguir Comprando Café</span>
            </Link>
          </div>
        </div>

        {/* Right Column: Checkout Summary (4 Columns) */}
        <div className="lg:col-span-4 bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-6">
          <h3 className="font-display text-lg font-bold text-stone-900">Resumen del Pedido</h3>

          <div className="space-y-3.5 text-sm">
            <div className="flex justify-between text-stone-500 font-light">
              <span>Subtotal del Carrito</span>
              <span className="font-mono">${total.toLocaleString('es-CO')} COP</span>
            </div>
            
            <div className="flex justify-between text-stone-500 font-light">
              <span>Envio Nacional</span>
              <span className="text-emerald-600 font-mono">¡GRATUITO!</span>
            </div>

            <hr className="border-stone-100" />

            <div className="flex justify-between text-stone-900 font-bold text-base">
              <span>Costo Total</span>
              <span className="font-sans text-lg font-black">${total.toLocaleString('es-CO')} COP</span>
            </div>
          </div>

          <button
            onClick={handleCheckoutRedirect}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#122C9B] border border-[#122C9B] hover:bg-[#FFA42C] text-white text-sm font-bold rounded-xl transition-all shadow-md cursor-pointer"
          >
            <span>Proceder al pago</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="pt-2 text-center text-[11px] text-stone-400 space-y-1.5 font-sans leading-normal">
            <div className="flex items-center justify-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Checkout 100% Protegido</span>
            </div>
            <p className="font-light">
              Pago procesado por Mercado Pago: tarjetas de crédito y débito, PSE y otros medios.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
