import React from 'react';
import { ShieldCheck, Lock, UserCheck, Eye, Mail } from 'lucide-react';

export default function Privacidad() {
  return (
    <div id="privacidad-view" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      {/* Header */}
      <div className="text-center space-y-4">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FFA42C]/10 text-[#122C9B] rounded-full text-xs font-bold font-mono tracking-wider uppercase">
          <ShieldCheck className="w-4 h-4" />
          Protección de Datos
        </span>
        <h1 className="font-sans text-3xl sm:text-4xl font-extrabold text-[#122C9B] tracking-tight">
          Política de Tratamiento de Datos Personales
        </h1>
        <p className="text-sm text-[#122C9B]/60 font-light max-w-2xl mx-auto leading-relaxed">
          Jaguar Coffee S.A.S. está comprometida con la protección de tu información personal. Esta política se rige por la Ley 1581 de 2012 y el Decreto 1377 de 2013 de Colombia.
        </p>
      </div>

      {/* Last update */}
      <div className="text-center">
        <span className="text-[10px] font-mono uppercase tracking-wider text-[#122C9B]/50">
          Última actualización: {new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
        </span>
      </div>

      {/* Content */}
      <div className="bg-white border border-[#122C9B]/10 rounded-2xl p-6 sm:p-10 shadow-sm space-y-8">
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-[#122C9B]">
            <UserCheck className="w-5 h-5 text-[#FFA42C]" />
            <h2 className="font-sans text-lg font-bold">1. Responsable del Tratamiento</h2>
          </div>
          <p className="text-sm text-[#122C9B]/70 font-light leading-relaxed">
            <strong>Jaguar Coffee S.A.S.</strong>, identificada con NIT en trámite de actualización, con domicilio en Cra 4 # 12 – 78, La Candelaria, Bogotá, Colombia. Correo de contacto: cafejaguarcolombia@gmail.com.
          </p>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-[#122C9B]">
            <Eye className="w-5 h-5 text-[#FFA42C]" />
            <h2 className="font-sans text-lg font-bold">2. Datos que Recolectamos</h2>
          </div>
          <ul className="list-disc list-inside text-sm text-[#122C9B]/70 font-light leading-relaxed space-y-1">
            <li>Nombre y apellidos.</li>
            <li>Correo electrónico y número de teléfono.</li>
            <li>Dirección de envío y ciudad de residencia.</li>
            <li>Historial de compras y preferencias de productos.</li>
            <li>Información de contacto enviada a través de formularios.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-[#122C9B]">
            <Lock className="w-5 h-5 text-[#FFA42C]" />
            <h2 className="font-sans text-lg font-bold">3. Finalidades del Tratamiento</h2>
          </div>
          <ul className="list-disc list-inside text-sm text-[#122C9B]/70 font-light leading-relaxed space-y-1">
            <li>Gestionar tu registro como usuario y tu acceso al sitio.</li>
            <li>Procesar, enviar y hacer seguimiento de tus pedidos.</li>
            <li>Contactarte sobre tu compra, experiencia o reserva.</li>
            <li>Enviar información comercial, promociones y novedades, solo si das tu autorización.</li>
            <li>Cumplir con obligaciones legales y regulatorias.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-[#122C9B]">
            <ShieldCheck className="w-5 h-5 text-[#FFA42C]" />
            <h2 className="font-sans text-lg font-bold">4. Derechos de los Titulares</h2>
          </div>
          <p className="text-sm text-[#122C9B]/70 font-light leading-relaxed">
            Como titular de tus datos tienes derecho a conocer, actualizar, rectificar y suprimir tu información personal; revocar la autorización otorgada; y acceder a tus datos de forma gratuita. Para ejercer estos derechos, escríbenos a:
          </p>
          <a
            href="mailto:cafejaguarcolombia@gmail.com"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-[#FFA42C] hover:text-[#3D5FC9] transition-colors"
          >
            <Mail className="w-4 h-4" />
            cafejaguarcolombia@gmail.com
          </a>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-[#122C9B]">
            <Lock className="w-5 h-5 text-[#FFA42C]" />
            <h2 className="font-sans text-lg font-bold">5. Seguridad de la Información</h2>
          </div>
          <p className="text-sm text-[#122C9B]/70 font-light leading-relaxed">
            Implementamos medidas técnicas, administrativas y físicas para proteger tus datos contra acceso no autorizado, pérdida, alteración o uso indebido. Los pagos son procesados por Mercado Pago, quien opera bajo sus propios estándares de seguridad y cumplimiento.
          </p>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-[#122C9B]">
            <Eye className="w-5 h-5 text-[#FFA42C]" />
            <h2 className="font-sans text-lg font-bold">6. Uso de Cookies</h2>
          </div>
          <p className="text-sm text-[#122C9B]/70 font-light leading-relaxed">
            Este sitio utiliza únicamente cookies técnicas necesarias para el funcionamiento de la sesión, el carrito de compras y la seguridad del sitio. No utilizamos cookies de terceros ni de seguimiento publicitario.
          </p>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-[#122C9B]">
            <ShieldCheck className="w-5 h-5 text-[#FFA42C]" />
            <h2 className="font-sans text-lg font-bold">7. Modificaciones a esta Política</h2>
          </div>
          <p className="text-sm text-[#122C9B]/70 font-light leading-relaxed">
            Jaguar Coffee S.A.S. podrá actualizar esta política en cualquier momento. Los cambios serán publicados en esta página con la fecha de actualización correspondiente.
          </p>
        </section>
      </div>

      {/* Contact CTA */}
      <div className="text-center space-y-3">
        <p className="text-sm text-[#122C9B]/70 font-light">
          Si tienes dudas sobre esta política o sobre el manejo de tus datos personales, contáctanos.
        </p>
        <a
          href="/contacto"
          className="inline-flex items-center justify-center px-6 py-2.5 bg-[#122C9B] hover:bg-[#FFA42C] text-white text-xs font-bold rounded-lg uppercase tracking-wider transition-colors"
        >
          Ir a Contacto
        </a>
      </div>
    </div>
  );
}
