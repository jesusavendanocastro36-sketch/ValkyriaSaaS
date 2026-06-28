'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Protocolo = {
  id: string;
  externalId: string;
  nombre: string;
  subtitulo: string | null;
  categoria: string;
  bloques: string[];
  nivel: string;
  descripcion: string;
  objetivo: string;
  cuandoUsarlo: string;
  comoEjecutar: string;
  errores: string;
  ejemplo: string;
  advertencia: string;
  progresion: { sem: string; sch: string; pct: string; rir: string; nota?: string }[];
};

const CAT_LABEL: Record<string, string> = {
  basico: 'Básico',
  rpe: 'RPE / Autorregulación',
  avanzado: 'Avanzado',
  tecnica: 'Técnica',
};

const CAT_COLOR: Record<string, string> = {
  basico: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  rpe: 'text-[#FF4500] bg-[#FF4500]/10 border-[#FF4500]/20',
  avanzado: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  tecnica: 'text-green-400 bg-green-400/10 border-green-400/20',
};

const NIVEL_COLOR: Record<string, string> = {
  principiante: 'text-green-400',
  intermedio: 'text-[#FFB800]',
  avanzado: 'text-orange-400',
  todos: 'text-gray-400',
};

const BLOQUE_LABEL: Record<string, string> = {
  H: 'Hipertrofia',
  F: 'Fuerza Base',
  V: 'Volumen',
  P: 'Peaking',
  T: 'Tapering',
};

const CATEGORIAS = ['basico', 'rpe', 'avanzado', 'tecnica'];

export default function ProtocolosPage() {
  const router = useRouter();
  const [protocolos, setProtocolos] = useState<Protocolo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroNivel, setFiltroNivel] = useState('');
  const [expandido, setExpandido] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }

    const params = new URLSearchParams();
    if (filtroCategoria) params.set('categoria', filtroCategoria);
    if (filtroNivel) params.set('nivel', filtroNivel);

    fetch(`/api/protocolos-rv?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setProtocolos(d.data ?? []))
      .finally(() => setLoading(false));
  }, [router, filtroCategoria, filtroNivel]);

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">Protocolos Método RV</h1>
          <p className="text-gray-500 text-sm">Sistema de entrenamiento Rubén Castro · {protocolos.length} protocolos</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={filtroCategoria}
            onChange={e => setFiltroCategoria(e.target.value)}
            className="bg-gray-900 border border-gray-700 text-sm text-white rounded-lg px-3 py-2 focus:outline-none focus:border-[#FF4500]"
          >
            <option value="">Todas las categorías</option>
            {CATEGORIAS.map(c => (
              <option key={c} value={c}>{CAT_LABEL[c]}</option>
            ))}
          </select>

          <select
            value={filtroNivel}
            onChange={e => setFiltroNivel(e.target.value)}
            className="bg-gray-900 border border-gray-700 text-sm text-white rounded-lg px-3 py-2 focus:outline-none focus:border-[#FF4500]"
          >
            <option value="">Todos los niveles</option>
            {['principiante', 'intermedio', 'avanzado', 'todos'].map(n => (
              <option key={n} value={n}>{n.charAt(0).toUpperCase() + n.slice(1)}</option>
            ))}
          </select>

          {(filtroCategoria || filtroNivel) && (
            <button
              onClick={() => { setFiltroCategoria(''); setFiltroNivel(''); }}
              className="text-sm text-gray-500 hover:text-white transition-colors px-3 py-2"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-gray-500">Cargando...</p>
        ) : (
          <div className="space-y-3">
            {protocolos.map((p) => (
              <div key={p.id} className={`border rounded-xl overflow-hidden transition-all ${
                expandido === p.id ? 'border-gray-600' : 'border-gray-800'
              } bg-gray-900`}>
                <button
                  onClick={() => setExpandido(expandido === p.id ? null : p.id)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <span className="text-xs font-mono text-gray-600 mt-0.5 shrink-0">{p.externalId.toUpperCase()}</span>
                    <div>
                      <p className="font-semibold text-white">{p.nombre}</p>
                      {p.subtitulo && <p className="text-gray-500 text-sm mt-0.5">{p.subtitulo}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <span className={`text-xs px-2 py-1 rounded border ${CAT_COLOR[p.categoria] ?? 'text-gray-400 bg-gray-800 border-gray-700'}`}>
                      {CAT_LABEL[p.categoria] ?? p.categoria}
                    </span>
                    <span className={`text-xs font-medium ${NIVEL_COLOR[p.nivel] ?? 'text-gray-400'}`}>
                      {p.nivel.charAt(0).toUpperCase() + p.nivel.slice(1)}
                    </span>
                    <span className="text-gray-600 ml-1">{expandido === p.id ? '▲' : '▼'}</span>
                  </div>
                </button>

                {expandido === p.id && (
                  <div className="border-t border-gray-800 px-6 py-5 space-y-5">
                    {/* Bloques */}
                    {p.bloques.length > 0 && (
                      <div className="flex gap-2">
                        {p.bloques.map((b) => (
                          <span key={b} className="text-xs bg-white/5 border border-white/10 text-gray-300 px-2 py-1 rounded">
                            {BLOQUE_LABEL[b] ?? b}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Description grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <Section title="Descripción" content={p.descripcion} />
                      <Section title="Objetivo" content={p.objetivo} />
                      <Section title="¿Cuándo usarlo?" content={p.cuandoUsarlo} />
                      <Section title="Cómo ejecutarlo" content={p.comoEjecutar} />
                      <Section title="Errores comunes" content={p.errores} color="text-red-400" />
                      <Section title="Ejemplo" content={p.ejemplo} color="text-[#FFB800]" />
                    </div>

                    {/* Advertencia */}
                    {p.advertencia && (
                      <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg px-4 py-3">
                        <p className="text-xs text-yellow-400 uppercase tracking-wider font-semibold mb-1">Advertencia</p>
                        <p className="text-sm text-yellow-200/80">{p.advertencia}</p>
                      </div>
                    )}

                    {/* Progression table */}
                    {Array.isArray(p.progresion) && p.progresion.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Progresión sugerida</p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-800">
                                <th className="text-left text-gray-500 text-xs pb-2 pr-4">Semana</th>
                                <th className="text-left text-gray-500 text-xs pb-2 pr-4">Series × Reps</th>
                                <th className="text-left text-gray-500 text-xs pb-2 pr-4">Carga</th>
                                <th className="text-left text-gray-500 text-xs pb-2 pr-4">RIR / RPE</th>
                                <th className="text-left text-gray-500 text-xs pb-2">Nota</th>
                              </tr>
                            </thead>
                            <tbody>
                              {p.progresion.map((row, i) => (
                                <tr key={i} className="border-b border-gray-800/50">
                                  <td className="py-2 pr-4 text-gray-400 text-xs font-semibold whitespace-nowrap">{row.sem}</td>
                                  <td className="py-2 pr-4 text-[#FF4500] font-mono text-xs whitespace-nowrap">{row.sch}</td>
                                  <td className="py-2 pr-4 text-gray-300 text-xs whitespace-nowrap">{row.pct}</td>
                                  <td className="py-2 pr-4 text-[#FFB800] font-mono text-xs whitespace-nowrap">{row.rir}</td>
                                  <td className="py-2 text-gray-500 text-xs">{row.nota ?? '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, content, color = 'text-gray-300' }: { title: string; content: string; color?: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">{title}</p>
      <p className={`text-sm leading-relaxed ${color}`}>{content}</p>
    </div>
  );
}
