'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
    <div className={`rounded-2xl overflow-hidden text-sm ${esCoach ? 'bg-gray-800 rounded-bl-sm' : 'bg-[#FF4500]/10 border border-[#FF4500]/30 rounded-br-sm'}`}>
      <div className="px-4 pt-3 pb-1 flex items-center gap-2">
        <span className="text-base">{icono}</span>
        <span className={`text-xs font-bold ${esCoach ? 'text-gray-400' : 'text-[#FF4500]'}`}>{plataforma}</span>
      </div>
      <p className="px-4 pb-1 text-xs text-gray-500 truncate max-w-[200px]">{url}</p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`block mx-3 mb-3 mt-1 text-center py-2 rounded-xl text-xs font-bold transition-colors ${
          esCoach
            ? 'bg-gray-700 hover:bg-gray-600 text-white'
            : 'bg-[#FF4500] hover:bg-[#e03d00] text-white'
        }`}
      >
        Ver en {plataforma} →
      </a>
    </div>
  );
}

export default function MensajesAtletaPage() {
  const router = useRouter();
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }

    fetch('/api/mensajes', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setMensajes(d.data ?? []))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  const handleEnviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!texto.trim()) return;
    setEnviando(true);
    const token = localStorage.getItem('token')!;

    const res = await fetch('/api/mensajes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ contenido: texto.trim() }),
    });

    if (res.ok) {
      const nuevo = await res.json();
      setMensajes((prev) => [...prev, nuevo]);
      setTexto('');
    }
    setEnviando(false);
  };

  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col">
      <nav className="border-b border-gray-800 px-6 py-4 flex justify-between items-center shrink-0">
        <Link href="/athlete/dashboard" className="text-xl font-black text-[#FF4500] tracking-widest">VALKYRIA</Link>
        <span className="text-sm text-[#FFB800] font-semibold">Mensajes</span>
      </nav>

      <div className="flex-1 flex flex-col overflow-hidden max-w-2xl w-full mx-auto">
        <div className="border-b border-gray-800 px-6 py-3 shrink-0">
          <p className="font-semibold">Chat con tu coach</p>
          <p className="text-xs text-gray-500">Mensajes privados con Yisus</p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {loading ? (
            <p className="text-gray-500 text-sm text-center mt-8">Cargando mensajes...</p>
          ) : mensajes.length === 0 ? (
            <p className="text-gray-600 text-sm text-center mt-8">Sin mensajes aún. Escríbele a tu coach.</p>
          ) : (
            mensajes.map((m) => {
              const esCoach = m.sender.rol === 'ADMIN';
              return (
                <div key={m.id} className={`flex ${esCoach ? 'justify-start' : 'justify-end'}`}>
                  <div className="max-w-xs lg:max-w-md">
                    {esCoach && (
                      <p className="text-xs text-gray-500 mb-1 font-semibold px-1">{m.sender.nombre}</p>
                    )}
                    {m.tipo === 'VIDEO_LINK' ? (
                      <VideoCard url={m.contenido} esCoach={esCoach} />
                    ) : (
                      <div className={`px-4 py-2.5 rounded-2xl text-sm ${esCoach ? 'bg-gray-800 text-gray-200 rounded-bl-sm' : 'bg-[#FF4500] text-white rounded-br-sm'}`}>
                        <p className="leading-relaxed whitespace-pre-wrap">{m.contenido}</p>
                      </div>
                    )}
                    <p className={`text-xs mt-1 px-1 ${esCoach ? 'text-gray-600' : 'text-gray-600 text-right'}`}>
                      {new Date(m.createdAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleEnviar} className="border-t border-gray-800 px-6 py-4 flex gap-3 shrink-0">
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escribe un mensaje..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#FF4500]"
          />
          <button type="submit" disabled={enviando || !texto.trim()}
            className="px-5 py-2.5 bg-[#FF4500] hover:bg-[#e03d00] text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
            {enviando ? '...' : 'Enviar'}
          </button>
        </form>
      </div>
    </div>
  );
}
