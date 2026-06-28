'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

// ── Types ─────────────────────────────────────────────────────────────────────

type MusculoData = {
  totalSeries: number;
  seriesPorSemana: number;
  ejercicios: string[];
  estado: 'sin_estimulo' | 'bajo_mv' | 'mantenimiento' | 'ok' | 'optimo' | 'sobre_mrv';
};

type Alerta = {
  tipo: 'error' | 'advertencia' | 'info';
  musculo: string;
  mensaje: string;
};

type Bloque = {
  id: string;
  nombre: string;
  numeroBloque: number;
  semanaInicio: number;
  semanaFin: number;
  semanas: number;
  enfasis: string;
  musculosData: Record<string, MusculoData>;
  alertas: Alerta[];
  totalSesiones: number;
  totalEjercicios: number;
};

type Periodizacion = { id: string; nombre: string; tipo: string };

type ApiResponse = {
  periodizacion: Periodizacion;
  bloques: Bloque[];
  umbrales: Record<string, { mv: number; mev: number; mav: number; mrv: number }>;
  musculosPrincipales: string[];
};

// ── Constants ─────────────────────────────────────────────────────────────────

const ESTADO_CONFIG = {
  sin_estimulo:  { label: 'Sin estímulo',     color: 'bg-red-500',      text: 'text-red-400',     border: 'border-red-500/40'     },
  bajo_mv:       { label: 'Bajo MV',          color: 'bg-red-400',      text: 'text-red-300',     border: 'border-red-400/40'     },
  mantenimiento: { label: 'Mantenimiento',    color: 'bg-orange-500',   text: 'text-orange-400',  border: 'border-orange-500/40'  },
  ok:            { label: 'En rango',         color: 'bg-[#FFB800]',    text: 'text-[#FFB800]',   border: 'border-[#FFB800]/40'   },
  optimo:        { label: 'Óptimo',           color: 'bg-green-500',    text: 'text-green-400',   border: 'border-green-500/40'   },
  sobre_mrv:     { label: 'Cerca del MRV',    color: 'bg-purple-500',   text: 'text-purple-400',  border: 'border-purple-500/40'  },
};

const ALERTA_CONFIG = {
  error:       { bg: 'bg-red-500/5 border-red-500/20',     icon: '🚫', text: 'text-red-400'     },
  advertencia: { bg: 'bg-orange-500/5 border-orange-500/20', icon: '⚠', text: 'text-orange-400' },
  info:        { bg: 'bg-purple-500/5 border-purple-500/20', icon: 'ℹ', text: 'text-purple-400' },
};

const MUSCULOS_ICONO: Record<string, string> = {
  'cuádriceps':     'SQ',
  'isquiotibiales': 'DL',
  'glúteos':        'HP',
  'espalda baja':   'EB',
  'espalda alta':   'EA',
  'pecho':          'BP',
  'hombros':        'SH',
  'tríceps':        'TR',
  'bíceps':         'BI',
  'core':           'CO',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function VolumenMuscularPage() {
  const router = useRouter();
  const params = useParams();
  const atletaId = params.id as string;

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bloqueActivo, setBloqueActivo] = useState<string | null>(null);
  const [expandedMusculo, setExpandedMusculo] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const rol = localStorage.getItem('rol');
    if (!token || rol !== 'ADMIN') { router.push('/login'); return; }

    fetch(`/api/atletas/${atletaId}/volumen-muscular`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        setData(d);
        if (d.bloques?.length > 0) setBloqueActivo(d.bloques[0].id);
      })
      .catch(() => setError('Error al cargar datos'))
      .finally(() => setLoading(false));
  }, [atletaId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#FF4500] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#080808] text-white flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400">{error || 'Sin datos'}</p>
        <Link href={`/admin/atletas/${atletaId}`} className="text-sm text-[#FF4500] hover:underline">
          ← Volver a la ficha
        </Link>
      </div>
    );
  }

  const bloque = data.bloques.find(b => b.id === bloqueActivo) ?? data.bloques[0];
  const errores = bloque?.alertas.filter(a => a.tipo === 'error') ?? [];
  const advertencias = bloque?.alertas.filter(a => a.tipo === 'advertencia') ?? [];
  const infos = bloque?.alertas.filter(a => a.tipo === 'info') ?? [];

  // Sort muscles: principal first, then others
  const musculosPrincipales = data.musculosPrincipales;
  const musculosBloque = Object.keys(bloque?.musculosData ?? {});
  const otrosMuscs = musculosBloque.filter(m => !musculosPrincipales.includes(m));
  const todosMuscs = [...musculosPrincipales, ...otrosMuscs];

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">

        {/* Back + Header */}
        <Link href={`/admin/atletas/${atletaId}`} className="inline-flex items-center gap-1.5 text-gray-500 hover:text-white text-sm transition-colors mb-6">
          ← Ficha del atleta
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Volumen Muscular</h1>
            <p className="text-gray-500 text-sm mt-0.5">{data.periodizacion.nombre} · {data.periodizacion.tipo}</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Sin estímulo
            <span className="w-2 h-2 rounded-full bg-red-400 inline-block ml-2" /> Bajo MV
            <span className="w-2 h-2 rounded-full bg-orange-500 inline-block ml-2" /> Mantenimiento
            <span className="w-2 h-2 rounded-full bg-[#FFB800] inline-block ml-2" /> En rango
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block ml-2" /> Óptimo
            <span className="w-2 h-2 rounded-full bg-purple-500 inline-block ml-2" /> Cerca MRV
          </div>
        </div>

        {/* Block selector */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-6">
          {data.bloques.map(b => (
            <button
              key={b.id}
              onClick={() => { setBloqueActivo(b.id); setExpandedMusculo(null); }}
              className={`shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                bloqueActivo === b.id
                  ? 'bg-[#FF4500]/10 border-[#FF4500]/40 text-[#FF4500]'
                  : 'bg-gray-900 border-gray-800 text-gray-500 hover:text-white hover:border-gray-700'
              }`}
            >
              <span className="text-[10px] text-gray-600 block leading-none mb-0.5">Bloque {b.numeroBloque}</span>
              {b.nombre}
              {b.alertas.filter(a => a.tipo === 'error').length > 0 && (
                <span className="ml-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold inline-flex items-center justify-center">
                  {b.alertas.filter(a => a.tipo === 'error').length}
                </span>
              )}
            </button>
          ))}
        </div>

        {bloque && (
          <>
            {/* Block info */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Duración</p>
                <p className="text-lg font-bold text-white">{bloque.semanas} sem</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Sesiones</p>
                <p className="text-lg font-bold text-white">{bloque.totalSesiones}</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Ejercicios</p>
                <p className="text-lg font-bold text-white">{bloque.totalEjercicios}</p>
              </div>
            </div>

            {/* Alert panel */}
            {(errores.length > 0 || advertencias.length > 0 || infos.length > 0) && (
              <div className="space-y-2 mb-6">
                {errores.length > 0 && (
                  <div className="bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3">
                    <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2">
                      🚫 {errores.length} músculo{errores.length > 1 ? 's' : ''} sin estimulación
                    </p>
                    <ul className="space-y-1">
                      {errores.map((a, i) => (
                        <li key={i} className="text-sm text-red-300">{a.mensaje}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {advertencias.length > 0 && (
                  <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl px-4 py-3">
                    <p className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-2">
                      ⚠ {advertencias.length} músculo{advertencias.length > 1 ? 's' : ''} bajo el MEV
                    </p>
                    <ul className="space-y-1">
                      {advertencias.map((a, i) => (
                        <li key={i} className="text-sm text-orange-300">{a.mensaje}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {infos.length > 0 && (
                  <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl px-4 py-3">
                    <p className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-2">
                      ℹ {infos.length} músculo{infos.length > 1 ? 's' : ''} cerca del MRV
                    </p>
                    <ul className="space-y-1">
                      {infos.map((a, i) => (
                        <li key={i} className="text-sm text-purple-300">{a.mensaje}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* No alerts — all good */}
            {bloque.alertas.length === 0 && bloque.totalEjercicios > 0 && (
              <div className="bg-green-500/5 border border-green-500/20 rounded-xl px-4 py-3 mb-6 flex items-center gap-3">
                <span className="text-green-400 text-lg">✓</span>
                <p className="text-sm text-green-300 font-semibold">Todos los grupos musculares principales están bien estimulados en este bloque.</p>
              </div>
            )}

            {/* No exercises yet */}
            {bloque.totalEjercicios === 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-8 mb-6 text-center text-gray-600">
                <p className="text-lg mb-1">Bloque sin ejercicios</p>
                <p className="text-sm">Agrega ejercicios al bloque para ver el análisis de volumen.</p>
              </div>
            )}

            {/* Muscle volume bars */}
            {bloque.totalEjercicios > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-3">Series por semana (promedio del bloque)</p>

                {todosMuscs.map(musculo => {
                  const mData = bloque.musculosData[musculo];
                  const isPrincipal = musculosPrincipales.includes(musculo);
                  const umbrales = data.umbrales[musculo];
                  const spw = mData?.seriesPorSemana ?? 0;
                  const estado = mData?.estado ?? 'sin_estimulo';
                  const cfg = ESTADO_CONFIG[estado];
                  const isExpanded = expandedMusculo === musculo;

                  // Bar width: cap at MRV or 24 series for visual scale
                  const scale = umbrales ? umbrales.mrv + 4 : 24;
                  const barWidth = Math.min((spw / scale) * 100, 100);
                  const mvPct = umbrales ? (umbrales.mv / scale) * 100 : 0;
                  const mevPct = umbrales ? (umbrales.mev / scale) * 100 : 0;
                  const mavPct = umbrales ? (umbrales.mav / scale) * 100 : 0;
                  const mrvPct = umbrales ? (umbrales.mrv / scale) * 100 : 0;

                  return (
                    <div
                      key={musculo}
                      className={`border rounded-xl overflow-hidden transition-all ${cfg.border} ${
                        isPrincipal ? 'bg-gray-900' : 'bg-gray-900/50'
                      }`}
                    >
                      <button
                        onClick={() => setExpandedMusculo(isExpanded ? null : musculo)}
                        className="w-full px-4 py-3 text-left"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          {/* Muscle badge */}
                          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded shrink-0 ${cfg.text} bg-current/10`}
                            style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>
                            <span className={cfg.text}>{MUSCULOS_ICONO[musculo] ?? musculo.slice(0, 2).toUpperCase()}</span>
                          </span>
                          <span className={`text-sm font-semibold capitalize flex-1 ${isPrincipal ? 'text-white' : 'text-gray-400'}`}>
                            {musculo}
                          </span>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className={`text-xs font-bold ${cfg.text}`}>
                              {spw > 0 ? `${spw} series/sem` : '0 series'}
                            </span>
                            {umbrales && spw > 0 && (
                              <span className="text-[10px] text-gray-600">
                                MEV {umbrales.mev} · MAV {umbrales.mav} · MRV {umbrales.mrv}
                              </span>
                            )}
                            <span className="text-gray-700 text-xs">{isExpanded ? '▲' : '▼'}</span>
                          </div>
                        </div>

                        {/* Bar */}
                        <div className="relative h-3 bg-gray-800 rounded-full overflow-hidden">
                          {/* Fill */}
                          <div
                            className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${cfg.color}`}
                            style={{ width: `${barWidth}%`, opacity: spw > 0 ? 0.85 : 0.3 }}
                          />
                          {/* MV marker */}
                          {umbrales && (
                            <div className="absolute inset-y-0 w-px bg-gray-700" style={{ left: `${mvPct}%` }} title={`MV: ${umbrales.mv}`} />
                          )}
                          {/* MEV marker */}
                          {umbrales && (
                            <div className="absolute inset-y-0 w-px bg-gray-600" style={{ left: `${mevPct}%` }} title={`MEV: ${umbrales.mev}`} />
                          )}
                          {/* MAV marker */}
                          {umbrales && (
                            <div className="absolute inset-y-0 w-px bg-gray-500" style={{ left: `${mavPct}%` }} title={`MAV: ${umbrales.mav}`} />
                          )}
                          {/* MRV marker */}
                          {umbrales && (
                            <div className="absolute inset-y-0 w-px bg-gray-400" style={{ left: `${mrvPct}%` }} title={`MRV: ${umbrales.mrv}`} />
                          )}
                        </div>

                        {/* MEV/MAV/MRV labels under bar */}
                        {umbrales && (
                          <div className="relative mt-0.5 h-3">
                            <span className="absolute text-[9px] text-gray-700 -translate-x-1/2" style={{ left: `${mvPct}%` }}>MV</span>
                            <span className="absolute text-[9px] text-gray-700 -translate-x-1/2" style={{ left: `${mevPct}%` }}>MEV</span>
                            <span className="absolute text-[9px] text-gray-600 -translate-x-1/2" style={{ left: `${mavPct}%` }}>MAV</span>
                            <span className="absolute text-[9px] text-gray-500 -translate-x-1/2" style={{ left: `${mrvPct}%` }}>MRV</span>
                          </div>
                        )}
                      </button>

                      {/* Expanded: list of exercises */}
                      {isExpanded && (
                        <div className="border-t border-gray-800/60 px-4 py-3">
                          {mData?.ejercicios && mData.ejercicios.length > 0 ? (
                            <>
                              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Ejercicios que estimulan este músculo</p>
                              <div className="flex flex-wrap gap-2">
                                {mData.ejercicios.map((ej, i) => (
                                  <span key={i} className="text-xs bg-gray-800 text-gray-300 px-2.5 py-1 rounded-full">{ej}</span>
                                ))}
                              </div>
                              <p className="text-[10px] text-gray-600 mt-3">
                                Total en el bloque: <span className="text-white font-semibold">{mData.totalSeries} series</span> en {bloque.semanas} semanas
                              </p>
                            </>
                          ) : (
                            <p className="text-sm text-gray-600">No hay ejercicios detectados para este músculo en el bloque.</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Reference table */}
            {bloque.totalEjercicios > 0 && (
              <div className="mt-8 border border-gray-800 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-800 bg-gray-900/40">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Referencia de umbrales (series/semana)</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-800/60 bg-gray-900/20">
                        <th className="text-left px-4 py-2 text-gray-600 font-semibold uppercase tracking-wider">Músculo</th>
                        <th className="text-center px-4 py-2 text-red-300/70 font-semibold">MV</th>
                        <th className="text-center px-4 py-2 text-orange-400/70 font-semibold">MEV</th>
                        <th className="text-center px-4 py-2 text-[#FFB800]/70 font-semibold">MAV</th>
                        <th className="text-center px-4 py-2 text-purple-400/70 font-semibold">MRV</th>
                        <th className="text-center px-4 py-2 text-gray-400 font-semibold">Actual</th>
                        <th className="text-center px-4 py-2 text-gray-400 font-semibold">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/40">
                      {musculosPrincipales.map(musculo => {
                        const u = data.umbrales[musculo];
                        const mData = bloque.musculosData[musculo];
                        const spw = mData?.seriesPorSemana ?? 0;
                        const estado = mData?.estado ?? 'sin_estimulo';
                        const cfg = ESTADO_CONFIG[estado];
                        return (
                          <tr key={musculo} className="hover:bg-gray-800/20 transition-colors">
                            <td className="px-4 py-2.5 font-semibold text-gray-300 capitalize">{musculo}</td>
                            <td className="px-4 py-2.5 text-center text-red-300">{u?.mv ?? '—'}</td>
                            <td className="px-4 py-2.5 text-center text-orange-400">{u?.mev ?? '—'}</td>
                            <td className="px-4 py-2.5 text-center text-[#FFB800]">{u?.mav ?? '—'}</td>
                            <td className="px-4 py-2.5 text-center text-purple-400">{u?.mrv ?? '—'}</td>
                            <td className={`px-4 py-2.5 text-center font-bold ${cfg.text}`}>{spw}</td>
                            <td className="px-4 py-2.5 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.text} border ${cfg.border}`}>
                                {cfg.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="px-5 py-3 border-t border-gray-800 bg-gray-900/20">
                  <p className="text-[10px] text-gray-700">
                    MV = Volumen de Mantenimiento · MEV = Mínimo Volumen Efectivo · MAV = Máximo Volumen Adaptativo · MRV = Máximo Volumen Recuperable.
                    Conteo fraccionado: músculo primario = serie completa, secundario = media serie.
                    Basado en Israetel et al. y ajustado al contexto de powerlifting del Método RV.
                  </p>
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}
