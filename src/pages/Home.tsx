import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCartStore } from '../store';
import { Coffee, Award, Calendar, Home as HomeIcon, GraduationCap, ChevronRight, ArrowRight, ShieldCheck, Heart, ExternalLink, Star, TrendingUp, Globe, Beaker, Instagram } from 'lucide-react';
import { Product, CarouselSlide } from '../types';
import axios from 'axios';
import { showToast } from '../components/Toast';

export default function Home() {
  const { addToCart } = useCartStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    Promise.all([
      axios.get('/api/productos'),
      axios.get('/api/slides')
    ])
      .then(([prodRes, slidesRes]) => {
        setProducts(prodRes.data.slice(0, 3));
        setSlides(slidesRes.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching data', err);
        setLoading(false);
      });
  }, []);

  // Soft slow auto play slider
  useEffect(() => {
    const validSlides = Array.isArray(slides) ? slides : [];
    if (validSlides.length === 0) return;
    setCurrentSlide(prev => {
      if (prev === null || prev < 0 || prev >= validSlides.length) return 0;
      return prev;
    });
    const timer = setInterval(() => {
      setCurrentSlide(prev => {
        if (!validSlides.length) return 0;
        return (prev + 1) % validSlides.length;
      });
    }, 6000);
    return () => clearInterval(timer);
  }, [slides]);

  return (
    <div id="home-view" className="space-y-16 pb-20">
      
      {/* 1. HERO CAROUSEL PORTAL
          Alto relativo a la pantalla (descontando los 5rem del navbar) con mínimo y máximo:
          llena el celular en vertical, no se corta en celular horizontal y no queda corto en
          monitores grandes. En pantallas bajas (celular horizontal) todo se compacta. */}
      <section
        id="hero-carousel"
        aria-roledescription="carrusel"
        aria-label="Destacados"
        className="relative h-[calc(100svh-5rem)] min-h-[30rem] max-h-[56rem] [@media(max-height:500px)]:min-h-[17rem] bg-[#122C9B] overflow-hidden"
      >
        {slides && slides.length > 0 ? slides.map((slide, idx) => (
          <div
            key={idx}
            aria-hidden={currentSlide !== idx}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              currentSlide === idx ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            {/* Imagen de fondo como <img>: el navegador la descubre antes que un background CSS
                (mejor LCP) y object-cover la recorta bien en cualquier proporción. La primera se
                pide con prioridad; las demás, en diferido. */}
            <img
              src={slide.bgImage}
              alt=""
              loading={idx === 0 ? 'eager' : 'lazy'}
              fetchPriority={idx === 0 ? 'high' : 'low'}
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover object-[70%_center] md:object-center mix-blend-multiply opacity-80"
            />
            {/* Velo para que el texto se lea sobre cualquier foto: de abajo hacia arriba en
                celular (el texto ocupa casi todo el ancho) y desde la izquierda en pantallas anchas
                (el texto va a la izquierda y la foto respira a la derecha). */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#122C9B]/90 via-[#122C9B]/55 to-[#122C9B]/20 md:bg-gradient-to-r md:from-[#122C9B]/90 md:from-25% md:via-[#122C9B]/55 md:via-55% md:to-transparent" />

            {/* Carousel Content */}
            <div className="relative z-20 h-full max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 flex items-end md:items-center pb-20 md:pb-0 [@media(max-height:500px)]:items-center [@media(max-height:500px)]:pb-10">
              <div className="w-full max-w-xl lg:max-w-2xl space-y-4 sm:space-y-6 [@media(max-height:500px)]:space-y-2 text-[#FFF9F5]">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FFA42C] text-[#122C9B] rounded-2xl text-[10px] sm:text-xs font-black font-mono tracking-widest uppercase">
                  {slide.badge}
                </span>
                {/* Solo el slide visible es el <h1> de la página; los demás son <h2> */}
                {React.createElement(
                  currentSlide === idx ? 'h1' : 'h2',
                  { className: 'font-sans text-[clamp(2.25rem,7vw,4.5rem)] [@media(max-height:500px)]:text-3xl font-extrabold tracking-tighter leading-[0.95] whitespace-pre-line text-balance' },
                  slide.title
                )}
                <p className="text-sm sm:text-base lg:text-lg text-white font-medium leading-relaxed max-w-lg [@media(max-height:500px)]:line-clamp-2">
                  {slide.subtitle}
                </p>
                <div className="pt-2 sm:pt-4 [@media(max-height:500px)]:pt-1 flex flex-wrap items-center gap-3 sm:gap-4">
                  <Link
                    to={slide.buttonLink}
                    tabIndex={currentSlide === idx ? 0 : -1}
                    className="px-6 sm:px-8 py-3 bg-[#FFA42C] hover:bg-[#FFA42C]/90 text-[#122C9B] font-bold rounded-2xl text-xs uppercase tracking-widest shadow-lg shadow-[#FFA42C]/30 transition-all cursor-pointer text-center"
                  >
                    {slide.buttonText}
                  </Link>
                  {slide.button2Text && (
                    <Link
                      to={slide.button2Link || '/'}
                      tabIndex={currentSlide === idx ? 0 : -1}
                      className="px-6 sm:px-8 py-3 border border-[#FFF9F5]/40 hover:border-white text-white font-bold rounded-2xl text-xs uppercase tracking-widest hover:bg-white/10 transition-all text-center"
                    >
                      {slide.button2Text}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        )) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-[#FFA42C] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Indicadores: abajo, centrados, con área táctil de 24px aunque el punto se vea pequeño */}
        {slides && slides.length > 1 && (
        <div className="absolute bottom-5 sm:bottom-8 [@media(max-height:500px)]:bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 z-40">
          {slides.map((slide, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentSlide(idx)}
              aria-label={`Ver destacado ${idx + 1}: ${slide.title.replace(/\n/g, ' ')}`}
              aria-current={currentSlide === idx}
              className="p-2 group cursor-pointer"
            >
              <span className={`block h-2.5 rounded-2xl transition-all duration-300 ${
                currentSlide === idx ? 'bg-[#FFA42C] w-8' : 'w-2.5 bg-white/40 group-hover:bg-white/70'
              }`} />
            </button>
          ))}
        </div>
        )}
      </section>

      {/* 2. VALUE PROPOSITIONS BENTO GRID */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div id="brand-values" className="grid grid-cols-1 md:grid-cols-3 gap-8 bg-white border border-[#122C9B]/10 shadow-sm rounded-2xl p-8 relative z-30">
          <div className="flex items-start gap-4 p-4">
            <span className="p-3 bg-[#FFA42C]/10 rounded-2xl text-[#FFA42C]">
              <Coffee className="w-6 h-6" />
            </span>
            <div className="space-y-1">
              <h3 className="font-sans text-lg font-bold text-[#122C9B]">Tueste sobre pedido</h3>
              <p className="text-xs text-[#122C9B]/70 font-light leading-relaxed">
                Tostamos lotes micro-controlados en nuestra planta de Silvania, Cundinamarca, asegurando notas frescas e intactas.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-4 border-t md:border-t-0 md:border-x border-[#122C9B]/10">
            <span className="p-3 bg-[#FFA42C]/10 rounded-2xl text-[#FFA42C]">
              <Award className="w-6 h-6" />
            </span>
            <div className="space-y-1">
              <h3 className="font-sans text-lg font-bold text-[#122C9B]">Certificación SCA & CQI</h3>
              <p className="text-xs text-[#122C9B]/70 font-light leading-relaxed">
                Programas avalados por la Specialty Coffee Association y Coffee Quality Institute, con instructores AST certificados.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-4 border-t md:border-t-0 border-[#122C9B]/10">
            <span className="p-3 bg-[#FFA42C]/10 rounded-2xl text-[#FFA42C]">
              <ShieldCheck className="w-6 h-6" />
            </span>
            <div className="space-y-1">
              <h3 className="font-sans text-lg font-bold text-[#122C9B]">Transacción Segura</h3>
              <p className="text-xs text-[#122C9B]/70 font-light leading-relaxed">
                Pagas en el checkout seguro de Mercado Pago: los datos de tu tarjeta nunca pasan por nuestro sitio.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. FEATURED PRODUCTS PREVIEW (Tienda Line) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-[#122C9B]/10 pb-5">
          <div className="space-y-2">
            <h2 className="font-sans text-3xl font-extrabold text-[#122C9B] tracking-tighter uppercase">Café de Especialidad</h2>
            <p className="text-xs text-[#122C9B]/60 uppercase tracking-widest font-mono">Cosecha, trilla y tueste en Silvania, Cundinamarca. Café de especialidad con trazabilidad garantizada.</p>
          </div>
          <Link
            to="/tienda"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FFA42C] hover:text-[#3D5FC9] uppercase tracking-wider group"
          >
            <span>Ver todo el catálogo</span>
            <ChevronRight className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map(n => (
              <div key={n} className="bg-white border border-[#122C9B]/10 rounded-2xl h-96 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {products.map((prod) => (
              <div
                key={prod.id}
                className="group bg-white border border-[#122C9B]/10 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-[#122C9B]/5 transition-all duration-300 flex flex-col justify-between"
              >
                {/* Product Media */}
                <div className="relative aspect-video w-full overflow-hidden bg-[#122C9B]/5">
                  <img
                    src={prod.imagen_url}
                    alt={prod.nombre}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                  {prod.precio_antes && (
                    <span className="absolute top-4 left-4 bg-[#FFA42C] text-white text-[9px] font-mono font-black px-2.5 py-1 rounded-2xl uppercase tracking-widest">
                      Oferta especial
                    </span>
                  )}
                </div>

                {/* Info and Purchase */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] text-[#122C9B]/60 font-mono uppercase tracking-wider">
                      <span>{prod.origen}</span>
                      <span>Tueste: {prod.tueste}</span>
                    </div>
                    <Link to={`/tienda/${prod.slug}`} className="block">
                      <h3 className="font-sans text-lg font-bold text-[#122C9B] group-hover:text-[#FFA42C] transition-colors leading-tight">
                        {prod.nombre}
                      </h3>
                    </Link>
                    <p className="text-xs text-[#122C9B]/70 font-light line-clamp-2 leading-relaxed">
                      {prod.descripcion}
                    </p>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-[#122C9B]/5">
                    <div>
                      {prod.precio_antes && (
                        <span className="block text-[10px] text-[#122C9B]/45 line-through">
                          ${prod.precio_antes.toLocaleString('es-CO')} COP
                        </span>
                      )}
                      <span className="text-sm font-extrabold text-[#122C9B]">
                        ${prod.precio.toLocaleString('es-CO')} COP
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        addToCart(prod, 1);
                        showToast(`"${prod.nombre}" agregado al carrito`);
                      }}
                      className="px-4 py-2 bg-[#122C9B] hover:bg-[#FFA42C] text-white text-[10px] font-bold rounded-2xl uppercase tracking-widest transition-all cursor-pointer"
                    >
                      Comprar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. SCA PREMIUM CAMPUS — ACADEMIA SECTION */}
      <div className="bg-[#122C9B] text-stone-200 py-20 rounded-2xl mx-4 sm:mx-6 lg:mx-8 shadow-xl">
        <div className="max-w-7xl mx-auto px-6 sm:px-12 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-1 px-4 py-1.5 bg-[#FFA42C]/10 text-[#FFA42C] border border-[#FFA42C]/20 rounded-2xl text-[10px] font-mono font-black tracking-widest uppercase">
              SCA Premier Campus
            </span>
            <h2 className="font-sans text-[1.75rem] sm:text-4xl hyphens-auto [overflow-wrap:anywhere] sm:[overflow-wrap:normal] font-extrabold text-[#FFF9F5] tracking-tighter uppercase leading-[0.9]">
              Academia de Barismo con Certificaciones Internacionales
            </h2>
            <p className="text-[#FFF9F5]/70 font-light text-sm leading-relaxed">
              En Jaguar Coffee creemos que el conocimiento transforma. Contamos con programas avalados por la <strong>SCA (Specialty Coffee Association)</strong> y el <strong>CQI (Coffee Quality Institute)</strong>, reconocidos a nivel mundial. Nuestro equipo es liderado por <strong>Mario Patiño, AST (Authorized SCA Trainer)</strong>.
            </p>

            <div className="grid grid-cols-2 gap-4 pb-4">
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                <span className="block font-sans text-lg font-bold text-white mb-1">SCA & CQI</span>
                <span className="text-[10px] font-mono uppercase tracking-wider text-white/50">Certificaciones Internacionales</span>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                <span className="block font-sans text-lg font-bold text-white mb-1">Mario Patiño</span>
                <span className="text-[10px] font-mono uppercase tracking-wider text-white/50">AST Certified Trainer</span>
              </div>
            </div>

            <Link
              to="/academia"
              className="inline-flex items-center gap-2 px-8 py-3 bg-[#FFA42C] hover:bg-[#FFA42C]/90 text-white text-xs font-bold rounded-2xl uppercase tracking-widest shadow-lg shadow-[#FFA42C]/30 transition-colors"
            >
              <span>Certifícate Ahora</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="relative aspect-video lg:aspect-square rounded-2xl border border-white/5">
            <img
              src="https://cafejaguar.com/wp-content/uploads/2026/01/Academia-barismo-1-scaled-1-1024x576.webp"
              alt="Academia de Barismo Jaguar Coffee"
              className="w-full h-full object-cover opacity-80"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-[#FFA42C]/10 to-transparent" />
          </div>
        </div>
      </div>

      {/* 5. DESARROLLO DE PRODUCTO — PLANTA */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-[#122C9B]/10 pb-5">
          <div className="space-y-2">
            <h2 className="font-sans text-3xl font-extrabold text-[#122C9B] tracking-tighter uppercase">Desarrollo de Producto</h2>
            <p className="text-xs text-[#122C9B]/60 uppercase tracking-widest font-mono">Planta de trilla y tostión en Silvania, Cundinamarca</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white border border-[#122C9B]/10 rounded-2xl p-8 flex flex-col justify-between space-y-6 shadow-sm hover:shadow-md transition-all">
            <div className="space-y-4">
              <span className="p-3 bg-[#FFA42C]/10 border border-[#FFA42C]/25 text-[#FFA42C] rounded-2xl inline-block shadow-sm">
                <Beaker className="w-5 h-5" />
              </span>
              <h3 className="font-sans text-xl font-bold text-[#122C9B] leading-tight">Trilla y Tostión</h3>
              <p className="text-xs text-[#122C9B]/70 leading-relaxed font-light">
                Cuidamos cada etapa del proceso con precisión y compromiso. Servicios especializados de trillado y tueste que garantizan calidad, trazabilidad y consistencia en cada lote.
              </p>
            </div>
            <Link to="/contacto" className="inline-flex items-center gap-1 text-xs font-bold text-[#FFA42C] hover:text-[#3D5FC9] uppercase tracking-wider group">
              <span>Más información</span>
              <ChevronRight className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="bg-white border border-[#122C9B]/10 rounded-2xl p-8 flex flex-col justify-between space-y-6 shadow-sm hover:shadow-md transition-all">
            <div className="space-y-4">
              <span className="p-3 bg-[#FFA42C]/10 border border-[#FFA42C]/25 text-[#FFA42C] rounded-2xl inline-block shadow-sm">
                <Star className="w-5 h-5" />
              </span>
              <h3 className="font-sans text-xl font-bold text-[#122C9B] leading-tight">Perfilación de Taza</h3>
              <p className="text-xs text-[#122C9B]/70 leading-relaxed font-light">
                Nuestro equipo de expertos te ayudará a descubrir la esencia, aroma, nota y textura de cada grano de café. Servicio especializado de análisis sensorial profesional.
              </p>
            </div>
            <Link to="/contacto" className="inline-flex items-center gap-1 text-xs font-bold text-[#FFA42C] hover:text-[#3D5FC9] uppercase tracking-wider group">
              <span>Más información</span>
              <ChevronRight className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="bg-white border border-[#122C9B]/10 rounded-2xl p-8 flex flex-col justify-between space-y-6 shadow-sm hover:shadow-md transition-all">
            <div className="space-y-4">
              <span className="p-3 bg-[#FFA42C]/10 border border-[#FFA42C]/25 text-[#FFA42C] rounded-2xl inline-block shadow-sm">
                <Globe className="w-5 h-5" />
              </span>
              <h3 className="font-sans text-xl font-bold text-[#122C9B] leading-tight">Logística Exportadora</h3>
              <p className="text-xs text-[#122C9B]/70 leading-relaxed font-light">
                Te acompañamos en el proceso de exportación de tu café. En Jaguar Coffee te guiaremos paso a paso en tu proceso de exportación con trazabilidad completa.
              </p>
            </div>
            <Link to="/contacto" className="inline-flex items-center gap-1 text-xs font-bold text-[#FFA42C] hover:text-[#3D5FC9] uppercase tracking-wider group">
              <span>Más información</span>
              <ChevronRight className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      {/* 6. ESTADÍAS + ACADEMIA DOUBLE PROMOS */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* Estadías Card */}
        <div className="bg-white border border-[#122C9B]/10 rounded-2xl p-8 flex flex-col justify-between space-y-6 md:p-10 shadow-sm hover:shadow-md transition-all">
          <div className="space-y-4">
            <span className="p-3 bg-[#FFA42C]/10 border border-[#FFA42C]/25 text-[#FFA42C] rounded-2xl inline-block shadow-sm">
              <HomeIcon className="w-5 h-5" />
            </span>
            <h3 className="font-sans text-2xl font-bold text-[#122C9B] leading-tight">Estadías entre Cafetales Coloniales</h3>
            <p className="text-xs text-[#122C9B]/70 leading-relaxed font-light">
              Desconéctate y hospédate en nuestra finca cafetera en Silvania, Cundinamarca, a solo 42 km de Bogotá. Reservas gestionadas a través de <strong>Airbnb</strong> con garantía total.
            </p>
          </div>
          <Link
            to="/turismo"
            className="inline-flex items-center gap-1 text-xs font-bold text-[#FFA42C] hover:text-[#3D5FC9] uppercase tracking-wider group"
          >
            <span>Explorar estadías cafeteras</span>
            <ChevronRight className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* SCA Academy Card */}
        <div className="bg-white border border-[#122C9B]/10 rounded-2xl p-8 flex flex-col justify-between space-y-6 md:p-10 shadow-sm hover:shadow-md transition-all">
          <div className="space-y-4">
            <span className="p-3 bg-[#FFA42C]/10 border border-[#FFA42C]/25 text-[#FFA42C] rounded-2xl inline-block shadow-sm">
              <GraduationCap className="w-5 h-5" />
            </span>
            <h3 className="font-sans text-2xl font-bold text-[#122C9B] leading-tight">SCA Premier Campus</h3>
            <p className="text-xs text-[#122C9B]/70 leading-relaxed font-light">
              Certificaciones internacionales SCA y CQI con Mario Patiño como AST Trainer. Programas diseñados para principiantes y profesionales del café de especialidad.
            </p>
          </div>
          <Link
            to="/academia"
            className="inline-flex items-center gap-1 text-xs font-bold text-[#FFA42C] hover:text-[#3D5FC9] uppercase tracking-wider group"
          >
            <span>Ver programas de certificación</span>
            <ChevronRight className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>

      {/* 7. INSTAGRAM REEL SECTION */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white border border-[#122C9B]/10 rounded-2xl p-5 sm:p-8 md:p-12 shadow-sm">
          <div className="text-center max-w-2xl mx-auto space-y-4 mb-8">
            <span className="px-3 py-1 bg-[#FFA42C]/10 text-[#122C9B] rounded-full text-xs font-bold font-mono tracking-wider uppercase">
              Síguenos en Instagram
            </span>
            {/* Una sola "palabra" larga: el tamaño escala con el ancho para no desbordar en celular */}
            <h2 className="font-sans text-[clamp(1.25rem,6.5vw,1.875rem)] font-extrabold text-[#122C9B] tracking-tight [overflow-wrap:anywhere]">
              @jaguarcoffeecolombia
            </h2>
            <p className="text-sm text-[#122C9B]/60 font-light">
              Vive el día a día de Jaguar Coffee: catas, tuestes, experiencias y el mejor café de especialidad colombiano.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="w-full max-w-[400px] mx-auto aspect-[9/16] rounded-2xl overflow-hidden border border-[#122C9B]/10 shadow-md">
              <iframe
                src="https://www.instagram.com/reel/C7HkE3RLZb3/embed/"
                className="w-full h-full"
                frameBorder="0"
                scrolling="no"
                allowTransparency
                title="Jaguar Coffee Instagram Reel"
              />
            </div>
            <div className="w-full max-w-[400px] mx-auto aspect-[9/16] rounded-2xl overflow-hidden border border-[#122C9B]/10 shadow-md">
              <iframe
                src="https://www.instagram.com/p/DZP3PQfRFnj/embed/"
                className="w-full h-full"
                frameBorder="0"
                scrolling="no"
                allowTransparency
                title="Experiencia de Catación Jaguar Coffee"
              />
            </div>
          </div>
          <div className="text-center mt-6">
            <a
              href="https://www.instagram.com/jaguarcoffeecolombia"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#122C9B] hover:bg-[#FFA42C] text-white text-sm font-bold rounded-2xl transition-colors"
            >
              <Instagram className="w-4 h-4" />
              <span>Seguir en Instagram</span>
            </a>
          </div>
        </div>
      </div>

    </div>
  );
}
