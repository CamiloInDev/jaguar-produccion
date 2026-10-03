import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCartStore } from '../store';
import { Search, SlidersHorizontal, ShoppingBag, Eye } from 'lucide-react';
import { Product, CoffeeCategory } from '../types';
import axios from 'axios';
import { showToast } from '../components/Toast';

export default function Tienda() {
  const { addToCart } = useCartStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');

  const categories: { label: string; value: string }[] = [
    { label: 'Todos', value: 'todos' },
    { label: '250 gr', value: '250gr' },
    { label: '175 gr', value: '175gr' },
    { label: 'Institucional', value: 'institucional' },
    { label: 'To-Go', value: 'togo' },
  ];

  const fetchFilteredProducts = () => {
    setLoading(true);
    let url = `/api/productos`;
    const params: string[] = [];
    if (selectedCategory && selectedCategory !== 'todos') {
      params.push(`categoria=${selectedCategory}`);
    }
    if (searchQuery) {
      params.push(`q=${encodeURIComponent(searchQuery)}`);
    }
    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }

    axios.get(url)
      .then(res => {
        setProducts(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching filtered products', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchFilteredProducts();
  }, [selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFilteredProducts();
  };

  return (
    <div id="shop-view" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      
      {/* Search Header Banner */}
      <div className="bg-[#122C9B] rounded-3xl text-[#FFF9F5] p-8 md:p-12 flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden border border-[#122C9B]/10">
        {/* Decorative background image */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1541170155377-5091f3b2b044?auto=format&fit=crop&q=40&w=400')] bg-cover bg-center mix-blend-overlay opacity-15" />
        
        <div className="space-y-3 max-w-xl z-10 relative">
          <span className="text-[#FFA42C] font-mono text-xs font-black uppercase tracking-widest">Tienda de Especialidad</span>
          <h1 className="font-sans text-[1.75rem] sm:text-4xl hyphens-auto [overflow-wrap:anywhere] sm:[overflow-wrap:normal] font-extrabold tracking-tighter uppercase leading-[0.9]">Catálogo de Café Especial</h1>
          <p className="text-sm text-[#FFF9F5]/80 font-light leading-relaxed">
            Nuestros granos son seleccionados a mano por caficultores colombianos expertos, garantizando un tueste perfecto y frescura sublime en la entrega.
          </p>
        </div>

        {/* Real-time search query box */}
        <form onSubmit={handleSearchSubmit} className="w-full md:w-80 flex bg-white/10 backdrop-blur border border-white/20 rounded-xl overflow-hidden shadow-md z-10 relative">
          <input
            type="text"
            placeholder="Buscar por origen, notas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-grow px-4 py-3 bg-transparent text-white placeholder-[#FFF9F5]/60 text-sm border-none focus:ring-0 focus:outline-none"
          />
          <button type="submit" className="p-3 bg-[#FFA42C] text-white hover:bg-[#FFA42C]/90 transition-all cursor-pointer">
            <Search className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Row: Filter pills navigation row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#122C9B]/10 pb-5">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          <SlidersHorizontal className="w-4 h-4 text-[#122C9B]/60 hidden md:inline-block" />
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-full border transition-all cursor-pointer whitespace-nowrap ${
                selectedCategory === cat.value
                  ? 'bg-[#FFA42C] border-[#FFA42C] text-white shadow-sm shadow-[#FFA42C]/20'
                  : 'bg-white border-[#122C9B]/10 text-[#122C9B]/80 hover:border-[#FFA42C] hover:text-[#FFA42C]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-stone-500 font-mono self-end md:self-auto">
          {products.length} {products.length === 1 ? 'producto encontrado' : 'productos encontrados'}
        </p>
      </div>

      {/* Main Catalog Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map(n => (
            <div key={n} className="bg-white border border-stone-200 rounded-2xl h-[420px] animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 bg-stone-50 rounded-2xl border border-stone-200 space-y-4">
          <p className="text-sm text-stone-500 font-light">No encontramos cosechas o accesorios con los filtros aplicados.</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('todos');
            }}
            className="px-4 py-2 bg-stone-900 text-white rounded-lg text-xs font-semibold"
          >
            Restablecer Filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.map((prod) => (
            <div
              key={prod.id}
              className="group bg-white border border-[#122C9B]/10 rounded-3xl overflow-hidden hover:shadow-xl hover:shadow-[#122C9B]/5 transition-all duration-300 flex flex-col justify-between relative"
            >
              {/* Product Badge */}
              <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
                {prod.stock === 0 ? (
                  <span className="bg-rose-600 text-white text-[9px] font-mono font-black px-2.5 py-1 rounded-full uppercase tracking-widest">
                    Agotado
                  </span>
                ) : prod.stock < 15 ? (
                  <span className="bg-[#FFA42C] text-white text-[9px] font-mono font-black px-2.5 py-1 rounded-full uppercase tracking-widest">
                    Pocas unidades
                  </span>
                ) : null}
              </div>

              {/* Product Media Column */}
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#122C9B]/5">
                <img
                  src={prod.imagen_url}
                  alt={prod.nombre}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
                
                {/* Embedded action overlay on hover */}
                <div className="absolute inset-0 bg-[#122C9B]/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <Link
                    to={`/tienda/${prod.slug}`}
                    className="p-3 bg-white text-[#122C9B] hover:text-[#FFA42C] rounded-full shadow-lg transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Information Frame */}
              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-[#122C9B]/60 font-mono uppercase tracking-wider">
                    <span>{prod.origen}</span>
                    <span>Tueste: {prod.tueste}</span>
                  </div>
                  <Link to={`/tienda/${prod.slug}`}>
                    <h3 className="font-sans text-lg font-bold text-[#122C9B] hover:text-[#FFA42C] transition-colors leading-tight">
                      {prod.nombre}
                    </h3>
                  </Link>
                  <p className="text-xs text-[#122C9B]/70 leading-relaxed font-light line-clamp-2">
                    {prod.descripcion}
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-[#122C9B]/5">
                  <div className="flex flex-col">
                    {prod.precio_antes && (
                      <span className="text-[10px] text-[#122C9B]/45 line-through">
                        ${prod.precio_antes.toLocaleString('es-CO')} COP
                      </span>
                    )}
                    <span className="text-[#122C9B] font-extrabold text-base">
                      ${prod.precio.toLocaleString('es-CO')} <span className="text-[10px] text-[#122C9B]/60 font-light font-mono">COP</span>
                    </span>
                  </div>

                  {prod.stock > 0 ? (
                    <button
                      onClick={() => {
                        addToCart(prod, 1);
                        showToast(`"${prod.nombre}" agregado al carrito`);
                      }}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#122C9B] hover:bg-[#FFA42C] text-white text-[10px] font-bold rounded-full uppercase tracking-widest transition-all cursor-pointer shadow-sm"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Comprar</span>
                    </button>
                  ) : (
                    <button
                      disabled
                      className="px-5 py-2.5 bg-[#122C9B]/5 text-[#122C9B]/40 text-[10px] font-bold rounded-full uppercase tracking-widest cursor-not-allowed"
                    >
                      Sin stock
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
