import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store';
import { Mail, KeyRound, AlertTriangle } from 'lucide-react';

export default function RecuperarPassword() {
  const { requestPasswordReset } = useAuthStore();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const msg = await requestPasswordReset(email);
      setMessage(msg);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 px-4">
      <div className="bg-white border border-stone-200 rounded-3xl p-8 shadow-md space-y-6">
        <div className="text-center space-y-2">
          <span className="p-2.5 bg-[#FFA42C]/10 text-[#122C9B] rounded-xl inline-block shadow-inner">
            <KeyRound className="w-6 h-6" />
          </span>
          <h1 className="font-display text-2xl font-extrabold text-[#122C9B]">Recuperar contraseña</h1>
          <p className="text-xs text-stone-500 font-light max-w-xs mx-auto leading-normal">
            Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
          </p>
        </div>

        {message ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center text-emerald-800 text-xs font-semibold">
            ✓ {message}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-stone-700 font-mono uppercase">Correo Electrónico</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="mateo@jaguarcoffee.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-300 rounded-lg text-sm text-stone-900"
                />
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-stone-400" />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-medium flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#122C9B] border border-[#122C9B] hover:bg-[#3D5FC9] text-white text-sm font-semibold rounded-xl shadow transition duration-200 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
              ) : (
                'Enviar enlace de recuperación'
              )}
            </button>
          </form>
        )}

        <hr className="border-stone-200" />

        <div className="text-center text-xs text-stone-500">
          <Link to="/auth/login" className="text-amber-805 font-bold hover:underline">
            Volver a iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
