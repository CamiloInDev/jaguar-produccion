import React from 'react';
import { Link } from 'react-router-dom';
import { Scale } from 'lucide-react';
// Fuente única: el mismo TERMINOS.md de la raíz del repo, empaquetado como texto por Vite.
import terminosMd from '../../TERMINOS.md?raw';

/** Negrita **x** y enlaces [t](url) dentro de una línea. */
function inline(text: string, key: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1]) {
      parts.push(<strong key={`${key}-b${i++}`} className="font-bold text-[#122C9B]">{m[1]}</strong>);
    } else {
      const href = m[3];
      const cls = 'font-bold text-[#FFA42C] hover:text-[#3D5FC9] underline underline-offset-2';
      parts.push(href.startsWith('/')
        ? <Link key={`${key}-l${i++}`} to={href} className={cls}>{m[2]}</Link>
        : <a key={`${key}-l${i++}`} href={href} target="_blank" rel="noopener noreferrer" className={cls}>{m[2]}</a>);
    }
    last = re.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

/** Renderizador mínimo del subconjunto de Markdown que usa TERMINOS.md. */
function renderMarkdown(md: string): React.ReactNode[] {
  const lines = md.replace(/<!--[\s\S]*?-->/g, '').split(/\r?\n/);
  const out: React.ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let para: string[] = [];

  const flushPara = () => {
    if (para.length) {
      const k = `p${out.length}`;
      out.push(<p key={k} className="text-sm text-[#122C9B]/70 font-light leading-relaxed">{inline(para.join(' '), k)}</p>);
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      const k = `l${out.length}`;
      const items = list.items.map((it, j) => <li key={`${k}-${j}`}>{inline(it, `${k}-${j}`)}</li>);
      const cls = 'text-sm text-[#122C9B]/70 font-light leading-relaxed space-y-1.5 pl-5';
      out.push(list.ordered
        ? <ol key={k} className={`list-decimal ${cls}`}>{items}</ol>
        : <ul key={k} className={`list-disc ${cls}`}>{items}</ul>);
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flushPara(); flushList(); continue; }
    if (line.startsWith('# ')) { flushPara(); flushList(); continue; } // el título lo pone el encabezado de la página
    if (line.startsWith('## ') || line.startsWith('### ')) {
      flushPara(); flushList();
      const k = `h${out.length}`;
      out.push(line.startsWith('## ')
        ? <h2 key={k} className="font-sans text-lg font-bold text-[#122C9B] pt-4">{inline(line.slice(3), k)}</h2>
        : <h3 key={k} className="font-sans text-base font-bold text-[#122C9B] pt-2">{inline(line.slice(4), k)}</h3>);
      continue;
    }
    const ul = /^- (.*)$/.exec(line);
    const ol = /^\d+\. (.*)$/.exec(line);
    if (ul || ol) {
      flushPara();
      const ordered = !!ol;
      if (!list || list.ordered !== ordered) { flushList(); list = { ordered, items: [] }; }
      list.items.push((ul ?? ol)![1]);
      continue;
    }
    flushList();
    para.push(line);
  }
  flushPara();
  flushList();
  return out;
}

const contenido = renderMarkdown(terminosMd);

export default function Terminos() {
  return (
    <div id="terminos-view" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <div className="text-center space-y-4">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FFA42C]/10 text-[#122C9B] rounded-full text-xs font-bold font-mono tracking-wider uppercase">
          <Scale className="w-4 h-4" />
          Condiciones de compra
        </span>
        <h1 className="font-sans text-3xl sm:text-4xl font-extrabold text-[#122C9B] tracking-tight">
          Términos y Condiciones
        </h1>
        <p className="text-sm text-[#122C9B]/60 font-light max-w-2xl mx-auto leading-relaxed">
          Envíos, pagos, derecho de retracto, garantías y reclamos, según el Estatuto del Consumidor (Ley 1480 de 2011).
        </p>
      </div>

      <div className="bg-white border border-[#122C9B]/10 rounded-2xl p-6 sm:p-10 shadow-sm space-y-4">
        {contenido}
      </div>
    </div>
  );
}
