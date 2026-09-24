import React, { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore, useCartStore } from './store';

// Layout components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { ToastContainer } from './components/Toast';
import PrivacyConsent from './components/PrivacyConsent';
import ScrollToTop from './components/ScrollToTop';
import FloatingCart from './components/FloatingCart';
import ChatBubble from './components/ChatBubble';

// Pages
// Home va en el paquete principal (es la entrada más común). El resto se descarga al
// visitarlo: así quien entra al inicio no baja también el panel Admin (~2.200 líneas), la
// cuenta o el checkout. Mejora LCP e INP (Core Web Vitals).
import Home from './pages/Home';
const Tienda = lazy(() => import('./pages/Tienda'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Experiencias = lazy(() => import('./pages/Experiencias'));
const ExperienciaDetail = lazy(() => import('./pages/ExperienciaDetail'));
const Turismo = lazy(() => import('./pages/Turismo'));
const HaciendaDetail = lazy(() => import('./pages/HaciendaDetail'));
const Academia = lazy(() => import('./pages/Academia'));
const CasaJaguar = lazy(() => import('./pages/CasaJaguar'));
const NuestraPlanta = lazy(() => import('./pages/NuestraPlanta'));
const Contacto = lazy(() => import('./pages/Contacto'));
const Privacidad = lazy(() => import('./pages/Privacidad'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const RecuperarPassword = lazy(() => import('./pages/RecuperarPassword'));
const RestablecerPassword = lazy(() => import('./pages/RestablecerPassword'));
const CartPage = lazy(() => import('./pages/CartPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const ConfirmationPage = lazy(() => import('./pages/ConfirmationPage'));
const MiCuenta = lazy(() => import('./pages/MiCuenta'));
const Admin = lazy(() => import('./pages/Admin'));

export default function App() {
  const { checkAuth, loading } = useAuthStore();
  const { loadCartFromStorage } = useCartStore();

  useEffect(() => {
    // Check credentials session cookie on page load
    checkAuth();
    // Re-instantiate local shopping cart items
    loadCartFromStorage();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#122C9B] flex flex-col items-center justify-center">
        <div className="relative mb-6">
          <img src="/images/logo-color.png" alt="Jaguar Coffee" className="h-20 w-auto animate-pulse" />
        </div>
        <div className="w-10 h-10 border-4 border-[#FFA42C] border-t-transparent rounded-full animate-spin" />
        <p className="mt-6 text-[#FFF9F5]/70 text-xs font-mono tracking-[0.3em] uppercase">Jaguar Coffee S.A.S.</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <ScrollToTop />
      <ToastContainer />
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col justify-between">
        <Navbar />
        <FloatingCart />
        <ChatBubble />

        {/* Core dynamic route display panel */}
        <main className="flex-grow">
          <Suspense fallback={
            <div className="py-24 flex justify-center" aria-label="Cargando">
              <div className="w-8 h-8 border-4 border-[#FFA42C] border-t-transparent rounded-full animate-spin" />
            </div>
          }>
          <Routes>
            {/* Public Access Paths */}
            <Route path="/" element={<Home />} />
            <Route path="/tienda" element={<Tienda />} />
            <Route path="/tienda/:slug" element={<ProductDetail />} />
            <Route path="/experiencias" element={<Experiencias />} />
            <Route path="/experiencias/:slug" element={<ExperienciaDetail />} />
            <Route path="/turismo" element={<Turismo />} />
            <Route path="/turismo/:slug" element={<HaciendaDetail />} />
            <Route path="/academia" element={<Academia />} />
            <Route path="/casa-jaguar" element={<CasaJaguar />} />
            <Route path="/nuestra-planta" element={<NuestraPlanta />} />
            <Route path="/contacto" element={<Contacto />} />
            <Route path="/privacidad" element={<Privacidad />} />
            
            {/* Authentication Entries */}
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/registro" element={<Register />} />
            <Route path="/auth/recuperar" element={<RecuperarPassword />} />
            <Route path="/auth/restablecer" element={<RestablecerPassword />} />
            
            {/* Purchase cart flows */}
            <Route path="/carrito" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/checkout/confirmacion" element={<ConfirmationPage />} />
            
            {/* Secure Customer dash panel */}
            <Route path="/mi-cuenta" element={<MiCuenta />} />
            
            {/* Administration portal */}
            <Route path="/admin" element={<Admin />} />

            {/* General Fallbacks */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </main>

        <Footer />

        <PrivacyConsent />
      </div>
    </BrowserRouter>
  );
}
