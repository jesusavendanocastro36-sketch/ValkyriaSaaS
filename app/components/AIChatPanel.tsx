'use client';

import { useEffect, useRef, useState } from 'react';

type Atleta = { id: string; user: { nombre: string } };
type Message = { role: 'user' | 'assistant'; text: string };

export default function AIChatPanel() {
  const [open, setOpen] = useState(false);
  const [atletas, setAtletas] = useState<Atleta[]>([]);
  const [selectedAtleta, setSelectedAtleta] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : '');

  useEffect(() => {
    if (!open) return;
    const token = getToken();
    fetch('/api/atletas', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        const lista = d.data ?? [];
        setAtletas(lista);
        if (lista.length > 0 && !selectedAtleta) setSelectedAtleta(lista[0].id);
      });
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async () => {
    const msg = input.trim();
    if (!msg || loading) return;

    const userMsg: Message = { role: 'user', text: msg };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          message: msg,
          athlete_id: selectedAtleta || undefined,
          history: messages,
        }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', text: data.reply ?? 'Sin respuesta.' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Error de conexión. Intenta de nuevo.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const atletaActual = atletas.find(a => a.id === selectedAtleta);

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#FF4500] hover:bg-[#e03d00] rounded-full shadow-lg flex items-center justify-center transition-all"
        title="Valkyria AI"
      >
        {open ? (
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] max-h-[620px] flex flex-col bg-[#111] border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-[#1a1a1a] border-b border-gray-800 px-4 py-3 flex items-center justify-between shrink-0">
            <div>
              <p className="font-bold text-sm text-[#FF4500] tracking-wider">VALKYRIA AI</p>
              <p className="text-xs text-gray-500">Powered by Gemini · Método RV</p>
            </div>
            {atletas.length > 0 && (
              <select
                value={selectedAtleta}
                onChange={e => {
                  setSelectedAtleta(e.target.value);
                  setMessages([]);
                }}
                className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-[#FF4500] max-w-[140px]"
              >
                {atletas.map(a => (
                  <option key={a.id} value={a.id}>{a.user.nombre}</option>
                ))}
              </select>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <p className="text-2xl mb-2">🏋️</p>
                <p className="text-gray-400 text-sm font-semibold">
                  {atletaActual ? `Contexto cargado: ${atletaActual.user.nombre}` : 'Selecciona un atleta'}
                </p>
                <p className="text-gray-600 text-xs mt-1">
                  Preguntame sobre el plan, progresión de carga, fatiga o cualquier decisión de entrenamiento.
                </p>
                <div className="mt-4 space-y-2">
                  {[
                    'El 3x3 de esta semana se vio bien, ¿subimos peso?',
                    '¿Cómo va el RPE comparado con lo programado?',
                    'El atleta se queja de fatiga, ¿qué hacemos?',
                  ].map(s => (
                    <button
                      key={s}
                      onClick={() => setInput(s)}
                      className="block w-full text-left text-xs text-gray-500 hover:text-gray-300 bg-gray-800/50 hover:bg-gray-800 rounded-lg px-3 py-2 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-[#FF4500] text-white rounded-br-md'
                      : 'bg-gray-800 text-gray-100 rounded-bl-md'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3 flex gap-1.5">
                  <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-800 px-3 py-3 shrink-0">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Pregunta sobre el entrenamiento..."
                rows={1}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#FF4500] resize-none"
                style={{ maxHeight: '100px', overflowY: 'auto' }}
              />
              <button
                onClick={send}
                disabled={!input.trim() || loading}
                className="bg-[#FF4500] hover:bg-[#e03d00] disabled:opacity-40 text-white rounded-xl px-3 py-2 transition-colors shrink-0"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-gray-700 mt-1.5 text-center">Enter para enviar · Shift+Enter para nueva línea</p>
          </div>
        </div>
      )}
    </>
  );
}
