'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Ejercicio = {
  id: string;
  ejercicioNombre: string;
  tipoEjercicio: string;
  ordenGrupo: string | null;
  cargaRef: string | null;
  rirLabel: string | null;
  setsProgramados: number;
  repsProgramadas: number;
  rpeProgramado: number;
  pesoProgramado: number | null;
  restMinutos: number;
  notasTecnicas: string | null;
  videoUrl: string | null;
};
type Sesion = {
  id: string;
  diaSemana: string;
  numeroSemana: number;
  movimientoPrincipal: string;
  enfocuoDia: string;
  descripcion: string | null;
  bloqueado: boolean;
  ejercicios: Ejercicio[];
};
type Bloque = {
  id: string;
  nombre: string;
  semanaInicio: number;
  semanaFin: number;
  intensidadRpeMin: number;
  intensidadRpeMax: number;
  enfasis: string;
  sesiones: Sesion[];
};
type Periodizacion = {
  id: string;
  nombre: string;
  tipo: string;
  objetivo: string;
  fechaInicio: string;
  fechaFin: string;
  duracionSemanas: number;
  semanaMaxVisible: number | null;
  bloques: Bloque[];
};

const DIAS_ORDER = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
const DIA_LABEL: Record<string, string> = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles',
  jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo',
};

const TYPE_COLOR: Record<string, string> = {
  COMPETITIVO:  'text-[#FF4500]',
  VARIANTE:     'text-[#FFB800]',
  AUXILIAR:     'text-gray-400',
  ACCESORIO:    'text-gray-400',
  COMPENSATORIO:'text-gray-400',
  MOVILIDAD:    'text-green-400',
};
const TYPE_LABEL: Record<string, string> = {
  COMPETITIVO:  'Comp.',
  VARIANTE:     'Var.',
  AUXILIAR:     'Aux.',
  ACCESORIO:    'Aux.',
  COMPENSATORIO:'Comp+',
  MOVILIDAD:    'Mov.',
};

function EjercicioCard({ ej, dim }: { ej: Ejercicio; dim?: boolean }) {
  const [open, setOpen] = useState(false);
  const color = TYPE_COLOR[ej.tipoEjercicio] ?? 'text-gray-400';
  const label = TYPE_LABEL[ej.tipoEjercicio] ?? ej.tipoEjercicio;
  const hasExtra = ej.cargaRef || ej.rirLabel || ej.notasTecnicas || ej.videoUrl;

  return (
    <div className={`rounded-lg overflow-hidden border border-gray-800/50 transition-opacity ${dim ? 'opacity-50' : 'bg-[#0d0d0d]'}`}>
      <button
        onClick={() => hasExtra && setOpen(o => !o)}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left ${hasExtra ? 'hover:bg-white/[0.02] transition-colors' : 'cursor-default'}`}
      >
        {ej.ordenGrupo && (
          <span className="text-[10px] text-gray-600 w-5 shrink-0 font-mono">{ej.ordenGrupo}</span>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{ej.ejercicioNombre}</p>
          <p className={`text-[11px] mt-0.5 ${color}`}>{label}</p>
        </div>
        <div className="shrink-0 text-right">
          {ej.pesoProgramado ? (
            <p className="text-white font-semibold text-sm">
              {ej.pesoProgramado}<span className="text-gray-600 font-normal text-xs"> kg</span>
            </p>
          ) : null}
          <p className="text-gray-600 text-xs mt-0.5">
            {ej.setsProgramados}×{ej.repsProgramadas} · RPE {ej.rpeProgramado}
          </p>
        </div>
        {hasExtra && (
          <span className={`text-gray-700 text-[10px] shrink-0 ml-1 transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
        )}
      </button>

      {open && hasExtra && (
        <div className="px-4 pb-3 pt-2 border-t border-gray-800/40 space-y-2">
          {ej.notasTecnicas && (
            <p className="text-xs text-gray-500 leading-relaxed">{ej.notasTecnicas}</p>
          )}
          <div className="flex flex-wrap gap-3 text-xs text-gray-600">
            {ej.restMinutos > 0 && (
              <span>Descanso: <span className="text-gray-400">{ej.restMinutos} min</span></span>
            )}
            {ej.rirLabel && <span>{ej.rirLabel}</span>}
            {ej.cargaRef && <span>{ej.cargaRef}</span>}
          </div>
          {ej.videoUrl && (
            <a href={ej.videoUrl} target="_blank" rel="noopener noreferrer"
              className="inline-block text-xs text-[#FF4500] hover:underline">
              Ver referencia →
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default function MiPeriodizacion() {
  const router = useRouter();
  const [plan, setPlan] = useState<Periodizacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [bloqueAbierto, setBloqueAbierto] = useState<string | null>(null);
  const [semanaActual, setSemanaActual] = useState(1);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }

    fetch('/api/periodizaciones', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(async d => {
        const activa = d.data?.[0];
        if (!activa) return;
        const detail = await fetch(`/api/periodizaciones/${activa.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.json());
        setPlan(detail);

        const start = new Date(detail.fechaInicio);
        const now = new Date();
        const timeBased = Math.max(1, Math.floor((now.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1);
        const effective = detail.semanaMaxVisible ? Math.min(timeBased, detail.semanaMaxVisible) : timeBased;
        setSemanaActual(effective);

        const current = detail.bloques.find((b: Bloque) => effective >= b.semanaInicio && effective <= b.semanaFin);
        if (current) setBloqueAbierto(current.id);
      })
      .finally(() => setLoading(false));
  }, [router]);

  function unlockDate(semana: number): Date {
    const d = new Date(plan!.fechaInicio);
    d.setDate(d.getDate() + (semana - 1) * 7);
    return d;
  }

  if (loading) return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center text-gray-600 text-sm">
      Cargando...
    </div>
  );
  if (!plan) return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col items-center justify-center gap-2">
      <p className="text-gray-400">Sin periodización activa</p>
      <p className="text-gray-600 text-sm">Tu coach publicará tu plan pronto.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <nav className="border-b border-gray-800/60 px-5 py-4 flex justify-between items-center">
        <Link href="/athlete/dashboard" className="text-base font-black text-[#FF4500] tracking-widest">
          VALKYRIA
        </Link>
        <span className="text-sm text-gray-500">Semana {semanaActual} / {plan.duracionSemanas}</span>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Plan header */}
        <div>
          <h1 className="text-xl font-bold text-white">{plan.nombre}</h1>
          <p className="text-gray-500 text-sm mt-1">{plan.objetivo}</p>
          <div className="mt-3 h-1 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#FF4500] rounded-full"
              style={{ width: `${Math.min(100, (semanaActual / plan.duracionSemanas) * 100)}%` }}
            />
          </div>
        </div>

        {/* Blocks */}
        <div className="space-y-2">
          {plan.bloques.map(bloque => {
            const isActual = semanaActual >= bloque.semanaInicio && semanaActual <= bloque.semanaFin;
            const todayDia = DIAS_ORDER[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
            const sesionHoy = bloque.sesiones.find(
              s => s.diaSemana === todayDia && s.numeroSemana === semanaActual
            );

            return (
              <div key={bloque.id} className={`border rounded-xl overflow-hidden ${isActual ? 'border-gray-700' : 'border-gray-800/50'}`}>
                {/* Block header */}
                <button
                  onClick={() => setBloqueAbierto(bloqueAbierto === bloque.id ? null : bloque.id)}
                  className="w-full bg-[#0d0d0d] px-5 py-4 flex justify-between items-center text-left hover:bg-[#111] transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-white">{bloque.nombre}</span>
                      {isActual && (
                        <span className="text-[10px] bg-[#FF4500] text-white px-2 py-0.5 rounded font-bold">
                          ACTUAL
                        </span>
                      )}
                    </div>
                    <p className="text-gray-500 text-xs mt-0.5">
                      Sem. {bloque.semanaInicio}–{bloque.semanaFin} · RPE {bloque.intensidadRpeMin}–{bloque.intensidadRpeMax}
                    </p>
                  </div>
                  <span className={`text-gray-600 text-sm transition-transform ${bloqueAbierto === bloque.id ? 'rotate-180' : ''}`}>▾</span>
                </button>

                {bloqueAbierto === bloque.id && (
                  <div className="bg-[#080808] px-4 pt-4 pb-5 space-y-6">

                    {/* CTA sesión de hoy */}
                    {isActual && sesionHoy && (
                      <Link
                        href={`/athlete/sesion/${sesionHoy.id}`}
                        className="flex items-center justify-between w-full bg-[#FF4500] hover:bg-[#e03d00] text-white font-bold py-3 px-5 rounded-lg transition-colors"
                      >
                        <span>Sesión de hoy — {sesionHoy.movimientoPrincipal}</span>
                        <span>→</span>
                      </Link>
                    )}

                    {/* Sessions by day */}
                    {DIAS_ORDER.map(dia => {
                      const sesiones = bloque.sesiones.filter(s => s.diaSemana === dia);
                      if (sesiones.length === 0) return null;
                      return (
                        <div key={dia}>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                            {DIA_LABEL[dia] ?? dia}
                          </p>
                          <div className="space-y-4">
                            {sesiones.map(sesion => {
                              const esFuturaPorTiempo = sesion.numeroSemana > semanaActual;
                              const esBloqueada = sesion.bloqueado;
                              const esFutura = esFuturaPorTiempo || esBloqueada;
                              const fecha = unlockDate(sesion.numeroSemana);
                              const fechaLabel = fecha.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });

                              const movil = sesion.ejercicios.filter(e => e.tipoEjercicio === 'MOVILIDAD');
                              const principales = sesion.ejercicios.filter(e => e.tipoEjercicio !== 'MOVILIDAD');

                              return (
                                <div key={sesion.id}>
                                  {/* Session row */}
                                  <div className="flex items-start justify-between mb-2 gap-3">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold text-white truncate">
                                        {sesion.movimientoPrincipal}
                                      </p>
                                      {sesion.enfocuoDia && (
                                        <p className="text-xs text-gray-500 mt-0.5 truncate">{sesion.enfocuoDia}</p>
                                      )}
                                    </div>
                                    {esBloqueada ? (
                                      <span className="text-xs text-gray-600 shrink-0 mt-0.5">
                                        Próximamente
                                      </span>
                                    ) : esFuturaPorTiempo ? (
                                      <span className="text-xs text-gray-600 shrink-0 mt-0.5">
                                        {fechaLabel}
                                      </span>
                                    ) : (
                                      <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-[10px] text-gray-600">Sem. {sesion.numeroSemana}</span>
                                        <Link
                                          href={`/athlete/sesion/${sesion.id}`}
                                          className="text-[11px] bg-[#FF4500] text-white px-3 py-1 rounded font-semibold hover:bg-[#e03d00] transition-colors"
                                        >
                                          Empezar
                                        </Link>
                                      </div>
                                    )}
                                  </div>

                                  {/* Exercises */}
                                  <div className="space-y-1.5">
                                    {movil.length > 0 && (
                                      <div className="mb-2">
                                        <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5 px-1">
                                          Calentamiento
                                        </p>
                                        <div className="space-y-1">
                                          {movil.map(ej => <EjercicioCard key={ej.id} ej={ej} dim={esFutura} />)}
                                        </div>
                                      </div>
                                    )}
                                    <div className="space-y-1">
                                      {principales.map(ej => <EjercicioCard key={ej.id} ej={ej} dim={esFutura} />)}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
