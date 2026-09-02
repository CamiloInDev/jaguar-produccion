import React, { useEffect } from 'react';
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
import Home from './pages/Home';
import Tienda from './pages/Tienda';
import ProductDetail from './pages/ProductDetail';
import Experiencias from './pages/Experiencias';
import ExperienciaDetail from './pages/ExperienciaDetail';
import Turismo from './pages/Turismo';
import HaciendaDetail from './pages/HaciendaDetail';
import Academia from './pages/Academia';
import CasaJaguar from './pages/CasaJaguar';
import NuestraPlanta from './pages/NuestraPlanta';
import Contacto from './pages/Contacto';
import Privacidad from './pages/Privacidad';
import Login from './pages/Login';
import Register from './pages/Register';
import RecuperarPassword from './pages/RecuperarPassword';
import RestablecerPassword from './pages/RestablecerPassword';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import ConfirmationPage from './pages/ConfirmationPage';
import MiCuenta from './pages/MiCuenta';
import Admin from './pages/Admin';

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
        </main>

        <Footer />

        <PrivacyConsent />
      </div>
    </BrowserRouter>
  );
}
