'use client';

import React from 'react';
import { type Periodizacion } from './shared';

// ── Series semanales por levantamiento ───────────────────────────────────────

function VolumenSemanalTab({ plan }: { plan: Periodizacion }) {
  function getLift(nombre: string): 'sq' | 'bp' | 'dl' | null {
    const n = nombre.toLowerCase();
    if (n.includes('squat') || n.includes('sentadilla')) return 'sq';
    if (n.includes('bench') || n.includes('banca') || n.includes('close grip') || n.includes('dumbbell press')) return 'bp';
    if (n.includes('deadlift') || n.includes('muerto')) return 'dl';
    return null;
  }

  type WD = { sq: number; bp: number; dl: number };
  const byWeek: Record<number, WD> = {};
  for (const b of plan.bloques) {
    for (const s of b.sesiones) {
      const w = s.numeroSemana;
      if (!byWeek[w]) byWeek[w] = { sq: 0, bp: 0, dl: 0 };
      for (const ej of s.ejercicios) {
        if (ej.tipoEjercicio !== 'COMPETITIVO' && ej.tipoEjercicio !== 'VARIANTE') continue;
        const lift = getLift(ej.ejercicioNombre);
        if (lift) byWeek[w][lift] += ej.setsProgramados;
      }
    }
  }

  const maxSets = Math.max(...Object.values(byWeek).flatMap(d => [d.sq, d.bp, d.dl]), 1);
  const pct = (val: number) => `${Math.round((val / maxSets) * 100)}%`;

  function numColor(val: number, mev: number, mav: number, isTaper: boolean) {
    if (isTaper) return 'text-gray-500';
    if (val >= mav) return 'text-green-400';
    if (val >= mev) return 'text-[#FFB800]';
    if (val > 0) return 'text-red-400';
    return 'text-gray-700';
  }
  function barCls(val: number, mev: number, mav: number, isTaper: boolean) {
    if (isTaper || val === 0) return 'bg-gray-700';
    if (val >= mav) return 'bg-green-500/50';
    if (val >= mev) return 'bg-[#FFB800]/50';
    return 'bg-red-500/40';
  }

  return (
    <div className="space-y-6">
      {/* Legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-2 items-center text-xs">
        <span className="text-gray-500 font-semibold uppercase tracking-wide mr-1">Colores:</span>
        <span className="flex items-center gap-1.5 text-green-400"><span className="w-2.5 h-2.5 rounded-full bg-green-500/50 inline-block" />≥ MAV</span>
        <span className="flex items-center gap-1.5 text-[#FFB800]"><span className="w-2.5 h-2.5 rounded-full bg-[#FFB800]/50 inline-block" />≥ MEV</span>
        <span className="flex items-center gap-1.5 text-red-400"><span className="w-2.5 h-2.5 rounded-full bg-red-500/40 inline-block" />&lt; MEV</span>
        <span className="flex items-center gap-1.5 text-gray-500"><span className="w-2.5 h-2.5 rounded-full bg-gray-700 inline-block" />Tapering</span>
        <span className="ml-auto text-gray-600 italic">Solo Competitivo + Variante</span>
      </div>

      {/* Table */}
      <div className="bg-[#0f0f0f] border border-gray-800 rounded-2xl overflow-hidden">
        {/* Column headers */}
        <div className="grid grid-cols-[44px_1fr_1fr_1fr] px-5 py-2.5 bg-gray-900/80 border-b border-gray-800 gap-2">
          <span className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold">Sem</span>
          <span className="text-[10px] text-[#FF4500] uppercase tracking-wider font-semibold pl-2">Sentadilla</span>
          <span className="text-[10px] text-[#FFB800] uppercase tracking-wider font-semibold pl-2">Banca</span>
          <span className="text-[10px] text-[#10B981] uppercase tracking-wider font-semibold pl-2">Jalón</span>
        </div>

        {plan.bloques.map(bloque => {
          const weeks = [...new Set(bloque.sesiones.map(s => s.numeroSemana))].sort((a, b) => a - b);
          const isTaper = bloque.enfasis.toLowerCase().includes('taper');
          const totals = weeks.reduce((acc, w) => {
            const d = byWeek[w] ?? { sq: 0, bp: 0, dl: 0 };
            return { sq: acc.sq + d.sq, bp: acc.bp + d.bp, dl: acc.dl + d.dl };
          }, { sq: 0, bp: 0, dl: 0 });

          return (
            <div key={bloque.id} className="border-b border-gray-800 last:border-0">
              {/* Block header */}
              <div className="px-5 py-3 bg-gray-900/40 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-gray-300">{bloque.nombre}</span>
                <span className="text-[10px] text-gray-500 shrink-0">
                  RPE {bloque.intensidadRpeMin}–{bloque.intensidadRpeMax}
                  <span className="ml-3 text-[#FF4500]">SQ {totals.sq}</span>
                  <span className="ml-2 text-[#FFB800]">BP {totals.bp}</span>
                  <span className="ml-2 text-[#10B981]">DL {totals.dl}</span>
                </span>
              </div>

              {/* Week rows */}
              {weeks.map(sem => {
                const d = byWeek[sem] ?? { sq: 0, bp: 0, dl: 0 };
                return (
                  <div key={sem} className="grid grid-cols-[44px_1fr_1fr_1fr] px-5 py-2 border-t border-gray-800/40 hover:bg-gray-900/20 transition-colors gap-2">
                    <span className="text-xs font-bold text-gray-600 self-center">S{sem}</span>

                    {(['sq', 'bp', 'dl'] as const).map((lift, i) => {
                      const mev = lift === 'sq' ? 8 : lift === 'bp' ? 10 : 4;
                      const mav = lift === 'sq' ? 14 : lift === 'bp' ? 15 : 8;
                      const val = d[lift];
                      return (
                        <div key={i} className="flex items-center gap-2 pl-2">
                          <span className={`text-xs font-bold tabular-nums w-5 text-right shrink-0 ${numColor(val, mev, mav, isTaper)}`}>{val}</span>
                          <div className="flex-1 h-2.5 bg-gray-800/60 rounded-full overflow-hidden">
                            {val > 0 && <div className={`h-full rounded-full ${barCls(val, mev, mav, isTaper)}`} style={{ width: pct(val) }} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* MEV/MAV reference */}
      <div className="bg-[#0f0f0f] border border-gray-800 rounded-xl px-5 py-4">
        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-3 font-semibold">Referencia MEV / MAV / MRV — atleta avanzado (series/semana)</p>
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div><p className="text-[#FF4500] font-bold mb-0.5">Sentadilla</p><p className="text-gray-400">MEV 8 · MAV 14 · MRV 20</p></div>
          <div><p className="text-[#FFB800] font-bold mb-0.5">Banca</p><p className="text-gray-400">MEV 10 · MAV 15 · MRV 22</p></div>
          <div><p className="text-[#10B981] font-bold mb-0.5">Jalón</p><p className="text-gray-400">MEV 4 · MAV 8 · MRV 12</p></div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(VolumenSemanalTab);
