'use client';

import React from 'react';

// ── Selector de Intentos ─────────────────────────────────────────────────────

const r25 = (kg: number) => Math.round(kg / 2.5) * 2.5;

const LIFTS_CFG = [
  { key: 'sq' as const, label: 'Sentadilla', color: '#FF4500',  jump1Good: 7.5, jump2Good: 7.5, jump1Bad: 5, jump2Bad: 5 },
  { key: 'bp' as const, label: 'Banca',       color: '#FFB800', jump1Good: 5,   jump2Good: 5,   jump1Bad: 2.5, jump2Bad: 2.5 },
  { key: 'dl' as const, label: 'Peso Muerto', color: '#10B981', jump1Good: 7.5, jump2Good: 7.5, jump1Bad: 5, jump2Bad: 5 },
] as const;

type LiftKey = 'sq' | 'bp' | 'dl';

export default function IntentosSelector({
  rmSq, rmBp, rmDl,
}: {
  rmSq: number | null;
  rmBp: number | null;
  rmDl: number | null;
}) {
  const [rms, setRms] = React.useState({ sq: rmSq ?? 0, bp: rmBp ?? 0, dl: rmDl ?? 0 });
  const [openerPct, setOpenerPct] = React.useState(91);
  const [diaBueno, setDiaBueno] = React.useState(true);

  const calcLifta = (key: LiftKey) => {
    const rm = rms[key];
    const cfg = LIFTS_CFG.find(l => l.key === key)!;
    if (!rm) return { opener: null, segundo: null, tercero: null };

    const opener  = r25(rm * openerPct / 100);
    const j1 = diaBueno ? cfg.jump1Good : cfg.jump1Bad;
    const j2 = diaBueno ? cfg.jump2Good : cfg.jump2Bad;
    const segundo = r25(opener + j1);
    const tercero = diaBueno
      ? Math.max(r25(segundo + j2), r25(rm))   // atacar el RM o superarlo
      : r25(segundo + j2);                       // conservador en día malo

    return { opener, segundo, tercero };
  };

  const lifts = LIFTS_CFG.map(l => ({ ...l, ...calcLifta(l.key) }));
  const total1 = lifts.reduce((s, l) => s + (l.opener ?? 0), 0);
  const total2 = lifts.reduce((s, l) => s + (l.segundo ?? 0), 0);
  const total3 = lifts.reduce((s, l) => s + (l.tercero ?? 0), 0);

  return (
    <div className="bg-[#0f0f0f] border border-gray-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-800 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-sm text-white">Selector de Intentos</p>
          <p className="text-xs text-gray-600 mt-0.5">Método RV — Pilar 9. Opener al 90–93% del RM proyectado.</p>
        </div>
        {/* Día bueno / Día malo toggle */}
        <div className="flex rounded-xl overflow-hidden border border-gray-700 text-xs font-bold">
          <button
            onClick={() => setDiaBueno(true)}
            className={`px-4 py-2 transition-colors ${diaBueno ? 'bg-green-600 text-white' : 'bg-transparent text-gray-500 hover:text-white'}`}
          >
            ☀ Día bueno
          </button>
          <button
            onClick={() => setDiaBueno(false)}
            className={`px-4 py-2 transition-colors ${!diaBueno ? 'bg-yellow-600 text-black' : 'bg-transparent text-gray-500 hover:text-white'}`}
          >
            ⛅ Día malo
          </button>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Inputs: RM proyectado + % opener */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {LIFTS_CFG.map(({ key, label, color }) => (
            <div key={key}>
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color }}>
                {label} — RM proy.
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  step={2.5}
                  value={rms[key] || ''}
                  onChange={e => setRms(p => ({ ...p, [key]: Number(e.target.value) }))}
                  placeholder="kg"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-gray-500 tabular-nums"
                />
              </div>
            </div>
          ))}
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">
              % Opener
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={88}
                max={95}
                step={1}
                value={openerPct}
                onChange={e => setOpenerPct(Number(e.target.value))}
                className="flex-1 accent-[#FF4500]"
              />
              <span className="text-sm font-bold text-[#FF4500] tabular-nums w-8 text-right">{openerPct}%</span>
            </div>
          </div>
        </div>

        {/* Scenario note */}
        <p className={`text-xs px-3 py-2 rounded-lg border ${
          diaBueno
            ? 'bg-green-500/8 border-green-500/20 text-green-400'
            : 'bg-yellow-500/8 border-yellow-500/20 text-yellow-400'
        }`}>
          {diaBueno
            ? '☀ Día bueno — calentamientos volaron, el atleta se siente fuerte. Saltos estándar. 3° intento: atacar el RM.'
            : '⛅ Día malo — calentamientos pesados o el atleta se siente lento. Saltos conservadores. Objetivo: completar los 9 intentos.'}
        </p>

        {/* Tabla de intentos */}
        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/60">
                <th className="text-left text-[10px] text-gray-500 uppercase tracking-wider px-4 py-3 w-32">Movimiento</th>
                <th className="text-center text-[10px] text-gray-500 uppercase tracking-wider px-4 py-3">
                  1° Opener
                  <span className="block text-[9px] text-gray-700 normal-case font-normal">siempre al 100%</span>
                </th>
                <th className="text-center text-[10px] text-gray-500 uppercase tracking-wider px-4 py-3">
                  2° Intento
                  <span className="block text-[9px] text-gray-700 normal-case font-normal">
                    {diaBueno ? 'SQ/DL +7.5 · BP +5' : 'SQ/DL +5 · BP +2.5'}
                  </span>
                </th>
                <th className="text-center text-[10px] text-gray-500 uppercase tracking-wider px-4 py-3">
                  3° Intento
                  <span className="block text-[9px] text-gray-700 normal-case font-normal">
                    {diaBueno ? 'atacar RM o +' : 'conservador'}
                  </span>
                </th>
                <th className="text-center text-[10px] text-gray-500 uppercase tracking-wider px-4 py-3">RM proy.</th>
              </tr>
            </thead>
            <tbody>
              {lifts.map(({ key, label, color, opener, segundo, tercero }) => {
                const rm = rms[key];
                const pctTercero = rm && tercero ? Math.round((tercero / rm) * 100) : null;
                return (
                  <tr key={key} className="border-b border-gray-800/50 last:border-0">
                    <td className="px-4 py-3">
                      <span className="text-xs font-bold" style={{ color }}>{label}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {opener != null
                        ? <span className="text-base font-black tabular-nums text-white">{opener} kg</span>
                        : <span className="text-gray-700">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {segundo != null ? (
                        <div>
                          <span className="text-base font-black tabular-nums text-white">{segundo} kg</span>
                          {opener && <span className="text-[10px] text-gray-600 ml-1">+{segundo - opener}</span>}
                        </div>
                      ) : <span className="text-gray-700">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {tercero != null ? (
                        <div>
                          <span className={`text-base font-black tabular-nums ${diaBueno ? 'text-[#FF4500]' : 'text-white'}`}>
                            {tercero} kg
                          </span>
                          {segundo && <span className="text-[10px] text-gray-600 ml-1">+{tercero - segundo}</span>}
                          {pctTercero && (
                            <span className={`block text-[9px] font-semibold mt-0.5 ${
                              pctTercero >= 100 ? 'text-[#FF4500]' : 'text-gray-600'
                            }`}>{pctTercero}% del RM</span>
                          )}
                        </div>
                      ) : <span className="text-gray-700">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs text-gray-500 tabular-nums">{rm ? `${rm} kg` : '—'}</span>
                    </td>
                  </tr>
                );
              })}

              {/* Total row */}
              {(total1 > 0 || total2 > 0 || total3 > 0) && (
                <tr className="bg-gray-900/40 border-t border-gray-700">
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm font-bold text-gray-300 tabular-nums">{total1 > 0 ? `${total1} kg` : '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm font-bold text-gray-300 tabular-nums">{total2 > 0 ? `${total2} kg` : '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm font-bold text-[#FF4500] tabular-nums">{total3 > 0 ? `${total3} kg` : '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-[10px] text-gray-600">
                      {(rms.sq + rms.bp + rms.dl) > 0 ? `${rms.sq + rms.bp + rms.dl} kg` : '—'}
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="text-[10px] text-gray-700 leading-relaxed">
          Pesos redondeados a 2.5 kg. En competencia IPF se puede declarar cualquier kg entero.
          El opener debe ser un peso que el atleta ha levantado múltiples veces con reserva — nunca improvisar el primer intento.
        </p>
      </div>
    </div>
  );
}

