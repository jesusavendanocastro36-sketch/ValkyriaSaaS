'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type AthleteStats = {
  sesiones_semana: number;
  tonelaje_semana_kg: number;
  one_rm_squat: number | null;
  adherencia_pct: number | null;
  rpe_promedio_30d: number | null;
  plan_activo: string | null;
  plan_tipo: string | null;
  racha_dias: number;
  ultimos7: boolean[];
  fecha_competencia: string | null;
  dias_hasta_comp: number | null;
  progreso_plan: number | null;
};

type EjercicioHoy = {
  id: string;
  ejercicioNombre: string;
  tipoEjercicio: string;
  ordenGrupo: string | null;
  setsProgramados: number;
  repsProgramadas: number;
  rpeProgramado: number;
  pesoProgramado: number | null;
  restMinutos: number;
};

type TodaySession = {
  id: string;
  movimientoPrincipal: string;
  enfocuoDia: string | null;
  numeroSemana: number;
  ejercicios: EjercicioHoy[];
} | null;

type BloqueInfo = { nombre: string; enfasis: string } | null;

type SesionPendiente = {
  id: string;
  movimientoPrincipal: string;
  diaSemana: string;
  numeroSemana: number;
};

function movLabel(mov: string): string {
  const m = mov.toLowerCase();
  if (m.includes('sentadilla') || m.includes('squat')) return 'SQ';
  if (m.includes('muerto') || m.includes('deadlift') || m.includes('sumo')) return 'DL';
  if (m.includes('banca') || m.includes('bench') || m.includes('press')) return 'BP';
  return '—';
}

const STORAGE_KEY = (id: string) => `valkyria_sesion_${id}`;

export default function AthleteDashboard() {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [stats, setStats] = useState<AthleteStats | null>(null);
  const [sesionHoy, setSesionHoy] = useState<TodaySession | undefined>(undefined);
  const [bloqueHoy, setBloqueHoy] = useState<BloqueInfo>(null);
  const [semanaActual, setSemanaActual] = useState<number | null>(null);
  const [enProgreso, setEnProgreso] = useState(false);
  const [sesionesPendientes, setSesionesPendientes] = useState<SesionPendiente[]>([]);
  const [perfilCompleto, setPerfilCompleto] = useState<boolean | null>(null);

  useEffect(() => {
    const rol = localStorage.getItem('rol');
    if (rol !== 'ATHLETE') { router.push('/login'); return; }
    setNombre(localStorage.getItem('nombre') || 'Atleta');

    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    fetch('/api/athlete/perfil', { headers })
      .then(r => r.json())
      .then(d => setPerfilCompleto(!!(d.altura && d.edad)))
      .catch(() => setPerfilCompleto(true));

    fetch('/api/athlete/stats', { headers })
      .then(r => r.json())
      .then(setStats)
      .catch(() => {});

    fetch('/api/sesion/hoy', { headers })
      .then(r => r.json())
      .then(d => {
        const s = d.sesion ?? null;
        setSesionHoy(s);
        setBloqueHoy(d.bloque ?? null);
        setSemanaActual(d.semana_actual ?? null);
        setSesionesPendientes(d.sesiones_pendientes ?? []);
        if (s) setEnProgreso(!!localStorage.getItem(STORAGE_KEY(s.id)));
      })
      .catch(() => setSesionHoy(null));
  }, [router]);

  const handleLogout = () => { localStorage.clear(); router.push('/login'); };

  const fmt = (v: number | null | undefined, suffix = '') =>
    v != null ? `${v.toLocaleString('es-PE')}${suffix}` : '—';

  const sesionStats = sesionHoy ? (() => {
    const totalSets = sesionHoy.ejercicios.reduce((s, e) => s + e.setsProgramados, 0);
    const rpeMin = Math.min(...sesionHoy.ejercicios.map(e => e.rpeProgramado));
    const rpeMax = Math.max(...sesionHoy.ejercicios.map(e => e.rpeProgramado));
    const minEst = sesionHoy.ejercicios.reduce((s, e) => s + e.setsProgramados * (e.restMinutos + 1.5), 0);
    return { totalSets, rpeMin, rpeMax, minEst: Math.round(minEst) };
  })() : null;

  return (
    <div className="min-h-screen bg-[#080808] text-white">

      {/* Nav */}
      <nav className="border-b border-gray-800/60 px-5 py-4 flex justify-between items-center">
        <span className="text-base font-black text-[#FF4500] tracking-widest">VALKYRIA</span>
        <div className="flex items-center gap-4">
          <span className="text-gray-500 text-sm truncate max-w-[140px]">{nombre}</span>
          <button onClick={handleLogout} className="text-gray-600 hover:text-gray-300 text-sm transition-colors">
            Salir
          </button>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* Perfil incompleto */}
        {perfilCompleto === false && (
          <Link href="/athlete/onboarding"
            className="flex items-center justify-between border border-gray-700 rounded-xl px-4 py-3.5 hover:border-gray-600 transition-colors">
            <div>
              <p className="text-sm font-semibold text-white">Completa tu perfil</p>
              <p className="text-xs text-gray-500 mt-0.5">Tu coach necesita tus datos para crear tu plan</p>
            </div>
            <span className="text-gray-500 text-sm">→</span>
          </Link>
        )}

        {/* Plan + semana */}
        {stats?.plan_activo && (
          <div className="border border-gray-800/60 rounded-xl px-4 py-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-600 uppercase tracking-wider mb-1">Plan activo</p>
                <p className="text-sm font-semibold text-white truncate">{stats.plan_activo}</p>
              </div>
              {semanaActual && (
                <span className="text-sm font-bold text-[#FF4500] shrink-0">Sem. {semanaActual}</span>
              )}
            </div>
            {stats.progreso_plan != null && (
              <>
                <div className="flex justify-between text-xs text-gray-600 mb-1.5">
                  <span>{stats.progreso_plan}% completado</span>
                  {stats.dias_hasta_comp != null && (
                    <span>{stats.dias_hasta_comp} días para competencia</span>
                  )}
                </div>
                <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#FF4500] rounded-full transition-all"
                    style={{ width: `${stats.progreso_plan}%` }}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* Sesiones pendientes */}
        {sesionesPendientes.length > 0 && (
          <div className="space-y-2">
            {sesionesPendientes.map(p => (
              <Link key={p.id} href={`/athlete/sesion/${p.id}`}
                className="flex items-center justify-between border border-gray-700 rounded-xl px-4 py-3 hover:border-gray-500 transition-colors">
                <div>
                  <p className="text-sm font-semibold text-white">Sesión pendiente</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {p.movimientoPrincipal} · {p.diaSemana.charAt(0).toUpperCase() + p.diaSemana.slice(1)} · Sem. {p.numeroSemana}
                  </p>
                </div>
                <span className="text-[#FF4500] text-sm">→</span>
              </Link>
            ))}
          </div>
        )}

        {/* Sesión de hoy */}
        {sesionHoy === undefined ? (
          <div className="h-40 bg-[#0d0d0d] border border-gray-800/50 rounded-xl animate-pulse" />
        ) : sesionHoy ? (() => {
          const s = sesionStats!;
          const label = movLabel(sesionHoy.movimientoPrincipal);
          const byGroup = sesionHoy.ejercicios.reduce<Record<string, EjercicioHoy[]>>((acc, e) => {
            const g = e.ordenGrupo?.[0] ?? '—';
            if (!acc[g]) acc[g] = [];
            acc[g].push(e);
            return acc;
          }, {});
          const groupKeys = Object.keys(byGroup).sort();

          return (
            <div className="border border-gray-800 rounded-xl overflow-hidden">
              {/* Header */}
              <div className="px-4 pt-4 pb-3 border-b border-gray-800/60">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#FF4500]/15 text-[#FF4500]">
                        {label}
                      </span>
                      {bloqueHoy && (
                        <span className="text-[11px] text-gray-500">{bloqueHoy.enfasis}</span>
                      )}
                      {enProgreso && (
                        <span className="text-[11px] px-2 py-0.5 rounded bg-gray-800 text-gray-400">
                          En progreso
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg font-bold leading-tight">{sesionHoy.movimientoPrincipal}</h2>
                    {sesionHoy.enfocuoDia && (
                      <p className="text-gray-500 text-sm mt-0.5">{sesionHoy.enfocuoDia}</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-4 mb-3 text-sm text-gray-500">
                  <span><span className="text-white font-semibold">{sesionHoy.ejercicios.length}</span> ejercicios</span>
                  <span><span className="text-white font-semibold">{s.totalSets}</span> sets</span>
                  <span>RPE <span className="text-white font-semibold">{s.rpeMin === s.rpeMax ? s.rpeMin : `${s.rpeMin}–${s.rpeMax}`}</span></span>
                  <span>~<span className="text-white font-semibold">{s.minEst}</span> min</span>
                </div>

                <Link
                  href={`/athlete/sesion/${sesionHoy.id}`}
                  className="flex items-center justify-center w-full py-3 rounded-lg font-bold text-sm transition-all active:scale-[0.98] bg-[#FF4500] hover:bg-[#e03d00] text-white"
                >
                  {enProgreso ? 'Continuar sesión' : 'Empezar sesión'} →
                </Link>
              </div>

              {/* Exercise list */}
              <div className="px-4 py-3 space-y-3">
                {groupKeys.map(g => (
                  <div key={g}>
                    <p className="text-[10px] text-gray-700 uppercase tracking-widest mb-1.5">
                      {g === '—' ? 'Ejercicios' : `Bloque ${g}`}
                    </p>
                    <div className="space-y-1">
                      {byGroup[g].map((e, i) => (
                        <div key={i} className="flex items-center gap-2.5 py-0.5">
                          <span className="text-[11px] text-gray-700 w-4 shrink-0 font-mono">{i + 1}</span>
                          <span className="text-sm text-gray-300 flex-1 truncate">{e.ejercicioNombre}</span>
                          <div className="flex items-center gap-2 shrink-0 text-xs text-gray-600">
                            <span className="font-mono">{e.setsProgramados}×{e.repsProgramadas}</span>
                            {e.pesoProgramado && (
                              <span className="text-gray-500">{e.pesoProgramado} kg</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })() : stats?.plan_activo ? (
          <div className="border border-gray-800/50 rounded-xl p-5 text-center">
            <p className="text-white font-semibold text-sm mb-1">Día de descanso</p>
            <p className="text-gray-500 text-xs mb-3">No hay sesión programada para hoy.</p>
            <Link href="/athlete/periodizacion"
              className="text-xs text-[#FF4500] hover:underline">
              Ver mi plan →
            </Link>
          </div>
        ) : (
          <div className="border border-gray-800/50 rounded-xl p-6">
            <p className="text-white font-semibold text-sm mb-1">Sin plan de entrenamiento</p>
            <p className="text-gray-500 text-xs leading-relaxed mb-4">
              Tu coach todavía no asignó un plan. Completa tu perfil para que pueda comenzar.
            </p>
            <div className="flex flex-col gap-2">
              <Link href="/athlete/mensajes"
                className="w-full text-center bg-[#FF4500] hover:bg-[#e03d00] text-white font-bold py-2.5 rounded-lg text-sm transition-colors">
                Escribirle al coach
              </Link>
              {perfilCompleto === false && (
                <Link href="/athlete/onboarding"
                  className="w-full text-center border border-gray-700 hover:border-gray-500 text-gray-300 font-semibold py-2.5 rounded-lg text-sm transition-colors">
                  Completar mi perfil →
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Racha */}
        {stats && stats.racha_dias > 0 && (
          <div className="border border-gray-800/60 rounded-xl px-4 py-3.5 flex items-center gap-4">
            <div className="shrink-0 text-center w-12">
              <p className="text-2xl font-black text-white leading-none">{stats.racha_dias}</p>
              <p className="text-[10px] text-gray-600 uppercase mt-0.5">días</p>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white mb-2">
                {stats.racha_dias >= 30 ? 'Racha legendaria' :
                 stats.racha_dias >= 14 ? 'Racha de élite' :
                 stats.racha_dias >= 7  ? 'Una semana seguida' :
                 stats.racha_dias >= 3  ? 'En ritmo' : 'Racha activa'}
              </p>
              {stats.ultimos7 && (
                <div className="flex gap-1.5">
                  {stats.ultimos7.map((activo, i) => (
                    <div key={i} className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                      activo ? 'bg-[#FF4500] text-white' : 'bg-gray-900 border border-gray-800'
                    }`}>
                      {activo ? '✓' : ''}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="border border-gray-800/60 rounded-xl p-4">
            <p className="text-gray-600 text-xs uppercase tracking-wider mb-1.5">Sesiones semana</p>
            <p className="text-2xl font-black text-white">{fmt(stats?.sesiones_semana)}</p>
          </div>
          <div className="border border-gray-800/60 rounded-xl p-4">
            <p className="text-gray-600 text-xs uppercase tracking-wider mb-1.5">Tonelaje semana</p>
            <p className="text-2xl font-black text-white">{fmt(stats?.tonelaje_semana_kg)}<span className="text-sm font-normal text-gray-600"> kg</span></p>
          </div>
          <div className="border border-gray-800/60 rounded-xl p-4">
            <p className="text-gray-600 text-xs uppercase tracking-wider mb-1.5">1RM Squat est.</p>
            <p className="text-2xl font-black text-[#FF4500]">{fmt(stats?.one_rm_squat)}<span className="text-sm font-normal text-gray-600"> kg</span></p>
          </div>
          <div className="border border-gray-800/60 rounded-xl p-4">
            <p className="text-gray-600 text-xs uppercase tracking-wider mb-1.5">RPE prom. 30d</p>
            <p className={`text-2xl font-black ${
              (stats?.rpe_promedio_30d ?? 0) > 8.7 ? 'text-red-400' :
              (stats?.rpe_promedio_30d ?? 0) > 8.5 ? 'text-yellow-400' : 'text-white'
            }`}>{fmt(stats?.rpe_promedio_30d)}</p>
          </div>
        </div>

        {/* Adherencia */}
        {stats?.adherencia_pct != null && (
          <div className="border border-gray-800/60 rounded-xl px-4 py-3.5">
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs text-gray-600 uppercase tracking-wider">Adherencia</p>
              <p className={`text-sm font-bold ${
                stats.adherencia_pct >= 80 ? 'text-white' :
                stats.adherencia_pct >= 60 ? 'text-yellow-400' : 'text-red-400'
              }`}>{Math.round(stats.adherencia_pct)}%</p>
            </div>
            <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  stats.adherencia_pct >= 80 ? 'bg-[#FF4500]' :
                  stats.adherencia_pct >= 60 ? 'bg-yellow-400' : 'bg-red-400'
                }`}
                style={{ width: `${Math.min(stats.adherencia_pct, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Links rápidos */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Mi Plan',   sub: 'Bloque activo',      href: '/athlete/periodizacion' },
            { label: 'Progreso',  sub: '1RM y tonelaje',     href: '/athlete/progreso' },
            { label: 'Historial', sub: 'Sesiones pasadas',   href: '/athlete/historial' },
            { label: 'Mensajes',  sub: 'Coach',              href: '/athlete/mensajes' },
          ].map(l => (
            <Link key={l.label} href={l.href}
              className="border border-gray-800/60 hover:border-gray-700 rounded-xl p-4 flex items-center justify-between transition-colors active:scale-[0.97]">
              <div>
                <p className="text-sm font-semibold text-white">{l.label}</p>
                <p className="text-[11px] text-gray-600 mt-0.5">{l.sub}</p>
              </div>
              <span className="text-gray-700 text-sm">→</span>
            </Link>
          ))}
        </div>

      </div>
    </div>
  );
}
