'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAthletes } from '@/app/hooks/useAthletes';

const EXP_LABEL: Record<string, string> = {
  principiante: 'Principiante',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado',
  elite: 'Élite',
};
const EXP_COLOR: Record<string, string> = {
  principiante: 'text-green-400 bg-green-400/10',
  intermedio:   'text-yellow-400 bg-yellow-400/10',
  avanzado:     'text-orange-400 bg-orange-400/10',
  elite:        'text-red-400 bg-red-400/10',
};

const FATIGA_CFG = {
  VERDE:    { ring: 'ring-green-500/50',  dot: 'bg-green-400',  text: 'text-green-400',  label: 'Óptimo' },
  AMARILLA: { ring: 'ring-yellow-500/50', dot: 'bg-yellow-400', text: 'text-yellow-400', label: 'Precaución' },
  ROJA:     { ring: 'ring-red-500/50',    dot: 'bg-red-400',    text: 'text-red-400',    label: 'Riesgo alto' },
};

const ENFASIS_COLOR: Record<string, { bg: string; text: string }> = {
  Hipertrofia:   { bg: 'bg-purple-500/20', text: 'text-purple-300' },
  'Fuerza Base': { bg: 'bg-blue-500/20',   text: 'text-blue-300' },
  Volumen:       { bg: 'bg-cyan-500/20',    text: 'text-cyan-300' },
  Peaking:       { bg: 'bg-[#FF4500]/20',  text: 'text-[#FF4500]' },
  Tapering:      { bg: 'bg-gray-500/20',   text: 'text-gray-400' },
};

function relDate(iso: string | null): string {
  if (!iso) return 'Sin sesiones';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  if (diff < 7) return `Hace ${diff}d`;
  return new Date(iso).toLocaleDateString('es', { day: '2-digit', month: 'short' });
}

function SessionDots({ count }: { count: number }) {
  return (
    <div className="flex gap-1 items-center">
      {[1, 2, 3, 4].map(i => (
        <span key={i} className={`w-1.5 h-1.5 rounded-full ${i <= count ? 'bg-[#FF4500]' : 'bg-gray-700'}`} />
      ))}
    </div>
  );
}

export default function AtletasPage() {
  const { atletas, dashMap, loading, toggleActivo } = useAthletes();
  const [expandido, setExpandido] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const handleToggle = async (atletaId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setToggling(atletaId);
    try {
      await toggleActivo(atletaId);
    } finally {
      setToggling(null);
    }
  };

  const activos = atletas.filter(a => a.user.activo).length;

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Atletas</h1>
            <p className="text-gray-600 text-sm mt-1">
              {atletas.length} registrado{atletas.length !== 1 ? 's' : ''} ·{' '}
              <span className="text-green-400">{activos} activo{activos !== 1 ? 's' : ''}</span>
              {atletas.length - activos > 0 && (
                <span className="text-gray-700"> · {atletas.length - activos} inactivo{atletas.length - activos !== 1 ? 's' : ''}</span>
              )}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-[#0f0f0f] border border-gray-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : atletas.length === 0 ? (
          <div className="text-center py-20 text-gray-700">
            <p className="text-lg mb-2">Sin atletas registrados</p>
            <p className="text-sm">Los atletas aparecerán aquí cuando se registren.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {atletas.map(a => {
              const dash = dashMap[a.id];
              const fatiga = dash ? FATIGA_CFG[dash.estadoFatiga] : null;
              const enfCfg = dash?.bloqueActual
                ? (ENFASIS_COLOR[dash.bloqueActual.enfasis] ?? ENFASIS_COLOR['Tapering'])
                : null;
              const isOpen = expandido === a.id;

              return (
                <div
                  key={a.id}
                  className={`border rounded-2xl overflow-hidden transition-all ${
                    a.user.activo
                      ? 'bg-[#0f0f0f] border-gray-800'
                      : 'bg-[#0a0a0a] border-gray-800/40 opacity-60'
                  }`}
                >
                  {/* Card header — always visible */}
                  <button
                    onClick={() => setExpandido(isOpen ? null : a.id)}
                    className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-white/[0.02] transition-colors"
                  >
                    {/* Avatar with fatigue ring */}
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-base shrink-0 ring-2 ${
                      fatiga ? fatiga.ring : 'ring-gray-800'
                    } ${
                      a.user.activo ? 'bg-[#FF4500]/15 text-[#FF4500]' : 'bg-gray-800/60 text-gray-600'
                    }`}>
                      {a.user.nombre[0].toUpperCase()}
                    </div>

                    {/* Name + badges + stats */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{a.user.nombre}</p>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${EXP_COLOR[a.experienciaPowerlifting] ?? EXP_COLOR.principiante}`}>
                          {EXP_LABEL[a.experienciaPowerlifting] ?? a.experienciaPowerlifting}
                        </span>
                        {enfCfg && dash?.bloqueActual && (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${enfCfg.bg} ${enfCfg.text}`}>
                            {dash.bloqueActual.enfasis}
                          </span>
                        )}
                        {!a.user.activo && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-500">Inactivo</span>
                        )}
                        {!(a.altura && a.edad) && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">Onboarding pendiente</span>
                        )}
                        {a.lesionesActuales.length > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-900/30 text-red-400">
                            {a.lesionesActuales.length} lesión{a.lesionesActuales.length > 1 ? 'es' : ''}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5">
                        <p className="text-xs text-gray-600">{relDate(dash?.ultimaSesion ?? null)}</p>
                        {dash && <SessionDots count={dash.sesionesEstaSemana} />}
                        {dash?.rpe7dias ? (
                          <p className={`text-xs font-semibold tabular-nums ${fatiga?.text}`}>
                            RPE {dash.rpe7dias}
                          </p>
                        ) : null}
                      </div>
                      {/* Plan activo visible sin expandir */}
                      {a.periodizaciones.length > 0 ? (
                        <p className="text-[11px] text-[#FF4500]/80 mt-1 truncate">
                          {a.periodizaciones[0].nombre}
                        </p>
                      ) : (
                        <p className="text-[11px] text-gray-700 mt-1">Sin plan activo</p>
                      )}
                    </div>

                    {/* 1RMs compact */}
                    <div className="hidden sm:flex items-center gap-3 shrink-0 text-right">
                      {(a.rmSquat || a.rmBench || a.rmDeadlift) ? (
                        <div className="flex gap-2">
                          {[
                            { k: 'SQ', v: a.rmSquat },
                            { k: 'BP', v: a.rmBench },
                            { k: 'DL', v: a.rmDeadlift },
                          ].map(({ k, v }) => v ? (
                            <div key={k} className="text-center">
                              <p className="text-[9px] text-gray-600 uppercase">{k}</p>
                              <p className="text-xs font-bold text-white tabular-nums">{v}</p>
                            </div>
                          ) : null)}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-700">Sin 1RM</p>
                      )}
                      <span className="text-gray-700 text-xs ml-1">{isOpen ? '▲' : '▼'}</span>
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isOpen && (
                    <div className="border-t border-gray-800/60 px-5 py-5">

                      {/* Physical stats */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
                        <Stat label="Peso" value={a.pesoActual ? `${a.pesoActual} kg` : '—'} />
                        <Stat label="Altura" value={a.altura ? `${a.altura} cm` : '—'} />
                        <Stat label="Edad" value={a.edad ? `${a.edad} años` : '—'} />
                        <Stat label="Categoría" value={a.categoriaPeso ?? '—'} />
                      </div>

                      {/* 1RMs */}
                      {(a.rmSquat || a.rmBench || a.rmDeadlift) && (
                        <div className="mb-5">
                          <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">1RM de referencia</p>
                          <div className="flex gap-5">
                            {a.rmSquat && (
                              <div>
                                <p className="text-[10px] text-gray-600">Sentadilla</p>
                                <p className="text-sm font-bold text-white">{a.rmSquat} kg</p>
                              </div>
                            )}
                            {a.rmBench && (
                              <div>
                                <p className="text-[10px] text-gray-600">Banca</p>
                                <p className="text-sm font-bold text-white">{a.rmBench} kg</p>
                              </div>
                            )}
                            {a.rmDeadlift && (
                              <div>
                                <p className="text-[10px] text-gray-600">Peso muerto</p>
                                <p className="text-sm font-bold text-white">{a.rmDeadlift} kg</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Email */}
                      <p className="text-xs text-gray-600 mb-4">{a.user.email}</p>

                      {/* Objectives */}
                      {a.objetivos.length > 0 && (
                        <div className="mb-4">
                          <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Objetivos</p>
                          <div className="flex flex-wrap gap-1.5">
                            {a.objetivos.map((o, i) => (
                              <span key={i} className="text-xs bg-gray-800/80 text-gray-300 px-2.5 py-1 rounded-full">{o}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Injuries */}
                      {a.lesionesActuales.length > 0 && (
                        <div className="mb-4">
                          <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Lesiones activas</p>
                          <div className="flex flex-wrap gap-1.5">
                            {a.lesionesActuales.map((l, i) => (
                              <span key={i} className="text-xs bg-red-900/30 text-red-400 px-2.5 py-1 rounded-full">{l}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Active plan */}
                      {a.periodizaciones.length > 0 && (
                        <div className="mb-5">
                          <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Plan activo</p>
                          {a.periodizaciones.map(p => (
                            <Link key={p.id} href={`/admin/periodizaciones/${p.id}`}
                              className="inline-flex items-center gap-1.5 text-sm text-[#FF4500] hover:text-[#FFB800] transition-colors font-medium">
                              {p.nombre} →
                            </Link>
                          ))}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 items-center pt-1">
                        <Link href={`/admin/atletas/${a.id}`}
                          className="text-sm px-4 py-2 bg-[#FF4500] hover:bg-[#e03d00] text-white font-semibold rounded-xl transition-colors">
                          Ver ficha
                        </Link>
                        <Link href={`/admin/atletas/${a.id}/progreso`}
                          className="text-sm px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-xl transition-colors">
                          Progreso
                        </Link>
                        <Link href={`/admin/periodizaciones/nueva-ia?atleta=${a.id}`}
                          className="text-sm px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-xl transition-colors">
                          Plan IA
                        </Link>
                        <Link href={`/admin/reportes?atleta=${a.id}`}
                          className="text-sm px-4 py-2 border border-gray-800 text-gray-500 hover:border-gray-600 hover:text-white rounded-xl transition-colors">
                          Reporte
                        </Link>
                        <Link href={`/admin/mensajes?atleta=${a.id}`}
                          className="text-sm px-4 py-2 border border-gray-800 text-gray-500 hover:border-gray-600 hover:text-white rounded-xl transition-colors">
                          Mensajes
                        </Link>

                        <button
                          onClick={(e) => handleToggle(a.id, e)}
                          disabled={toggling === a.id}
                          className={`ml-auto text-sm px-4 py-2 rounded-xl border font-semibold transition-colors disabled:opacity-40 ${
                            a.user.activo
                              ? 'border-red-800/50 text-red-400 hover:bg-red-900/20'
                              : 'border-green-800/50 text-green-400 hover:bg-green-900/20'
                          }`}
                        >
                          {toggling === a.id ? '...' : a.user.activo ? 'Inhabilitar' : 'Habilitar'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">{label}</p>
      <p className="font-semibold text-sm text-white">{value}</p>
    </div>
  );
}
