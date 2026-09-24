import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '../store';
import { ArrowLeft, ShoppingCart, ShieldCheck, RefreshCw, Truck } from 'lucide-react';
import { Product } from '../types';
import axios from 'axios';
import { showToast } from '../components/Toast';

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCartStore();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    axios.get(`/api/productos/${slug}`)
      .then(res => {
        setProduct(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching product slug detailed details', err);
        setLoading(false);
      });
  }, [slug]);

  useEffect(() => {
    setQuantity(1);
    setErrorMsg(null);
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-10 h-10 border-4 border-amber-800 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-stone-500 text-sm">Cargando especificaciones de la cosecha...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-6">
        <h2 className="font-display text-2xl font-bold text-stone-950">El producto solicitado no está disponible</h2>
        <p className="text-sm text-stone-500 font-light">Es posible que la cosecha haya cambiado de temporada o la referencia haya expirado.</p>
        <Link to="/tienda" className="inline-block px-6 py-3 bg-[#122C9B] text-white rounded-xl">
          Regresar a la Tienda
        </Link>
      </div>
    );
  }

  const handleQtyChange = (val: number) => {
    setErrorMsg(null);
    const target = quantity + val;
    if (target < 1) return;
    if (target > product.stock) {
      setErrorMsg(`Límite superado. Sólo quedan ${product.stock} unidades en stock.`);
      return;
    }
    setQuantity(target);
  };

  const handleAddToCart = () => {
    try {
      addToCart(product, quantity);
      showToast(`${quantity} unidad(es) de "${product.nombre}" agregada(s) al carrito`);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleBuyNow = () => {
    try {
      addToCart(product, quantity);
      navigate('/carrito');
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div id="product-detail-view" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      <div>
        <button
          onClick={() => navigate('/tienda')}
          className="inline-flex items-center gap-2 text-sm font-semibold text-stone-500 hover:text-stone-800 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Catálogo</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        <div className="bg-white p-4 border border-stone-200 rounded-3xl overflow-hidden shadow-sm leading-none">
          <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-stone-100">
            <img
              src={product.imagen_url}
              alt={product.nombre}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="mt-4 p-4 bg-stone-50 rounded-xl border border-stone-100 flex items-center gap-3 text-xs text-stone-500 font-mono">
            <span>🔖 Categoria: {product.categoria.toUpperCase()}</span>
            <span className="text-stone-300">|</span>
            <span>🌿 Activo en Inventario</span>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <span className="text-xs font-bold text-amber-700 tracking-widest uppercase font-mono">{product.origen}</span>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-stone-900 leading-tight">
              {product.nombre}
            </h1>
            <p className="text-xs text-stone-500 font-mono font-semibold">Tueste recomendado: {product.tueste}</p>
          </div>

          <hr className="border-stone-200" />

          <div className="flex items-baseline gap-4">
            <span className="text-3xl font-extrabold text-stone-950 font-sans">
              ${product.precio.toLocaleString('es-CO')} <span className="text-sm text-stone-600 font-normal font-mono">COP</span>
            </span>
            {product.precio_antes && (
              <span className="text-lg text-stone-400 line-through font-light">
                ${product.precio_antes.toLocaleString('es-CO')} COP
              </span>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-stone-400">Descripción de Origen</h3>
            <p className="text-sm text-stone-600 font-light leading-relaxed">
              {product.descripcion}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-4 bg-stone-50 rounded-2xl border border-stone-150 p-4">
            <div className="flex items-center gap-3 sm:flex-col sm:text-center p-2">
              <Truck className="w-5 h-5 text-[#FFA42C]" />
              <div>
                <h4 className="text-xs font-bold text-stone-900">Envíos Colombia</h4>
                <p className="text-[10px] text-stone-400 font-light mt-0.5">Bogotá 24h · Nacional 2-3 días</p>
              </div>
            </div>
            <div className="flex items-center gap-3 sm:flex-col sm:text-center p-2 border-t sm:border-t-0 sm:border-x border-stone-200">
              <RefreshCw className="w-5 h-5 text-[#FFA42C]" />
              <div>
                <h4 className="text-xs font-bold text-stone-900">Frescura Continua</h4>
                <p className="text-[10px] text-stone-400 font-light mt-0.5">Tostado de lotes semanal</p>
              </div>
            </div>
            <div className="flex items-center gap-3 sm:flex-col sm:text-center p-2 border-t sm:border-t-0 border-stone-200">
              <ShieldCheck className="w-5 h-5 text-[#FFA42C]" />
              <div>
                <h4 className="text-xs font-bold text-stone-900">Pago Garantizado</h4>
                <p className="text-[10px] text-stone-400 font-light mt-0.5">Checkout seguro con Mercado Pago</p>
              </div>
            </div>
          </div>

          <hr className="border-stone-200" />

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-stone-700">Cantidad:</span>
              
              {product.stock > 0 ? (
                <div className="flex items-center border border-stone-300 rounded-lg overflow-hidden bg-white shadow-sm font-semibold">
                  <button
                    onClick={() => handleQtyChange(-1)}
                    className="px-3.5 py-2 text-stone-600 hover:bg-stone-50 transition-colors cursor-pointer"
                  >
                    -
                  </button>
                  <span className="px-5 py-2 text-sm text-stone-900 font-mono">
                    {quantity}
                  </span>
                  <button
                    onClick={() => handleQtyChange(1)}
                    className="px-3.5 py-2 text-stone-600 hover:bg-stone-50 transition-colors cursor-pointer"
                  >
                    +
                  </button>
                </div>
              ) : (
                <span className="text-sm text-rose-600 font-bold font-mono">AGOTADO TEMPORALMENTE</span>
              )}

              <span className="text-xs text-stone-400 font-mono">
                ({product.stock} unidades disponibles)
              </span>
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-600 font-semibold font-mono animate-pulse">
                ⚠️ {errorMsg}
              </p>
            )}

            <div className="pt-2 flex flex-col sm:flex-row gap-4">
              {product.stock > 0 ? (
                <>
                  <button
                    onClick={handleAddToCart}
                    className="flex-grow flex items-center justify-center gap-2 px-8 py-3.5 bg-[#122C9B] hover:bg-[#3D5FC9] text-white text-sm font-semibold rounded-xl transition-all shadow-md cursor-pointer"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>Añadir al Carrito</span>
                  </button>
                  <button
                    onClick={handleBuyNow}
                    className="flex-grow flex items-center justify-center px-8 py-3.5 bg-white hover:bg-stone-50 border border-stone-300 text-stone-850 text-sm font-semibold rounded-xl transition-all shadow-sm"
                  >
                    Comprar Ahora
                  </button>
                </>
              ) : (
                <button
                  disabled
                  className="w-full py-4 bg-stone-100 text-stone-400 text-sm font-semibold rounded-xl cursor-not-allowed border border-stone-200"
                >
                  NOTIFICARME CUANDO HAYA DISPONIBILIDAD
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
