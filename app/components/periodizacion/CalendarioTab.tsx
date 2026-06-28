'use client';

import React from 'react';
import { type Periodizacion, type Sesion, DIAS, DIA_MAP } from './shared';

// ── Calendario Tab ────────────────────────────────────────────────────────────

const HOY_DIA: Record<number, string> = {
  0: 'domingo', 1: 'lunes', 2: 'martes', 3: 'miercoles', 4: 'jueves', 5: 'viernes', 6: 'sabado',
};

function CalendarioTab({
  plan,
  completadas,
  maxSemana,
}: {
  plan: Periodizacion;
  completadas: Set<string>;
  maxSemana: number;
}) {
  const fechaInicio = new Date(plan.fechaInicio);
  const now = new Date();
  const semanaActual = Math.floor((now.getTime() - fechaInicio.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
  const diaHoy = HOY_DIA[now.getDay()];

  // Flatten all sessions into a map: "semana-dia" → sesion
  const sesionMap = new Map<string, Sesion>();
  for (const bloque of plan.bloques) {
    for (const s of bloque.sesiones) {
      sesionMap.set(`${s.numeroSemana}-${s.diaSemana}`, s);
    }
  }

  // Only show days that actually have at least one session planned
  const diasActivos = DIAS.filter(dia =>
    Array.from({ length: maxSemana }, (_, i) => i + 1).some(s => sesionMap.has(`${s}-${dia}`))
  );

  const semanas = Array.from({ length: maxSemana }, (_, i) => i + 1);

  // Global stats
  const totalSesiones = sesionMap.size;
  const totalCompletadas = [...sesionMap.values()].filter(s => completadas.has(s.id)).length;
  const adherencia = totalSesiones > 0 ? Math.round((totalCompletadas / totalSesiones) * 100) : 0;

  // Sesiones perdidas (semanas pasadas sin completar)
  const perdidas = semanas
    .filter(s => s < semanaActual)
    .reduce((n, sem) => {
      return n + diasActivos.filter(dia => {
        const sesion = sesionMap.get(`${sem}-${dia}`);
        return sesion && !completadas.has(sesion.id);
      }).length;
    }, 0);

  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#0f0f0f] border border-gray-800 rounded-xl px-4 py-3 text-center">
          <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Completadas</p>
          <p className="text-2xl font-black text-green-400">{totalCompletadas}</p>
          <p className="text-[10px] text-gray-700">de {totalSesiones}</p>
        </div>
        <div className="bg-[#0f0f0f] border border-gray-800 rounded-xl px-4 py-3 text-center">
          <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Adherencia</p>
          <p className={`text-2xl font-black ${adherencia >= 80 ? 'text-green-400' : adherencia >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
            {totalCompletadas > 0 ? `${adherencia}%` : '—'}
          </p>
          <p className="text-[10px] text-gray-700">sesiones cumplidas</p>
        </div>
        <div className="bg-[#0f0f0f] border border-gray-800 rounded-xl px-4 py-3 text-center">
          <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Semana actual</p>
          <p className={`text-2xl font-black ${semanaActual >= 1 && semanaActual <= maxSemana ? 'text-[#FF4500]' : 'text-gray-600'}`}>
            {semanaActual >= 1 && semanaActual <= maxSemana ? `S${semanaActual}` : '—'}
          </p>
          <p className="text-[10px] text-gray-700">de {maxSemana}</p>
        </div>
        <div className="bg-[#0f0f0f] border border-gray-800 rounded-xl px-4 py-3 text-center">
          <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Sesiones perdidas</p>
          <p className={`text-2xl font-black ${perdidas === 0 ? 'text-gray-600' : 'text-red-400'}`}>{perdidas}</p>
          <p className="text-[10px] text-gray-700">semanas anteriores</p>
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-4 text-[10px] text-gray-600 px-1">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-500/20 border border-green-500/30 inline-block" /> Completada</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#FF4500]/20 border border-[#FF4500]/40 inline-block" /> Hoy</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-yellow-500/10 border border-yellow-500/20 inline-block" /> Esta semana</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500/10 border border-red-800/30 inline-block" /> Perdida (pasada)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-900 border border-gray-800 inline-block" /> Pendiente</span>
      </div>

      {/* Grid */}
      <div className="bg-[#0f0f0f] border border-gray-800 rounded-2xl overflow-x-auto">
        <table className="w-full min-w-max">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left text-[10px] text-gray-600 uppercase tracking-wider px-4 py-3 w-14">Sem.</th>
              {diasActivos.map(dia => (
                <th key={dia}
                  className={`text-center text-[10px] font-bold uppercase tracking-wider px-3 py-3 ${dia === diaHoy && semanaActual >= 1 && semanaActual <= maxSemana ? 'text-[#FF4500]' : 'text-gray-600'}`}>
                  {DIA_MAP[dia] ?? dia}
                </th>
              ))}
              <th className="text-right text-[10px] text-gray-600 uppercase tracking-wider px-4 py-3 w-16">%</th>
            </tr>
          </thead>
          <tbody>
            {semanas.map(semana => {
              const esSemanaActual = semana === semanaActual;
              const esPasada = semana < semanaActual;
              const sesionesEnSemana = diasActivos.map(dia => sesionMap.get(`${semana}-${dia}`) ?? null);
              const completadasEnSemana = sesionesEnSemana.filter(s => s && completadas.has(s.id)).length;
              const totalEnSemana = sesionesEnSemana.filter(Boolean).length;
              const pctSemana = totalEnSemana > 0 ? Math.round((completadasEnSemana / totalEnSemana) * 100) : null;

              return (
                <tr key={semana}
                  className={`border-b border-gray-800/40 last:border-0 transition-colors ${esSemanaActual ? 'bg-[#FF4500]/[0.04]' : ''}`}>
                  {/* Semana label */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {esSemanaActual && <span className="w-1.5 h-1.5 rounded-full bg-[#FF4500] shrink-0" />}
                      <span className={`text-xs font-bold tabular-nums ${esSemanaActual ? 'text-[#FF4500]' : esPasada ? 'text-gray-600' : 'text-gray-500'}`}>
                        S{semana}
                      </span>
                    </div>
                  </td>

                  {/* Session cells */}
                  {diasActivos.map(dia => {
                    const sesion = sesionMap.get(`${semana}-${dia}`);
                    const isCompleted = sesion ? completadas.has(sesion.id) : false;
                    const isToday = esSemanaActual && dia === diaHoy;
                    const isPerdida = esPasada && sesion && !isCompleted;

                    let cellStyle = 'bg-gray-900 border-gray-800 text-gray-600';
                    if (isCompleted) cellStyle = 'bg-green-500/15 border-green-500/25 text-green-400';
                    else if (isToday) cellStyle = 'bg-[#FF4500]/15 border-[#FF4500]/35 text-[#FF4500]';
                    else if (esSemanaActual && sesion) cellStyle = 'bg-yellow-500/8 border-yellow-500/20 text-yellow-300';
                    else if (isPerdida) cellStyle = 'bg-red-500/8 border-red-800/30 text-red-400/70';

                    return (
                      <td key={dia} className="px-2 py-2 text-center">
                        {sesion ? (
                          <div className={`inline-flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg border text-[10px] font-semibold leading-tight min-w-[64px] ${cellStyle}`}>
                            <span className="text-[11px]">
                              {isCompleted ? '✓' : isToday ? '▶' : isPerdida ? '✕' : '○'}
                            </span>
                            <span className="truncate max-w-[72px] text-center leading-none">
                              {sesion.movimientoPrincipal}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-800 text-xs">—</span>
                        )}
                      </td>
                    );
                  })}

                  {/* % completado en la semana */}
                  <td className="px-4 py-3 text-right">
                    {pctSemana !== null && (
                      <span className={`text-[10px] font-bold tabular-nums ${
                        pctSemana === 100 ? 'text-green-400'
                          : pctSemana > 0 ? 'text-yellow-400'
                          : esPasada ? 'text-red-400/60'
                          : 'text-gray-700'
                      }`}>
                        {pctSemana}%
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}


export default React.memo(CalendarioTab);
