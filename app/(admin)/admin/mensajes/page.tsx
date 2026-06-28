'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

type Atleta = { id: string; user: { nombre: string } };

type Mensaje = {
  id: string;
  contenido: string;
  tipo: string;
  leido: boolean;
  createdAt: string;
  sender: { nombre: string; rol: string };
};

function isInstagram(url: string) {
  return url.includes('instagram.com') || url.includes('instagr.am');
}

function VideoCard({ url, esCoach }: { url: string; esCoach: boolean }) {
  const plataforma = isInstagram(url) ? 'Instagram' : 'Video';
  const icono = isInstagram(url) ? '📸' : '🎬';
  return (
    <div className={`rounded-2xl overflow-hidden text-sm ${esCoach ? 'bg-[#FF4500]/10 border border-[#FF4500]/30 rounded-br-sm' : 'bg-gray-800 rounded-bl-sm'}`}>
      <div className="px-4 pt-3 pb-1 flex items-center gap-2">
        <span className="text-base">{icono}</span>
        <span className={`text-xs font-bold ${esCoach ? 'text-[#FF4500]' : 'text-gray-400'}`}>{plataforma}</span>
      </div>
      <p className="px-4 pb-1 text-xs text-gray-500 truncate max-w-[200px]">{url}</p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`block mx-3 mb-3 mt-1 text-center py-2 rounded-xl text-xs font-bold transition-colors ${
          esCoach
            ? 'bg-[#FF4500] hover:bg-[#e03d00] text-white'
            : 'bg-gray-700 hover:bg-gray-600 text-white'
        }`}
      >
        Ver en {plataforma} →
      </a>
    </div>
  );
}

function MensajesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [atletas, setAtletas] = useState<Atleta[]>([]);
  const [atletaActivo, setAtletaActivo] = useState('');
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMensajes = useCallback((token: string, aid: string) => {
    fetch(`/api/mensajes?athlete_id=${aid}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setMensajes(d.data ?? []));
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }

    fetch('/api/atletas', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        const list: Atleta[] = d.data ?? [];
        setAtletas(list);
        const fromParam = searchParams.get('atleta');
        const initial = fromParam ?? list[0]?.id ?? '';
        setAtletaActivo(initial);
        if (initial) fetchMensajes(token, initial);
      });
  }, [router, searchParams, fetchMensajes]);

  useEffect(() => {
    if (!atletaActivo) return;
    const token = localStorage.getItem('token')!;
    fetchMensajes(token, atletaActivo);
  }, [atletaActivo, fetchMensajes]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  const handleEnviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!texto.trim() || !atletaActivo) return;
    setEnviando(true);
    const token = localStorage.getItem('token')!;
    const res = await fetch('/api/mensajes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ athlete_id: atletaActivo, contenido: texto.trim() }),
    });
    if (res.ok) {
      const nuevo = await res.json();
      setMensajes((prev) => [...prev, nuevo]);
      setTexto('');
    }
    setEnviando(false);
  };

  const atletaSeleccionado = atletas.find((a) => a.id === atletaActivo);

  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col">
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — athlete list */}
        <aside className="w-56 border-r border-gray-800 flex flex-col shrink-0">
          <p className="text-xs text-gray-500 uppercase tracking-wider px-4 py-3 border-b border-gray-800">Atletas</p>
          <div className="flex-1 overflow-y-auto">
            {atletas.map((a) => (
              <button
                key={a.id}
                onClick={() => setAtletaActivo(a.id)}
                className={`w-full px-4 py-3 text-left text-sm transition-colors ${atletaActivo === a.id ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-900 hover:text-white'}`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#FF4500]/20 flex items-center justify-center text-[#FF4500] font-bold text-xs shrink-0">
                    {a.user.nombre[0].toUpperCase()}
                  </div>
                  <span className="truncate">{a.user.nombre}</span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Chat area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Chat header */}
          <div className="border-b border-gray-800 px-6 py-3 shrink-0">
            <p className="font-semibold">{atletaSeleccionado?.user.nombre ?? 'Selecciona un atleta'}</p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            {mensajes.length === 0 ? (
              <p className="text-gray-600 text-sm text-center mt-8">Sin mensajes aún. Escribe el primero.</p>
            ) : (
              mensajes.map((m) => {
                const esCoach = m.sender.rol === 'ADMIN';
                return (
                  <div key={m.id} className={`flex ${esCoach ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-xs lg:max-w-md">
                      {!esCoach && (
                        <p className="text-xs text-gray-500 mb-1 font-semibold px-1">{m.sender.nombre}</p>
                      )}
                      {m.tipo === 'VIDEO_LINK' ? (
                        <VideoCard url={m.contenido} esCoach={esCoach} />
                      ) : (
                        <div className={`px-4 py-2.5 rounded-2xl text-sm ${esCoach ? 'bg-[#FF4500] text-white rounded-br-sm' : 'bg-gray-800 text-gray-200 rounded-bl-sm'}`}>
                          <p className="leading-relaxed whitespace-pre-wrap">{m.contenido}</p>
                        </div>
                      )}
                      <p className={`text-xs mt-1 px-1 ${esCoach ? 'text-gray-600 text-right' : 'text-gray-600'}`}>
                        {new Date(m.createdAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleEnviar} className="border-t border-gray-800 px-6 py-4 flex gap-3 shrink-0">
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={atletaSeleccionado ? `Mensaje para ${atletaSeleccionado.user.nombre}...` : 'Selecciona un atleta'}
              disabled={!atletaActivo}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#FF4500] disabled:opacity-50"
            />
            <button type="submit" disabled={enviando || !texto.trim() || !atletaActivo}
              className="px-5 py-2.5 bg-[#FF4500] hover:bg-[#e03d00] text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
              {enviando ? '...' : 'Enviar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function MensajesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#080808] flex items-center justify-center text-gray-500">Cargando...</div>}>
      <MensajesContent />
    </Suspense>
  );
}
