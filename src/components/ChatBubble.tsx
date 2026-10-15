import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Bot, RefreshCcw, Send, X } from 'lucide-react';

// -----------------------------------------------------------------------------
// Asistente Jaguar Coffee — chat propio (sin iframe de n8n desde 2026-10-15)
//
// - Habla con POST /api/chat (same-origin, streaming SSE).
// - El historial de la conversación vive en este componente; el servidor solo
//   guarda el historial anonimizado para que el modelo tenga contexto.
// - Si el backend/proveedor falla, cae con gracia a WhatsApp (nunca se rompe).
// -----------------------------------------------------------------------------

const SESSION_KEY = 'jaguar-chat-session';

const WA_LINK = 'https://wa.me/573157307016';
const WA_MSG = encodeURIComponent('Hola, vengo del chat del sitio. ');

const GREETING =
  '¡Hola! 👋 Soy el asistente de Jaguar Coffee. Puedo ayudarte con nuestro café de especialidad, las experiencias en Silvania y la Academia SCA. ¿Qué te interesa?';

const SUGGESTIONS = [
  { label: 'Cafés disponibles', prompt: '¿Qué cafés tienen disponibles y a qué precio?' },
  { label: 'Experiencias de café', prompt: 'Cuéntame sobre las experiencias de café y sus precios' },
  { label: 'Estadías caféteras', prompt: '¿Cómo funcionan el glamping y el eco-hostal? Precio y ubicación' },
  { label: 'Cursos SCA', prompt: '¿Qué cursos tiene la Academia y cuánto cuestan?' },
];

type Msg = { role: 'user' | 'assistant'; content: string };

const FALLBACK_MSG: Msg = {
  role: 'assistant',
  content:
    'Ahora mismo no puedo responder, pero te atiende una persona del equipo por WhatsApp: https://wa.me/573157307016 🐆',
};

// -----------------------------------------------------------------------------
// Render de texto simple: negritas **x**, links http(s) y saltos de línea.
// Deliberadamente limitado: el modelo escribe texto conversacional, no Markdown.
// -----------------------------------------------------------------------------
function renderContent(text: string) {
  const nodes: Array<ReactNode> = [];
  let key = 0;
  text.split(/\n/).forEach((line, i) => {
    if (i > 0) nodes.push(<br key={key++} />);
    // Parte la línea en tokens por negrita; dentro de cada parte, links por URL.
    const boldParts = line.split(/(\*\*[^*]+\*\*)/g);
    boldParts.forEach((bp) => {
      if (/^\*\*[^*]+\*\*$/.test(bp)) {
        nodes.push(<strong key={key++}>{bp.slice(2, -2)}</strong>);
        return;
      }
      // Links: solo http(s) y wa.me — nada de esquemas raros.
      const urlParts = bp.split(/(https?:\/\/[^\s)\]]+)/g);
      urlParts.forEach((up) => {
        if (/^https?:\/\//.test(up)) {
          try {
            const u = new URL(up);
            if (u.protocol === 'http:' || u.protocol === 'https:') {
              nodes.push(
                <a key={key++} href={up} target="_blank" rel="noopener noreferrer nofollow"
                  className="underline underline-offset-2 hover:text-[#FFA42C] transition-colors">
                  {up.replace(/^https?:\/\/(www\.)?/, '').replace('wa.me/', 'WhatsApp ')}
                </a>
              );
              return;
            }
          } catch { /* URL inválida: se imprime como texto */ }
        }
        if (up) nodes.push(<span key={key++}>{up}</span>);
      });
    });
  });
  return nodes;
}

// -----------------------------------------------------------------------------
// Conversación con el backend (SSE)
// -----------------------------------------------------------------------------
async function streamChat(sessionId: string, message: string, onDelta: (d: string) => void): Promise<void> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, message }),
  });

  if (!res.ok) throw new Error(`chat ${res.status}`);
  const ct = res.headers.get('content-type') ?? '';

  // Respuesta JSON (error de provedor con streaming no soportado por el CDN, etc.)
  if (!ct.includes('text/event-stream')) {
    const data = await res.json().catch(() => null);
    throw new Error(String(data?.error ?? 'chat error'));
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let sep;
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const evt = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      for (const line of evt.split('\n')) {
        const t = line.trim();
        if (!t.startsWith('data:')) continue;
        const payload = t.slice(5).trim();
        if (payload === '[DONE]') return;
        try {
          const json = JSON.parse(payload) as { delta?: string; error?: string };
          if (json.error) throw new Error('chat stream error');
          if (json.delta) onDelta(json.delta);
        } catch { /* fragmento incompleto: se ignora */ }
      }
    }
  }
}

// -----------------------------------------------------------------------------
// Componente
// -----------------------------------------------------------------------------
export default function ChatBubble() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([{ role: 'assistant', content: GREETING }]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const bottomRef = useRef<HTMLDivElement>(null);

  // Sesión anónima por navegador (el cliente la genera; el server solo la valida).
  useEffect(() => {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
      id = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, id);
    }
    setSessionId(id);
  }, []);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, open]);

  const send = useCallback(async (raw: string) => {
    const message = raw.trim();
    if (!message || busy || !sessionId) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: message }, { role: 'assistant', content: '' }]);
    setBusy(true);
    try {
      await streamChat(sessionId, message, (delta) => {
        setMessages(prev => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === 'assistant') next[next.length - 1] = { ...last, content: last.content + delta };
          return next;
        });
      });
    } catch {
      setMessages(prev => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === 'assistant' && last.content === '') next[next.length - 1] = FALLBACK_MSG;
        else next.push(FALLBACK_MSG);
        return next;
      });
    } finally {
      // Respuesta vacía del stream: se reemplaza por el fallback en vez de dejar un bubble en blanco.
      setMessages(prev => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === 'assistant' && last.content.trim() === '') next[next.length - 1] = FALLBACK_MSG;
        return next;
      });
      setBusy(false);
    }
  }, [busy, sessionId]);

  const resetConversation = useCallback(() => {
    const id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
    setSessionId(id);
    setMessages([{ role: 'assistant', content: GREETING }]);
  }, []);

  return (
    <>
      {open && (
        <div className="fixed bottom-40 right-6 z-50 w-[min(380px,calc(100vw-2rem))] h-[min(560px,calc(100vh-10rem))] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-[#122C9B]/10">

          {/* Encabezado brandeado */}
          <div className="flex items-center gap-3 px-4 py-3 bg-[#122C9B] text-white shrink-0">
            <img src="/images/logo-blanco.png" alt="Jaguar Coffee" className="w-9 h-9 object-contain" />
            <div className="flex-1 leading-tight">
              <p className="font-bold text-sm">Asistente Jaguar Coffee</p>
              <p className="text-[11px] text-white/70 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] inline-block" />
                En línea · Café de especialidad, Silvania
              </p>
            </div>
            <button onClick={resetConversation} aria-label="Nueva conversación"
              title="Nueva conversación"
              className="p-1.5 rounded-lg hover:bg-white/15 transition-colors">
              <RefreshCcw className="w-4 h-4" />
            </button>
            <button onClick={() => setOpen(false)} aria-label="Cerrar asistente"
              className="p-1.5 rounded-lg hover:bg-white/15 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Conversación */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[#FFF9F5]">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={
                  m.role === 'user'
                    ? 'max-w-[85%] bg-[#122C9B] text-white text-sm px-3.5 py-2.5 rounded-2xl rounded-br-md break-words'
                    : 'max-w-[90%] bg-white text-[#1a1a2e] text-sm px-3.5 py-2.5 rounded-2xl rounded-bl-md border border-[#122C9B]/10 shadow-sm break-words'
                }>
                  {m.content
                    ? renderContent(m.content)
                    : (i === messages.length - 1 && busy && (
                        <span className="flex gap-1 py-1" aria-label="El asistente está escribiendo">
                          <span className="w-1.5 h-1.5 bg-[#122C9B]/40 rounded-full animate-bounce [animation-delay:0ms]" />
                          <span className="w-1.5 h-1.5 bg-[#122C9B]/40 rounded-full animate-bounce [animation-delay:150ms]" />
                          <span className="w-1.5 h-1.5 bg-[#122C9B]/40 rounded-full animate-bounce [animation-delay:300ms]" />
                        </span>
                      ))}
                </div>
              </div>
            ))}

            {/* Chips de sugerencia: solo se muestran al inicio (solo saludo) */}
            {messages.length === 1 && !busy && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map(s => (
                  <button key={s.label} onClick={() => send(s.prompt)}
                    className="text-xs font-semibold text-[#122C9B] bg-white border border-[#122C9B]/20 rounded-full px-3 py-1.5 hover:bg-[#122C9B] hover:text-white hover:border-[#122C9B] transition-all">
                    {s.label}
                  </button>
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Contacto humano directo */}
          <a href={`${WA_LINK}?text=${WA_MSG}`} target="_blank" rel="noopener noreferrer"
            className="shrink-0 text-center text-[11px] text-[#122C9B]/70 bg-white border-t border-[#122C9B]/10 py-1.5 hover:text-[#FFA42C] transition-colors">
            ¿Prefieres una persona del equipo? Escríbenos por WhatsApp
          </a>

          {/* Input */}
          <form className="shrink-0 flex items-center gap-2 px-3 py-3 bg-white border-t border-[#122C9B]/10"
            onSubmit={(e) => { e.preventDefault(); send(input); }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
              }}
              placeholder={busy ? 'Escribiendo…' : 'Escribe tu pregunta…'}
              maxLength={1000}
              aria-label="Mensaje para el asistente"
              className="flex-1 text-sm px-3.5 py-2.5 rounded-xl border border-[#122C9B]/15 focus:outline-none focus:ring-2 focus:ring-[#FFA42C]/60 focus:border-[#122C9B]/30 transition-all bg-[#FFF9F5] placeholder:text-slate-400"
            />
            <button type="submit" disabled={busy || !input.trim() || !sessionId}
              aria-label="Enviar mensaje"
              className="bg-[#FFA42C] disabled:opacity-40 disabled:cursor-not-allowed text-white p-2.5 rounded-xl hover:bg-[#e89420] transition-all active:scale-95">
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Burbuja principal */}
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-24 right-6 z-40 bg-[#122C9B] text-white p-3.5 rounded-full shadow-lg hover:bg-[#0e2280] transition-all hover:scale-110 active:scale-95"
        aria-label={open ? 'Cerrar asistente' : 'Abrir asistente virtual'}
      >
        {open ? <X className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
      </button>
    </>
  );
}
