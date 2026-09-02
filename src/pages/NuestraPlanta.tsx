import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Beaker,
  Award,
  Coffee,
  GraduationCap,
  ShieldCheck,
  Star,
  MapPin,
  MessageCircle,
  ArrowRight,
  ArrowUpRight,
  Leaf,
  Truck,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Data                                                              */
/* ------------------------------------------------------------------ */

const HERO_IMAGE = '/images/NUESTRA-PLANTA/PLANTA1.webp';
const GALLERY_IMAGE = { src: '/images/NUESTRA-PLANTA/pLANTA2.webp', alt: 'Planta de tueste Jaguar Coffee' };

const SERVICES = [
  {
    icon: <Beaker className="w-6 h-6" />,
    title: 'Tueste personalizado',
    desc: 'Perfiles de tueste adaptados a tu marca, método de extracción y preferencias de sabor.',
  },
  {
    icon: <Award className="w-6 h-6" />,
    title: 'Desarrollo de perfiles',
    desc: 'Diseñamos curvas de tueste que resaltan las notas más características de cada origen.',
  },
  {
    icon: <Coffee className="w-6 h-6" />,
    title: 'Consultoría para cafeterías',
    desc: 'Acompañamiento en selección de café, ajuste de extracción y experiencia en taza.',
  },
  {
    icon: <GraduationCap className="w-6 h-6" />,
    title: 'Capacitación técnica',
    desc: 'Formación en tueste, catación, control de calidad y operación de planta.',
  },
  {
    icon: <ShieldCheck className="w-6 h-6" />,
    title: 'Control de calidad',
    desc: 'Evaluación sensorial, análisis de defectos y trazabilidad en cada lote tostado.',
  },
  {
    icon: <Star className="w-6 h-6" />,
    title: 'Empaque',
    desc: 'Empaque al vacío inmediato con etiquetado de trazabilidad y fecha de tueste.',
  },
];

const STATS = [
  { value: '100%', label: 'Café de origen colombiano' },
  { value: 'Micro', label: 'Tostados controlados por lote' },
  { value: 'SCA', label: 'Protocolos de calidad' },
  { value: 'Trazable', label: 'De la finca a la taza' },
];

/* ------------------------------------------------------------------ */
/*  Sub-components                                                    */
/* ------------------------------------------------------------------ */

function SectionHeader({
  eyebrow,
  title,
  subtitle,
  light = false,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  light?: boolean;
}) {
  return (
    <div className="max-w-3xl mx-auto text-center space-y-4 mb-12 md:mb-16">
      <span
        className={`inline-block px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest ${
          light
            ? 'bg-[#FFA42C]/15 text-[#FFA42C] border border-[#FFA42C]/25'
            : 'bg-[#FFA42C]/10 text-[#122C9B]'
        }`}
      >
        {eyebrow}
      </span>
      <h2
        className={`font-sans text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight ${
          light ? 'text-[#FFF9F5]' : 'text-[#122C9B]'
        }`}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className={`text-sm md:text-base leading-relaxed ${
            light ? 'text-[#FFF9F5]/70' : 'text-[#122C9B]/60'
          }`}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

function ServiceCard({
  icon,
  title,
  desc,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="group bg-white rounded-2xl p-6 md:p-8 border border-[#122C9B]/10 shadow-sm hover:shadow-xl hover:shadow-[#122C9B]/5 hover:border-[#FFA42C]/30 transition-all duration-300">
      <div className="flex items-start justify-between mb-6">
        <span className="p-3 bg-[#FFA42C]/10 text-[#FFA42C] rounded-xl inline-block">
          {icon}
        </span>
        <ArrowUpRight className="w-5 h-5 text-[#122C9B]/20 group-hover:text-[#FFA42C] transition-colors" />
      </div>
      <h3 className="font-sans text-lg font-bold text-[#122C9B] mb-2">{title}</h3>
      <p className="text-sm text-[#122C9B]/60 font-light leading-relaxed">{desc}</p>
    </div>
  );
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center px-4 py-6">
      <p className="font-sans text-3xl md:text-4xl font-black text-[#122C9B] mb-1">{value}</p>
      <p className="text-xs md:text-sm text-[#122C9B]/60 font-light uppercase tracking-wider">{label}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                         */
/* ------------------------------------------------------------------ */

export default function NuestraPlanta() {
  return (
    <div id="nuestra-planta-view" className="bg-[#FFF9F5]">
      {/* Hero */}
      <section className="relative min-h-[70vh] md:min-h-[80vh] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${HERO_IMAGE})` }}
        />
        <div className="absolute inset-0 bg-[#122C9B]/80" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#122C9B] via-transparent to-transparent" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 md:space-y-8 py-20">
          <span className="inline-block px-3 py-1 bg-[#FFA42C]/15 text-[#FFA42C] border border-[#FFA42C]/25 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest">
            Silvania, Cundinamarca
          </span>
          <h1 className="font-sans text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-[#FFF9F5] tracking-tight leading-[0.95]">
            Nuestra Planta
            <br />
            <span className="text-[#FFA42C]">de Tueste</span>
          </h1>
          <p className="max-w-2xl mx-auto text-base md:text-lg text-[#FFF9F5]/80 font-light leading-relaxed">
            En el corazón de Cundinamarca transformamos café verde de origen en lotes de especialidad.
            Tecnología, protocolos de calidad y un equipo apasionado por cada grano.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <a
              href="https://wa.me/573157307016?text=Hola%20Jaguar%20Coffee,%20quiero%20conocer%20los%20servicios%20de%20tueste%20de%20la%20planta%20en%20Silvania"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#FFA42C] hover:bg-[#FFA42C]/90 text-[#122C9B] font-bold rounded-2xl text-xs uppercase tracking-widest shadow-lg shadow-[#FFA42C]/30 transition-all"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Cotizar por WhatsApp</span>
            </a>
            <Link
              to="/contacto"
              className="inline-flex items-center gap-2 px-8 py-4 border border-[#FFF9F5]/30 hover:border-white text-[#FFF9F5] font-bold rounded-2xl text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
            >
              <span>Agendar visita</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="relative z-20 -mt-12 mx-4 sm:mx-6 lg:mx-8">
        <div className="max-w-6xl mx-auto bg-white rounded-3xl shadow-xl shadow-[#122C9B]/5 border border-[#122C9B]/10 grid grid-cols-2 md:grid-cols-4 divide-x divide-[#122C9B]/10">
          {STATS.map((stat) => (
            <Fragment key={stat.label}>
              <StatItem value={stat.value} label={stat.label} />
            </Fragment>
          ))}
        </div>
      </section>

      {/* Intro + Gallery */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <span className="inline-block px-3 py-1 bg-[#FFA42C]/10 text-[#122C9B] rounded-full text-[10px] font-mono font-bold uppercase tracking-widest">
                  Tecnología y pasión
                </span>
                <h2 className="font-sans text-3xl md:text-4xl font-extrabold text-[#122C9B] tracking-tight">
                  Cada lote cuenta una historia de origen
                </h2>
                <p className="text-base text-[#122C9B]/70 font-light leading-relaxed">
                  Nuestra planta en Silvania está diseñada para garantizar la trazabilidad y reproducibilidad
                  de cada lote. Desde la recepción del café verde hasta el empaque final, cada etapa sigue
                  protocolos rigurosos que preservan la calidad y potencian los atributos sensoriales de cada origen.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-4 bg-[#122C9B]/5 rounded-2xl border border-[#122C9B]/10">
                  <Leaf className="w-5 h-5 text-[#FFA42C] mt-0.5" />
                  <div>
                    <p className="font-bold text-[#122C9B] text-sm">Origen</p>
                    <p className="text-xs text-[#122C9B]/60 font-light">Fincas aliadas de Colombia</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-[#122C9B]/5 rounded-2xl border border-[#122C9B]/10">
                  <Truck className="w-5 h-5 text-[#FFA42C] mt-0.5" />
                  <div>
                    <p className="font-bold text-[#122C9B] text-sm">Logística</p>
                    <p className="text-xs text-[#122C9B]/60 font-light">Empaque al vacío inmediato</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative aspect-[4/3] rounded-3xl overflow-hidden border border-[#122C9B]/10 shadow-lg">
              <img
                src={GALLERY_IMAGE.src}
                alt={GALLERY_IMAGE.alt}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#122C9B]/40 to-transparent" />
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="Servicios"
            title="Lo que ofrecemos desde la planta"
            subtitle="Más que tueste: acompañamos a cafeterías, distribuidores y marcas en cada etapa del valor del café."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {SERVICES.map((service) => (
              <Fragment key={service.title}>
                <ServiceCard icon={service.icon} title={service.title} desc={service.desc} />
              </Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* Location + CTA */}
      <section className="py-20 md:py-28 bg-[#122C9B] relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/images/NUESTRA-PLANTA/pLANTA2.webp')] bg-cover bg-center mix-blend-overlay opacity-10" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="space-y-6 text-[#FFF9F5]">
              <span className="inline-block px-3 py-1 bg-[#FFA42C]/15 text-[#FFA42C] border border-[#FFA42C]/25 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest">
                Visítanos
              </span>
              <h2 className="font-sans text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight">
                ¿Necesitas tueste o asesoría?
              </h2>
              <p className="text-base md:text-lg text-[#FFF9F5]/70 font-light leading-relaxed">
                Nuestra planta se encuentra en Silvania, Cundinamarca, a pocos minutos de Bogotá. Recibimos
                visitas previa coordinación para conocer el proceso de tueste, hacer cataciones y definir
                perfiles personalizados.
              </p>

              <div className="flex items-start gap-4 pt-2">
                <div className="p-3 bg-[#FFA42C]/10 rounded-xl">
                  <MapPin className="w-5 h-5 text-[#FFA42C]" />
                </div>
                <div>
                  <p className="font-bold text-[#FFF9F5]">Silvania, Cundinamarca</p>
                  <p className="text-sm text-[#FFF9F5]/60 font-light">Lunes a Viernes, 8:00 a.m. - 5:00 p.m.</p>
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 md:p-10 space-y-6">
              <h3 className="font-sans text-xl font-bold text-[#FFF9F5]">Hablemos de tu proyecto</h3>
              <p className="text-sm text-[#FFF9F5]/70 font-light leading-relaxed">
                Escríbenos por WhatsApp y agenda una visita. Un asesor te ayudará a definir el mejor perfil
                para tu marca.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href="https://wa.me/573157307016?text=Hola%20Jaguar%20Coffee,%20quiero%20conocer%20los%20servicios%20de%20tueste%20de%20la%20planta%20en%20Silvania"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#25D366] hover:bg-[#128C7E] text-white font-bold rounded-2xl text-xs uppercase tracking-widest transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Cotizar por WhatsApp</span>
                </a>
                <Link
                  to="/contacto"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 border border-white/40 hover:border-white text-white font-bold rounded-2xl text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                  <span>Formulario de contacto</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
