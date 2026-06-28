'use client';

import { type Bloque, DIA_MAP, tipoColor } from './shared';

// ── Split reference panel ──────────────────────────────────────────────────────

export default function SplitPanel({
  bloques,
  splitBloqueId,
  splitSemana,
  onChangeBloqueId,
  onChangeSemana,
}: {
  bloques: Bloque[];
  splitBloqueId: string | null;
  splitSemana: number;
  onChangeBloqueId: (id: string) => void;
  onChangeSemana: (s: number) => void;
}) {
  const bloque = bloques.find(b => b.id === splitBloqueId) ?? bloques[0];
  if (!bloque) return null;

  const semanas = [...new Set(bloque.sesiones.map(s => s.numeroSemana))].sort((a, b) => a - b);
  const sesiones = bloque.sesiones
    .filter(s => s.numeroSemana === splitSemana)
    .sort((a, b) => (a.ordenSecuencia ?? 0) - (b.ordenSecuencia ?? 0));

  return (
    <div className="xl:sticky xl:top-4 bg-gray-900 border border-[#FFB800]/30 rounded-xl overflow-hidden">
      {/* Header with selectors */}
      <div className="px-4 py-3 bg-gray-800/60 border-b border-gray-800 flex items-center gap-2 flex-wrap">
        <span className="text-[10px] text-[#FFB800] font-bold uppercase tracking-wider">Referencia</span>
        <div className="flex gap-2 ml-auto">
          <select
            value={splitBloqueId ?? bloque.id}
            onChange={e => {
              onChangeBloqueId(e.target.value);
              const nb = bloques.find(b => b.id === e.target.value);
              if (nb) {
                const sems = [...new Set(nb.sesiones.map(s => s.numeroSemana))].sort((a, b) => a - b);
                onChangeSemana(sems[0] ?? 1);
              }
            }}
            className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-[#FFB800]"
          >
            {bloques.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
          </select>
          <select
            value={splitSemana}
            onChange={e => onChangeSemana(Number(e.target.value))}
            className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-[#FFB800]"
          >
            {semanas.map(s => <option key={s} value={s}>Sem. {s}</option>)}
          </select>
        </div>
      </div>

      {/* Session list */}
      <div className="divide-y divide-gray-800/60 max-h-[calc(100vh-200px)] overflow-y-auto">
        {sesiones.length === 0 ? (
          <p className="text-center text-xs text-gray-600 py-8">Sin sesiones en esta semana</p>
        ) : sesiones.map(sesion => (
          <div key={sesion.id} className="px-4 py-3">
            <div className="flex items-start gap-1.5 mb-2">
              {sesion.bloqueado && <span className="text-[10px] text-gray-600 mt-0.5">🔒</span>}
              <div>
                <p className="text-sm font-semibold text-white leading-tight">
                  {DIA_MAP[sesion.diaSemana.toLowerCase()] ?? sesion.diaSemana} — {sesion.movimientoPrincipal}
                </p>
                {sesion.enfocuoDia && <p className="text-[10px] text-gray-500 mt-0.5">{sesion.enfocuoDia}</p>}
              </div>
            </div>
            {sesion.ejercicios.length > 0 ? (
              <div className="space-y-1">
                {[...sesion.ejercicios].sort((a, b) => a.orden - b.orden).map(ej => (
                  <div key={ej.id} className="flex items-start gap-2 py-1 border-b border-gray-800/40 last:border-0">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0 mt-0.5 ${tipoColor(ej.tipoEjercicio)}`}>
                      {ej.tipoEjercicio.slice(0, 4)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs text-white truncate">{ej.ejercicioNombre}</p>
                      <p className="text-[10px] text-gray-500">
                        {ej.setsProgramados}×{ej.repsProgramadas} · RPE {ej.rpeProgramado}
                        {ej.pesoProgramado ? ` · ${ej.pesoProgramado}kg` : ''}
                      </p>
                      {ej.notasTecnicas && (
                        <p className="text-[9px] text-gray-600 italic truncate">{ej.notasTecnicas}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-700 italic">Sin ejercicios</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

