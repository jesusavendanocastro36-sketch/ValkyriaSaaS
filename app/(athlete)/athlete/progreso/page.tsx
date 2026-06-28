'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine, Cell,
} from 'recharts';

type TonelajeSemana = { semana: string; tonelaje: number };
type OneRMPoint = { fecha: string; valor: number };

type ProgresoData = {
  tonelaje_por_semana: TonelajeSemana[];
  one_rm_estimado: Record<string, OneRMPoint[]>;
  total_registros: number;
  periodo: string;
};

type SemanaVolumen = { semana: string; sq: number; bp: number; dl: number };
type LandmarkCfg = { mev: number | null; mav: number | null; mrv: number | null };
type VolumenData = {
  semanas_series: SemanaVolumen[];
  landmarks: { sq: LandmarkCfg; bp: LandmarkCfg; dl: LandmarkCfg };
};

type RecordEntry = { valor: number; fecha: string; peso: number; reps: number } | null;
type SingleEntry = { peso: number; fecha: string } | null;

type LiftRecords = {
  mejor_1rm: RecordEntry;
  mejor_single: SingleEntry;
  mejor_tonelaje_set: RecordEntry;
  historial_1rm: OneRMPoint[];
};

type Competencia = {
  sq_rm: number | null;
  bp_rm: number | null;
  dl_rm: number | null;
  total: number | null;
  wilks: number | null;
  peso_corporal: number | null;
};

type RecordsData = {
  records: { sq: LiftRecords; bp: LiftRecords; dl: LiftRecords };
  total_sets: number;
  competencia: Competencia;
};

const PERIODO_OPTIONS = ['7d', '30d', '90d'] as const;
const LIFT_COLORS: Record<string, string> = {
  squat: '#FF4500', bench: '#FFB800', deadlift: '#10B981',
  sentadilla: '#FF4500', banca: '#FFB800', 'peso muerto': '#10B981',
};

type PesoEntry = { id: string; peso: number; fecha: string; nota: string | null };

export default function MiProgreso() {
  const router = useRouter();
  const [data, setData] = useState<ProgresoData | null>(null);
  const [records, setRecords] = useState<RecordsData | null>(null);
  const [volumen, setVolumen] = useState<VolumenData | null>(null);
  const [periodo, setPeriodo] = useState<'7d' | '30d' | '90d'>('30d');
  const [loading, setLoading] = useState(true);

  // Body weight history
  const [pesoHistorial, setPesoHistorial] = useState<PesoEntry[]>([]);
  const [pesoForm, setPesoForm] = useState({ peso: '', nota: '', fecha: new Date().toISOString().slice(0, 10) });
  const [savingPeso, setSavingPeso] = useState(false);

  const fetchPeso = (token: string) =>
    fetch('/api/peso-historial', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setPesoHistorial(Array.isArray(d) ? d : []));

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }

    setLoading(true);
    Promise.all([
      fetch(`/api/progreso?periodo=${periodo}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch('/api/athlete/records', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch('/api/athlete/volumen?semanas=12', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([progresoData, recordsData, volumenData]) => {
      setData(progresoData);
      setRecords(recordsData);
      setVolumen(volumenData);
    }).finally(() => setLoading(false));

    fetchPeso(token);
  }, [router, periodo]);

  const handleLogPeso = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token')!;
    setSavingPeso(true);
    try {
      await fetch('/api/peso-historial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ peso: Number(pesoForm.peso), nota: pesoForm.nota || null, fecha: pesoForm.fecha }),
      });
      setPesoForm({ peso: '', nota: '', fecha: new Date().toISOString().slice(0, 10) });
      fetchPeso(token);
    } finally {
      setSavingPeso(false);
    }
  };

  const handleDeletePeso = async (id: string) => {
    const token = localStorage.getItem('token')!;
    await fetch(`/api/peso-historial?id=${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    setPesoHistorial(prev => prev.filter(e => e.id !== id));
  };

  const hasData = data && data.total_registros > 0;

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex justify-between items-center">
        <Link href="/athlete/dashboard" className="text-xl font-black text-[#FF4500] tracking-widest">VALKYRIA</Link>
        <div className="flex gap-2">
          {PERIODO_OPTIONS.map((p) => (
            <button key={p} onClick={() => setPeriodo(p)}
              className={`text-sm px-3 py-1.5 rounded border transition-colors ${periodo === p ? 'bg-[#FF4500] border-[#FF4500] text-white' : 'border-gray-700 text-gray-400 hover:border-gray-500'}`}>
              {p === '7d' ? '7 días' : p === '30d' ? '30 días' : '90 días'}
            </button>
          ))}
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-6">Mi Progreso</h1>

        {loading ? (
          <p className="text-gray-500">Cargando...</p>
        ) : !hasData ? (
          <div className="text-center py-20 text-gray-600">
            <p className="text-lg mb-2">Sin datos de entrenamiento aún</p>
            <p className="text-sm">Completa algunas sesiones para ver tu progreso.</p>
            <Link href="/athlete/periodizacion" className="text-[#FF4500] hover:underline text-sm mt-4 inline-block">
              Ver mi plan →
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Tonelaje semanal */}
            <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="font-semibold text-[#FFB800] mb-4">Tonelaje Semanal (kg)</h2>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.tonelaje_por_semana}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="semana" tick={{ fill: '#6b7280', fontSize: 11 }}
                    tickFormatter={(v) => new Date(v).toLocaleDateString('es', { day: '2-digit', month: 'short' })} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 11 }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(1)}t`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                    labelFormatter={(v) => new Date(v).toLocaleDateString('es', { day: '2-digit', month: 'long' })}
                    formatter={(v) => [`${Number(v).toLocaleString()} kg`, 'Tonelaje']}
                  />
                  <Line type="monotone" dataKey="tonelaje" stroke="#FF4500" strokeWidth={2} dot={{ fill: '#FF4500', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </section>

            {/* Volumen semanal vs landmarks */}
            {volumen && volumen.semanas_series.length > 0 && (
              <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h2 className="font-semibold text-[#FFB800] mb-1">Volumen Semanal</h2>
                <p className="text-xs text-gray-600 mb-5">Series por semana vs rangos de volumen de tu plan</p>
                <div className="space-y-5">
                  {([
                    { key: 'sq' as const, label: 'Sentadilla', color: '#FF4500' },
                    { key: 'bp' as const, label: 'Banca',      color: '#FFB800' },
                    { key: 'dl' as const, label: 'Peso Muerto',color: '#10B981' },
                  ]).map(({ key, label, color }) => {
                    const lm = volumen.landmarks[key];
                    const chartData = volumen.semanas_series.map(s => ({ semana: s.semana, series: s[key] }));
                    if (chartData.every(d => d.series === 0) && !lm.mev) return null;
                    const maxY = Math.max(lm.mrv ?? 0, ...chartData.map(d => d.series), 8) + 2;

                    const getColor = (v: number) => {
                      if (!lm.mev) return '#6b7280';
                      if (lm.mrv && v > lm.mrv) return '#ef4444';
                      if (lm.mav && v >= lm.mav) return '#FFB800';
                      if (v >= lm.mev) return '#10B981';
                      return '#6b7280';
                    };

                    return (
                      <div key={key}>
                        <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color }}>{label}</p>
                        <ResponsiveContainer width="100%" height={160}>
                          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                            <XAxis dataKey="semana" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                            <YAxis domain={[0, maxY]} tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} width={22} />
                            <Tooltip
                              contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                              formatter={(v) => [`${v} series`, label]}
                              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                            />
                            {lm.mev !== null && <ReferenceLine y={lm.mev} stroke="#6b7280" strokeDasharray="4 3" strokeWidth={1.5}
                              label={{ value: 'MEV', fill: '#6b7280', fontSize: 9, position: 'insideTopRight', dx: 4 }} />}
                            {lm.mav !== null && <ReferenceLine y={lm.mav} stroke="#10B981" strokeDasharray="4 3" strokeWidth={1.5}
                              label={{ value: 'MAV', fill: '#10B981', fontSize: 9, position: 'insideTopRight', dx: 4 }} />}
                            {lm.mrv !== null && <ReferenceLine y={lm.mrv} stroke="#ef4444" strokeDasharray="4 3" strokeWidth={1.5}
                              label={{ value: 'MRV', fill: '#ef4444', fontSize: 9, position: 'insideTopRight', dx: 4 }} />}
                            <Bar dataKey="series" radius={[4, 4, 0, 0]} maxBarSize={32}>
                              {chartData.map((entry, i) => (
                                <Cell key={i} fill={getColor(entry.series)} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    );
                  })}
                  {/* Legend */}
                  <div className="flex flex-wrap gap-4 text-[10px] text-gray-600 pt-1">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gray-500 inline-block" /> Por debajo del mínimo</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#10B981] inline-block" /> Zona productiva</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#FFB800] inline-block" /> Zona de máximo crecimiento</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Sobre el límite</span>
                  </div>
                </div>
              </section>
            )}

            {/* 1RM estimado */}
            {Object.keys(data.one_rm_estimado).length > 0 && (
              <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h2 className="font-semibold text-[#FFB800] mb-4">1RM Estimado por Movimiento</h2>

                {/* Últimos valores */}
                <div className="flex gap-4 mb-6 flex-wrap">
                  {Object.entries(data.one_rm_estimado).map(([lift, points]) => {
                    if (points.length === 0) return null;
                    const last = points[points.length - 1];
                    const prev = points.length > 1 ? points[points.length - 2] : null;
                    const diff = prev ? last.valor - prev.valor : 0;
                    return (
                      <div key={lift} className="bg-gray-800 rounded-lg px-4 py-3 min-w-[100px]">
                        <p className="text-xs text-gray-500 uppercase">{lift}</p>
                        <p className="text-2xl font-bold" style={{ color: LIFT_COLORS[lift] ?? '#fff' }}>
                          {last.valor} kg
                        </p>
                        {diff !== 0 && (
                          <p className={`text-xs ${diff > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {diff > 0 ? '+' : ''}{diff} kg
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Gráfico */}
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="fecha" type="category" allowDuplicatedCategory={false}
                      tick={{ fill: '#6b7280', fontSize: 11 }}
                      tickFormatter={(v) => new Date(v).toLocaleDateString('es', { day: '2-digit', month: 'short' })} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} unit=" kg" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                      formatter={(v, name) => [`${Number(v)} kg`, String(name)]}
                    />
                    <Legend wrapperStyle={{ paddingTop: 8 }} />
                    {Object.entries(data.one_rm_estimado).map(([lift, points]) => (
                      <Line
                        key={lift} data={points} type="monotone"
                        dataKey="valor" name={lift}
                        stroke={LIFT_COLORS[lift] ?? '#9ca3af'}
                        strokeWidth={2} dot={{ r: 3 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </section>
            )}

            {/* ── TOTAL DE COMPETENCIA + DOTS ─────────────────────── */}
            {records?.competencia?.total && (
              <section className="bg-[#0f0f0f] border border-[#FFB800]/20 rounded-2xl overflow-hidden">
                {/* Header */}
                <div className="px-5 pt-4 pb-3 border-b border-gray-800 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 uppercase tracking-wider">Total de competencia estimado</p>
                    <p className="text-3xl font-black text-[#FFB800] mt-0.5">
                      {records.competencia.total.toLocaleString()} kg
                    </p>
                  </div>
                  {records.competencia.wilks && (
                    <div className="text-right">
                      <p className="text-xs text-gray-600 uppercase tracking-wider">Wilks</p>
                      <p className="text-3xl font-black text-white">{records.competencia.wilks}</p>
                      {records.competencia.peso_corporal && (
                        <p className="text-[10px] text-gray-700 mt-0.5">@ {records.competencia.peso_corporal} kg</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Breakdown SQ + BP + DL */}
                <div className="grid grid-cols-3 divide-x divide-gray-800">
                  {[
                    { label: 'Sentadilla', key: 'sq_rm' as const, color: '#FF4500' },
                    { label: 'Banca',      key: 'bp_rm' as const, color: '#FFB800' },
                    { label: 'Muerto',     key: 'dl_rm' as const, color: '#10B981' },
                  ].map(({ label, key, color }) => {
                    const rm = records.competencia[key];
                    const pct = records.competencia.total && rm
                      ? Math.round((rm / records.competencia.total) * 100)
                      : 0;
                    return (
                      <div key={key} className="px-4 py-3 text-center">
                        <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">{label}</p>
                        <p className="text-xl font-black" style={{ color }}>
                          {rm ?? '—'}<span className="text-xs font-normal text-gray-600 ml-0.5">kg</span>
                        </p>
                        <p className="text-[10px] text-gray-700 mt-0.5">{pct}% del total</p>
                      </div>
                    );
                  })}
                </div>

                {/* DOTS context */}
                <div className="px-5 py-2.5 bg-[#080808] border-t border-gray-800">
                  <p className="text-[10px] text-gray-700 leading-relaxed">
                    {records.competencia.wilks
                      ? `Wilks ${records.competencia.wilks} — ${
                          records.competencia.wilks >= 450 ? 'Nivel élite · Competidor de alto rendimiento' :
                          records.competencia.wilks >= 350 ? 'Nivel avanzado · Competidor nacional' :
                          records.competencia.wilks >= 250 ? 'Nivel intermedio · Competidor regional' :
                          records.competencia.wilks >= 150 ? 'En desarrollo · Sigue progresando' :
                          'Nivel inicial'
                        }`
                      : 'Tu coach debe registrar tu peso corporal para ver el puntaje Wilks.'}
                  </p>
                </div>
              </section>
            )}

            {/* Personal Records */}
            {records && (
              <section>
                <h2 className="font-semibold text-[#FFB800] mb-3">Récords Personales</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {(['sq', 'bp', 'dl'] as const).map((lift) => {
                    const r = records.records[lift];
                    const label = lift === 'sq' ? 'Sentadilla' : lift === 'bp' ? 'Banca' : 'Peso Muerto';
                    const color = lift === 'sq' ? '#FF4500' : lift === 'bp' ? '#FFB800' : '#10B981';
                    return (
                      <div key={lift} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                        <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color }}>{label}</p>
                        {!r.mejor_1rm ? (
                          <p className="text-xs text-gray-600">Sin datos</p>
                        ) : (
                          <div className="space-y-3">
                            <div>
                              <p className="text-xs text-gray-500 mb-0.5">Mejor 1RM estimado</p>
                              <p className="text-2xl font-black" style={{ color }}>{r.mejor_1rm.valor} kg</p>
                              <p className="text-xs text-gray-600">{r.mejor_1rm.peso} kg × {r.mejor_1rm.reps} reps · {new Date(r.mejor_1rm.fecha).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                            </div>
                            {r.mejor_single && (
                              <div className="bg-gray-800 rounded-lg px-3 py-2">
                                <p className="text-xs text-gray-500 mb-0.5">Mejor single (1×1)</p>
                                <p className="text-base font-bold text-white">{r.mejor_single.peso} kg</p>
                                <p className="text-xs text-gray-600">{new Date(r.mejor_single.fecha).toLocaleDateString('es', { day: '2-digit', month: 'short' })}</p>
                              </div>
                            )}
                            {r.mejor_tonelaje_set && (
                              <div className="bg-gray-800 rounded-lg px-3 py-2">
                                <p className="text-xs text-gray-500 mb-0.5">Mejor set por tonelaje</p>
                                <p className="text-base font-bold text-white">{r.mejor_tonelaje_set.valor} kg</p>
                                <p className="text-xs text-gray-600">{r.mejor_tonelaje_set.peso} kg × {r.mejor_tonelaje_set.reps} reps</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            <div className="text-center text-gray-700 text-sm">
              {data.total_registros} sets registrados en los últimos {periodo === '7d' ? '7 días' : periodo === '30d' ? '30 días' : '90 días'}
            </div>
          </div>
        )}

        {/* Body weight history — always visible, no hasData gate */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 mt-8">
          <h2 className="font-semibold text-[#FFB800] mb-4">Peso Corporal</h2>

          {pesoHistorial.length > 0 && (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={pesoHistorial.map(e => ({ fecha: e.fecha.slice(0, 10), peso: e.peso }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="fecha" tick={{ fill: '#6b7280', fontSize: 11 }}
                  tickFormatter={v => new Date(v).toLocaleDateString('es', { day: '2-digit', month: 'short' })} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} domain={['auto', 'auto']}
                  tickFormatter={v => `${v} kg`} width={55} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                  formatter={(v) => [`${v} kg`, 'Peso']}
                  labelFormatter={v => new Date(v).toLocaleDateString('es', { day: '2-digit', month: 'long', year: 'numeric' })}
                />
                <Line type="monotone" dataKey="peso" stroke="#10B981" strokeWidth={2} dot={{ fill: '#10B981', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}

          {pesoHistorial.length === 0 && (
            <p className="text-xs text-gray-600 mb-4">Sin registros aún. Anota tu peso para hacer seguimiento.</p>
          )}

          <form onSubmit={handleLogPeso} className="mt-4 flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Peso (kg)</label>
              <input type="number" min={30} max={200} step={0.1} required
                value={pesoForm.peso} onChange={e => setPesoForm(f => ({ ...f, peso: e.target.value }))}
                placeholder="75.5"
                className="w-24 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-[#FF4500]"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Fecha</label>
              <input type="date" required
                value={pesoForm.fecha} onChange={e => setPesoForm(f => ({ ...f, fecha: e.target.value }))}
                className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-[#FF4500]"
              />
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="text-xs text-gray-500 block mb-1">Nota (opt.)</label>
              <input value={pesoForm.nota} onChange={e => setPesoForm(f => ({ ...f, nota: e.target.value }))}
                placeholder="Mañana en ayunas..."
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-[#FF4500]"
              />
            </div>
            <button type="submit" disabled={savingPeso}
              className="px-4 py-1.5 bg-[#10B981] hover:bg-[#0d9668] text-white text-sm font-semibold rounded-lg disabled:opacity-50">
              {savingPeso ? '...' : '+ Registrar'}
            </button>
          </form>

          {pesoHistorial.length > 0 && (
            <div className="mt-4 space-y-1 max-h-40 overflow-y-auto">
              {[...pesoHistorial].reverse().slice(0, 10).map(e => (
                <div key={e.id} className="flex items-center justify-between text-xs text-gray-500 py-1 border-b border-gray-800">
                  <span>{new Date(e.fecha).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  <span className="font-semibold text-white">{e.peso} kg</span>
                  {e.nota && <span className="text-gray-600 truncate max-w-[140px]">{e.nota}</span>}
                  <button onClick={() => handleDeletePeso(e.id)} className="text-gray-700 hover:text-red-400 ml-2">×</button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
