import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store';
import { User as UserIcon, LogOut, ShieldCheck, Menu, X } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navLinks = [
    { name: 'Productos', path: '/tienda' },
    { name: 'Nuestra Planta', path: '/nuestra-planta' },
    { name: 'Experiencias', path: '/experiencias' },
    { name: 'Estadías', path: '/turismo' },
    { name: 'Academia', path: '/academia' },
    { name: 'Casa Jaguar', path: '/casa-jaguar' },
    { name: 'Contacto', path: '/contacto' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav id="app-navbar" className="bg-[#FFF9F5]/95 backdrop-blur-md border-b border-[#122C9B]/10 sticky top-0 z-50">
      <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-20">
        <div className="flex justify-between items-center h-20">
          {/* Logo Brand */}
          <div className="flex items-center flex-none mr-4 xl:mr-8 2xl:mr-12">
            <Link to="/" className="flex items-center hover:opacity-90 transition-all">
              <img
                src="/images/logo-color.png"
                alt="Jaguar Coffee"
                className="h-16 lg:h-[72px] w-auto"
              />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex flex-1 items-center justify-center gap-x-5 xl:gap-x-7 2xl:gap-x-16">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`font-sans text-[10px] xl:text-xs font-bold uppercase tracking-wider xl:tracking-widest transition-colors pb-1 mt-[2px] whitespace-nowrap ${
                  isActive(link.path) 
                    ? 'text-[#FFA42C] border-b-2 border-[#FFA42C]' 
                    : 'text-[#122C9B]/75 hover:text-[#3D5FC9]'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Actions Menu */}
          <div className="hidden lg:flex items-center flex-none ml-4 xl:ml-8 2xl:ml-10">
            {/* Auth Buttons */}
            {user ? (
              <div className="flex items-center gap-4">
                <Link
                  to="/mi-cuenta"
                  className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#122C9B] hover:text-[#3D5FC9] bg-[#122C9B]/5 hover:bg-[#122C9B]/10 px-4 py-2 rounded-full border border-[#122C9B]/10 transition-colors"
                >
                  <UserIcon className="w-4 h-4 text-[#122C9B]/70" />
                  <span>{user.nombre}</span>
                </Link>

                {user.rol === 'admin' && (
                  <Link
                    to="/admin"
                    title="Panel Administrativo"
                    className="p-2.5 text-[#FFA42C] hover:text-white bg-[#FFA42C]/10 hover:bg-[#FFA42C] border border-[#FFA42C]/20 rounded-full transition-colors"
                  >
                    <ShieldCheck className="w-5 h-5" />
                  </Link>
                )}

                <button
                  onClick={handleLogout}
                  title="Cerrar Sesión"
                  className="p-2.5 text-[#122C9B]/60 hover:text-rose-600 bg-[#122C9B]/5 hover:bg-rose-50 border border-[#122C9B]/10 rounded-full transition-colors duration-200 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/auth/login"
                  className="text-[#122C9B] hover:text-[#3D5FC9] text-xs font-bold uppercase tracking-wider px-4 py-2 transition-colors"
                >
                  Ingresar
                </Link>
                <Link
                  to="/auth/registro"
                  className="bg-[#122C9B] hover:bg-[#FFA42C] text-white text-xs font-bold px-6 py-2.5 rounded-full uppercase tracking-wider transition-all duration-200 shadow-sm"
                >
                  Registrarse
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex lg:hidden items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-[#122C9B] hover:text-[#3D5FC9] transition-colors rounded-lg bg-[#122C9B]/5"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div id="mobile-menu" className="lg:hidden bg-[#FFF9F5] border-t border-[#122C9B]/10 py-4 px-6 space-y-4 shadow-inner">
          <div className="flex flex-col space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`font-sans text-xs font-bold uppercase tracking-widest leading-relaxed ${
                  isActive(link.path) ? 'text-[#FFA42C]' : 'text-[#122C9B]/75'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          <hr className="border-[#122C9B]/10" />

          {/* User Profile Controls in Mobile Drawer */}
          {user ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-[#122C9B]/5 p-3 rounded-xl border border-[#122C9B]/10">
                <UserIcon className="w-5 h-5 text-[#122C9B]/70" />
                <div>
                  <p className="text-xs font-bold text-[#122C9B] uppercase tracking-wider leading-none">{user.nombre} {user.apellido}</p>
                  <p className="text-[10px] font-mono text-[#122C9B]/60 mt-1">{user.email}</p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Link
                  to="/mi-cuenta"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2 bg-[#122C9B]/5 hover:bg-[#122C9B]/10 text-[#122C9B] font-bold uppercase tracking-wider text-[11px] rounded-full transition-colors border border-[#122C9B]/10"
                >
                  Mi Cuenta / Pedidos
                </Link>
                {user.rol === 'admin' && (
                  <Link
                    to="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2 bg-[#FFA42C]/10 hover:bg-[#FFA42C]/20 text-[#FFA42C] font-bold uppercase tracking-wider text-[11px] rounded-full transition-colors border border-[#FFA42C]/10"
                  >
                    Panel Admin (Rol: Admin)
                  </Link>
                )}
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold border border-rose-200 rounded-full text-xs uppercase tracking-wider transition-all"
                >
                  Cerrar Sesión
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Link
                to="/auth/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 text-[#122C9B] bg-[#122C9B]/5 hover:bg-[#122C9B]/10 font-bold uppercase tracking-wider text-xs rounded-full transition-all border border-[#122C9B]/10"
              >
                Iniciar sesión
              </Link>
              <Link
                to="/auth/registro"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 bg-[#122C9B] hover:bg-[#FFA42C] text-white font-bold uppercase tracking-wider text-xs rounded-full transition-all"
              >
                Registrarse
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
