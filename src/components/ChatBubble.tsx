import { useState } from 'react';
import { Bot, X } from 'lucide-react';

// n8n Chat Trigger: URL pública que ya renderiza su propio widget de chat
// (n8n sirve una página HTML completa con @n8n/chat cargado del lado de ellos).
const N8N_CHAT_URL = 'https://n8n.skatmaskacore.com/webhook/61ddeb53-8db2-40aa-a601-c01d435fba67/chat';

export default function ChatBubble() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && (
        <div className="fixed bottom-40 right-6 z-50 w-[min(380px,calc(100vw-2rem))] h-[min(560px,calc(100vh-10rem))] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-[#122C9B]/10">
          <div className="flex items-center justify-between px-4 py-3 bg-[#122C9B] text-white shrink-0">
            <span className="font-bold text-sm">Asistente Jaguar Coffee</span>
            <button
              onClick={() => setOpen(false)}
              aria-label="Cerrar asistente"
              className="hover:opacity-70 transition-opacity"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <iframe
            src={N8N_CHAT_URL}
            title="Asistente Jaguar Coffee"
            className="flex-1 w-full border-0"
          />
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-24 right-6 z-40 bg-[#122C9B] text-white p-3.5 rounded-full shadow-lg hover:bg-[#0e2280] transition-all hover:scale-110 active:scale-95"
        aria-label={open ? 'Cerrar asistente' : 'Abrir asistente virtual'}
      >
        {open ? <X className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
      </button>
    </>
  );
}
