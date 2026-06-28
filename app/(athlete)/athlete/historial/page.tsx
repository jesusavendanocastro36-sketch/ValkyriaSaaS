'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type SetDetalle = { peso: number; reps: number; rpe: number };
type EjercicioDetalle = { nombre: string; tipo: string; sets: SetDetalle[] };

type SesionHistorial = {
  sesionId: string;
  fecha: string;
  movimientoPrincipal: string;
  diaSemana: string;
  numeroSemana: number;
  totalSets: number;
  tonelaje: number;
  rpePromedio: number;
  nota: string | null;
  ejercicios: EjercicioDetalle[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function movColor(mov: string): { dot: string; badge: string; label: string } {
  const m = mov.toLowerCase();
  if (m.includes('sentadilla') || m.includes('squat'))
    return { dot: 'bg-blue-500', badge: 'text-blue-300', label: 'SQ' };
  if (m.includes('muerto') || m.includes('deadlift') || m.includes('sumo'))
    return { dot: 'bg-orange-500', badge: 'text-orange-300', label: 'DL' };
  if (m.includes('banca') || m.includes('bench') || m.includes('press'))
    return { dot: 'bg-green-500', badge: 'text-green-300', label: 'BP' };
  return { dot: 'bg-[#FF4500]', badge: 'text-[#FF4500]', label: '—' };
}

function tipoColor(tipo: string): string {
  const t = tipo.toUpperCase();
  if (t === 'COMPETITIVO') return 'text-[#FF4500]';
  if (t === 'VARIANTE')    return 'text-blue-400';
  if (t === 'ACCESORIO')   return 'text-orange-400';
  return 'text-gray-500';
}

function rpeColor(rpe: number): string {
  if (rpe >= 9)   return 'text-red-400';
  if (rpe >= 8.5) return 'text-yellow-400';
  return 'text-green-400';
}

function formatFecha(fecha: string): string {
  return new Date(fecha + 'T12:00:00').toLocaleDateString('es-PE', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function HistorialPage() {
  const router = useRouter();
  const [sesiones, setSesiones] = useState<SesionHistorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandida, setExpandida] = useState<string | null>(null);
  const [cargandoMas, setCargandoMas] = useState(false);

  const fetchHistorial = useCallback(async (p: number, append = false) => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }

    if (append) setCargandoMas(true); else setLoading(true);

    try {
      const res = await fetch(`/api/athlete/historial?page=${p}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      setSesiones(prev => append ? [...prev, ...(d.sesiones ?? [])] : d.sesiones ?? []);
      setTotalPaginas(d.totalPaginas ?? 1);
      setTotal(d.total ?? 0);
      setPagina(p);
    } finally {
      setLoading(false);
      setCargandoMas(false);
    }
  }, [router]);

  useEffect(() => {
    const rol = localStorage.getItem('rol');
    if (rol !== 'ATHLETE') { router.push('/login'); return; }
    fetchHistorial(1);
  }, [router, fetchHistorial]);

  if (loading) return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center text-gray-600 text-sm">
      Cargando historial...
    </div>
  );

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <nav className="border-b border-gray-800 px-4 py-3 flex items-center justify-between sticky top-0 bg-[#080808] z-10">
        <Link href="/athlete/dashboard" className="text-gray-500 text-sm">← Inicio</Link>
        <span className="text-sm font-semibold text-[#FFB800]">Historial</span>
        <span className="text-xs text-gray-600">{total} sesiones</span>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-5">

        {sesiones.length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            <p className="text-4xl mb-3">🏋️</p>
            <p className="font-semibold">Aún no hay sesiones registradas</p>
            <p className="text-sm mt-1">Completa tu primera sesión para verla aquí</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sesiones.map((s) => {
              const col = movColor(s.movimientoPrincipal);
              const abierta = expandida === s.sesionId;

              return (
                <div key={`${s.sesionId}_${s.fecha}`} className="bg-[#0f0f0f] border border-gray-800 rounded-2xl overflow-hidden">

                  {/* Card header — always visible */}
                  <button
                    onClick={() => setExpandida(abierta ? null : s.sesionId)}
                    className="w-full px-4 py-4 text-left flex items-start gap-3"
                  >
                    {/* Color dot + date column */}
                    <div className="flex flex-col items-center gap-1.5 shrink-0 pt-0.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                      <div className="w-px flex-1 bg-gray-800 min-h-[20px]" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className={`text-[10px] font-black ${col.badge}`}>{col.label}</span>
                        <span className="text-[10px] text-gray-600 capitalize">{formatFecha(s.fecha)}</span>
                        <span className="text-[10px] text-gray-700">· S{s.numeroSemana}</span>
                      </div>
                      <p className="font-semibold text-sm leading-tight">{s.movimientoPrincipal}</p>

                      {/* Stats row */}
                      <div className="flex gap-3 mt-1.5 flex-wrap">
                        <span className="text-xs text-gray-600">
                          <span className="text-white font-semibold">{s.tonelaje.toLocaleString()}</span> kg
                        </span>
                        <span className="text-gray-700 text-xs">·</span>
                        <span className="text-xs text-gray-600">
                          <span className={`font-semibold ${rpeColor(s.rpePromedio)}`}>{s.rpePromedio}</span> RPE
                        </span>
                        <span className="text-gray-700 text-xs">·</span>
                        <span className="text-xs text-gray-600">
                          <span className="text-white font-semibold">{s.totalSets}</span> sets
                        </span>
                      </div>

                      {/* Note preview */}
                      {s.nota && !abierta && (
                        <p className="text-xs text-gray-600 italic mt-1.5 line-clamp-1">"{s.nota}"</p>
                      )}
                    </div>

                    <span className="text-gray-700 text-xs shrink-0 mt-1">{abierta ? '▲' : '▼'}</span>
                  </button>

                  {/* Expanded detail */}
                  {abierta && (
                    <div className="border-t border-gray-800 px-4 py-4 bg-[#080808]">

                      {/* Note */}
                      {s.nota && (
                        <div className="mb-4 px-3 py-2.5 rounded-xl bg-[#0f0f0f] border border-gray-800">
                          <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Tu nota</p>
                          <p className="text-xs text-gray-400 italic leading-relaxed">"{s.nota}"</p>
                        </div>
                      )}

                      {/* Exercises */}
                      <div className="space-y-3">
                        {s.ejercicios.map((ej) => {
                          const mejorRm = Math.max(
                            ...ej.sets.map(s =>
                              s.reps === 1 ? s.peso : Math.round(s.peso * (1 + s.reps / 30))
                            )
                          );
                          return (
                            <div key={ej.nombre}>
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className={`text-xs font-semibold ${tipoColor(ej.tipo)}`}>{ej.nombre}</span>
                                <span className="text-[9px] text-gray-700 uppercase">{ej.tipo.toLowerCase()}</span>
                              </div>
                              <div className="flex gap-1.5 flex-wrap">
                                {ej.sets.map((set, i) => (
                                  <div key={i} className="bg-[#1a1a1a] border border-gray-800 rounded-lg px-2.5 py-1.5 text-center">
                                    <p className="text-xs font-bold text-white">{set.peso}kg</p>
                                    <p className="text-[10px] text-gray-500">×{set.reps}</p>
                                    <p className={`text-[9px] ${rpeColor(set.rpe)}`}>RPE {set.rpe}</p>
                                  </div>
                                ))}
                              </div>
                              {mejorRm > 0 && (
                                <p className="text-[10px] text-gray-700 mt-1">1RM est.: {mejorRm} kg</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Load more */}
        {pagina < totalPaginas && (
          <button
            onClick={() => fetchHistorial(pagina + 1, true)}
            disabled={cargandoMas}
            className="mt-5 w-full py-3 rounded-xl border border-gray-800 text-gray-500 hover:text-white hover:border-gray-600 text-sm transition-colors disabled:opacity-50"
          >
            {cargandoMas ? 'Cargando...' : `Ver más sesiones (${total - sesiones.length} restantes)`}
          </button>
        )}

      </div>
    </div>
  );
}
