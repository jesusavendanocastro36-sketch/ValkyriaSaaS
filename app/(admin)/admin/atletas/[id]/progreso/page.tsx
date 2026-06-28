'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend, ComposedChart, Cell,
} from 'recharts';

// ── Types ────────────────────────────────────────────────────────────────────

type SemanaData = {
  label: string;
  tonelaje: number;
  rpePromedio: number;
  rmSq: number | null;
  rmBp: number | null;
  rmDl: number | null;
  sesiones: number;
};

type LiftPred = { actual: number; proyectado: number; delta: number; tendencia_kg_semana: number };
type LiftTrend = {
  actual: number;
  tendencia_kg_semana: number;
  en4w: number;
  en8w: number;
  en12w: number;
  estado: 'subiendo' | 'plateau' | 'bajando';
};

type ProgresoData = {
  atleta: { nombre: string };
  semanas: SemanaData[];
  estadoFatiga: 'VERDE' | 'AMARILLA' | 'ROJA';
  rpe7dias: number;
  totalSesiones: number;
  prediccion: { sq: LiftPred | null; bp: LiftPred | null; dl: LiftPred | null } | null;
  tendencia: { sq: LiftTrend | null; bp: LiftTrend | null; dl: LiftTrend | null } | null;
  fechaCompetencia: string | null;
  semanasHastaComp: number | null;
  competenciaNombre: string | null;
};

type LiftRec = {
  mejor_1rm: { valor: number; fecha: string; peso: number; reps: number } | null;
  mejor_single: { peso: number; fecha: string } | null;
  mejor_tonelaje_set: { valor: number; fecha: string; peso: number; reps: number } | null;
};
type RecordsData = {
  atleta: { nombre: string };
  records: { sq: LiftRec; bp: LiftRec; dl: LiftRec };
  total_sets: number;
};

type SemanaVolumen = { semana: string; sq: number; bp: number; dl: number };
type LandmarksConfig = { mev: number | null; mav: number | null; mrv: number | null };
type VolumenData = {
  semanas_series: SemanaVolumen[];
  landmarks: { sq: LandmarksConfig; bp: LandmarksConfig; dl: LandmarksConfig };
};

type BloqueComp = {
  bloqueId: string;
  periNombre: string;
  periTipo: string;
  bloqueNombre: string;
  enfasis: string;
  numeroBloque: number;
  semanaInicio: number;
  semanaFin: number;
  rpeTarget: { min: number; max: number };
  sesionesRealizadas: number;
  sesionesProgramadas: number;
  adherencia: number;
  rpePromedio: number | null;
  tonelajeTotal: number;
  lifts: {
    sq: { inicio: number; fin: number; delta: number } | null;
    bp: { inicio: number; fin: number; delta: number } | null;
    dl: { inicio: number; fin: number; delta: number } | null;
  };
};

type EjComp = {
  nombre: string;
  tipo: string;
  programado: { sets: number; reps: number; rpe: number; peso: number | null; carga_ref: string | null; rir_label: string | null };
  ejecutado: { sets: number; reps_promedio: number; peso_promedio: number; rpe_promedio: number };
  rpe_vs_programado: number;
  sets_pct: number;
};

type SesionComp = {
  fecha: string;
  sesion_id: string;
  movimiento_principal: string;
  enfoque_dia: string;
  bloque_nombre: string;
  rpe_promedio: number;
  conformidad: number;
  ejercicios: EjComp[];
};

// ── Config ───────────────────────────────────────────────────────────────────

const FATIGA_CONFIG = {
  VERDE:    { label: 'Óptimo',      color: 'text-green-400',  bg: 'bg-green-400/10',  border: 'border-green-400/20',  desc: 'Sin alertas activas' },
  AMARILLA: { label: 'Precaución',  color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20', desc: 'RPE promedio elevado' },
  ROJA:     { label: 'Alto riesgo', color: 'text-red-400',    bg: 'bg-red-400/10',    border: 'border-red-400/20',    desc: 'Reducir volumen urgente' },
};

const TIPO_COLOR: Record<string, string> = {
  COMPETITIVO: 'text-[#FF4500] bg-[#FF4500]/10',
  VARIANTE: 'text-blue-300 bg-blue-400/10',
  ACCESORIO: 'text-orange-300 bg-orange-400/10',
  AUXILIAR: 'text-orange-300 bg-orange-400/10',
  COMPENSATORIO: 'text-purple-300 bg-purple-400/10',
  MOVILIDAD: 'text-green-400 bg-green-400/10',
};

const SEMANA_OPTIONS = [8, 12, 24];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es', { weekday: 'short', day: '2-digit', month: 'short' });
}

function isoWeekKey(): string {
  const d = new Date();
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const wn = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(wn).padStart(2, '0')}`;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ProgresoAtletaPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [data, setData] = useState<ProgresoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [semanas, setSemanas] = useState(12);
  const [activeTab, setActiveTab] = useState<'progreso' | 'comparativa' | 'records' | 'bloques' | 'volumen'>('progreso');
  const [volumenData, setVolumenData] = useState<VolumenData | null>(null);
  const [loadingVolumen, setLoadingVolumen] = useState(false);
  const [savingLandmarks, setSavingLandmarks] = useState(false);
  const [landmarkInputs, setLandmarkInputs] = useState<Record<string, string>>({});

  const [comparativa, setComparativa] = useState<SesionComp[]>([]);
  const [loadingComp, setLoadingComp] = useState(false);
  const [semanasComp, setSemanasComp] = useState(8);
  const [openSesion, setOpenSesion] = useState<string | null>(null);
  const [records, setRecords] = useState<RecordsData | null>(null);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [bloques, setBloques] = useState<BloqueComp[]>([]);
  const [loadingBloques, setLoadingBloques] = useState(false);
  const [analizando, setAnalizando] = useState(false);
  const [alertaEstancamiento, setAlertaEstancamiento] = useState<string | null>(null);

  const getToken = () => localStorage.getItem('token') ?? '';

  const handleDetectarEstancamiento = async () => {
    setAnalizando(true);
    setAlertaEstancamiento(null);
    try {
      const res = await fetch('/api/ai/detectar-estancamiento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ athleteId: id }),
      });
      const d = await res.json();
      if (d.skipped) {
        setAlertaEstancamiento(d.reason === 'throttled' ? 'Análisis reciente — sin cambios nuevos' : 'Datos insuficientes para el análisis');
      } else if (d.alertas > 0) {
        setAlertaEstancamiento(`⚠ ${d.alertas} estancamiento${d.alertas > 1 ? 's' : ''} detectado${d.alertas > 1 ? 's' : ''}: ${d.lifts.join(', ')} — recomendación creada`);
      } else {
        setAlertaEstancamiento('Sin estancamiento detectado — progresión normal');
      }
    } finally {
      setAnalizando(false);
      setTimeout(() => setAlertaEstancamiento(null), 6000);
    }
  };

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push('/login'); return; }
    setLoading(true);
    Promise.all([
      fetch(`/api/atletas/${id}/progreso?semanas=${semanas}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`/api/athlete/volumen?athleteId=${id}&semanas=12`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([progresoRes, volRes]) => {
      setData(progresoRes);
      setVolumenData(volRes);
      const lm = volRes.landmarks as VolumenData['landmarks'];
      setLandmarkInputs({
        sqMev: lm.sq.mev?.toString() ?? '', sqMav: lm.sq.mav?.toString() ?? '', sqMrv: lm.sq.mrv?.toString() ?? '',
        bpMev: lm.bp.mev?.toString() ?? '', bpMav: lm.bp.mav?.toString() ?? '', bpMrv: lm.bp.mrv?.toString() ?? '',
        dlMev: lm.dl.mev?.toString() ?? '', dlMav: lm.dl.mav?.toString() ?? '', dlMrv: lm.dl.mrv?.toString() ?? '',
      });
    }).finally(() => setLoading(false));
  }, [id, router, semanas]);

  useEffect(() => {
    if (activeTab === 'records' && !records) {
      setLoadingRecords(true);
      fetch(`/api/atletas/${id}/records`, { headers: { Authorization: `Bearer ${getToken()}` } })
        .then(r => r.json())
        .then(setRecords)
        .finally(() => setLoadingRecords(false));
    }
    if (activeTab === 'bloques' && bloques.length === 0) {
      setLoadingBloques(true);
      fetch(`/api/atletas/${id}/bloques-comparativa`, { headers: { Authorization: `Bearer ${getToken()}` } })
        .then(r => r.json())
        .then(d => setBloques(d.bloques ?? []))
        .finally(() => setLoadingBloques(false));
    }
    if (activeTab !== 'comparativa') return;
    setLoadingComp(true);
    fetch(`/api/atletas/${id}/comparativa?semanas=${semanasComp}`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json())
      .then(d => setComparativa(d.sesiones ?? []))
      .finally(() => setLoadingComp(false));
  }, [id, activeTab, semanasComp, bloques.length, volumenData]);

  const handleSaveLandmarks = async () => {
    setSavingLandmarks(true);
    const body: Record<string, number | null> = {};
    for (const [k, v] of Object.entries(landmarkInputs)) {
      body[k] = v !== '' ? Number(v) : null;
    }
    await fetch(`/api/atletas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    const volRes = await fetch(`/api/athlete/volumen?athleteId=${id}&semanas=12`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    }).then(r => r.json());
    setVolumenData(volRes);
    setSavingLandmarks(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center text-gray-500">Cargando...</div>
  );
  if (!data) return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center text-red-400">Error al cargar datos</div>
  );

  const fatiga = FATIGA_CONFIG[data.estadoFatiga];
  const hasRm = data.semanas.some(s => s.rmSq || s.rmBp || s.rmDl);

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <Link href="/admin/atletas" className="inline-block text-sm text-gray-500 hover:text-white transition-colors mb-6">
          ← Atletas
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold">{data.atleta.nombre}</h1>
            <p className="text-gray-500 text-sm mt-1">Análisis de rendimiento</p>
          </div>
          <div className="flex items-center gap-2">
            {SEMANA_OPTIONS.map(w => (
              <button key={w} onClick={() => setSemanas(w)}
                className={`px-4 py-2 text-sm rounded-lg transition-colors font-semibold ${
                  semanas === w
                    ? 'bg-[#FF4500] text-white'
                    : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'
                }`}>
                {w} sem
              </button>
            ))}
            <button
              onClick={handleDetectarEstancamiento}
              disabled={analizando}
              title="Detectar estancamiento automáticamente"
              className="px-3 py-2 text-sm rounded-lg border border-gray-800 text-gray-500 hover:text-yellow-400 hover:border-yellow-400/40 transition-colors disabled:opacity-40"
            >
              {analizando ? '...' : '⚡ Detectar'}
            </button>
          </div>
          {alertaEstancamiento && (
            <div className={`mt-2 text-xs px-3 py-2 rounded-lg ${
              alertaEstancamiento.startsWith('⚠')
                ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                : 'bg-gray-900 text-gray-400 border border-gray-800'
            }`}>
              {alertaEstancamiento}
            </div>
          )}
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Sesiones completadas</p>
            <p className="text-3xl font-bold text-white">{data.totalSesiones}</p>
            <p className="text-xs text-gray-600 mt-1">en las últimas {semanas} semanas</p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">RPE promedio — 7 días</p>
            <p className={`text-3xl font-bold ${
              !data.rpe7dias ? 'text-gray-600'
                : data.rpe7dias > 8.7 ? 'text-red-400'
                : data.rpe7dias > 8.5 ? 'text-yellow-400'
                : 'text-green-400'
            }`}>
              {data.rpe7dias || '—'}
            </p>
            <p className="text-xs text-gray-600 mt-1">zona segura ≤ 8.5</p>
          </div>

          <div className={`border rounded-xl px-5 py-4 ${fatiga.bg} ${fatiga.border}`}>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Estado de fatiga</p>
            <p className={`text-3xl font-bold ${fatiga.color}`}>{fatiga.label}</p>
            <p className="text-xs text-gray-600 mt-1">{fatiga.desc}</p>
          </div>
        </div>

        {/* Esta semana — MEV/MRV tracker */}
        {volumenData && (
          <ThisWeekMini data={volumenData} inputs={landmarkInputs} />
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-800 overflow-x-auto">
          {([
            { key: 'progreso',     label: 'Gráficos' },
            { key: 'volumen',      label: '◎ Volumen' },
            { key: 'bloques',      label: '◈ Bloques' },
            { key: 'comparativa',  label: 'Prog. vs Ejec.' },
            { key: 'records',      label: '🏆 Récords' },
          ] as const).map(({ key, label }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg transition-colors border-b-2 -mb-px whitespace-nowrap ${
                activeTab === key
                  ? 'text-white border-[#FF4500] bg-gray-900/50'
                  : 'text-gray-500 border-transparent hover:text-gray-300'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* ── Tab: Volumen ── */}
        {activeTab === 'volumen' && (
          <VolumenTab
            data={volumenData}
            loading={loadingVolumen}
            inputs={landmarkInputs}
            setInputs={setLandmarkInputs}
            onSave={handleSaveLandmarks}
            saving={savingLandmarks}
          />
        )}

        {/* ── Tab: Bloques ── */}
        {activeTab === 'bloques' && (
          <BloquesTab bloques={bloques} loading={loadingBloques} />
        )}

        {/* ── Tab: Gráficos ── */}
        {activeTab === 'progreso' && (
          <>
            {/* Prediction banner */}
            {data.prediccion && data.fechaCompetencia && data.semanasHastaComp && data.semanasHastaComp > 0 && (
              <div className="bg-gray-900 border border-[#FF4500]/20 rounded-xl p-5 mb-5">
                <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
                  <div>
                    <p className="text-xs font-bold text-[#FF4500] uppercase tracking-wider mb-0.5">
                      Proyección para competencia
                    </p>
                    <p className="text-sm text-gray-400">
                      {data.competenciaNombre} · {' '}
                      {new Date(data.fechaCompetencia).toLocaleDateString('es', { day: '2-digit', month: 'long', year: 'numeric' })}
                      {' '}·{' '}
                      <span className={`font-semibold ${data.semanasHastaComp <= 2 ? 'text-red-400' : data.semanasHastaComp <= 4 ? 'text-yellow-400' : 'text-white'}`}>
                        {data.semanasHastaComp} semanas
                      </span>
                    </p>
                  </div>
                  <p className="text-xs text-gray-600">Basado en regresión lineal del historial seleccionado</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { key: 'sq' as const, label: 'Sentadilla', color: '#FF4500' },
                    { key: 'bp' as const, label: 'Banca', color: '#FFB800' },
                    { key: 'dl' as const, label: 'Muerto', color: '#60a5fa' },
                  ]).map(({ key, label, color }) => {
                    const p = data.prediccion![key];
                    if (!p) return (
                      <div key={key} className="bg-gray-800 rounded-lg px-4 py-3 text-center opacity-40">
                        <p className="text-xs text-gray-500 mb-1">{label}</p>
                        <p className="text-sm text-gray-600">Sin datos suficientes</p>
                      </div>
                    );
                    const up = p.delta >= 0;
                    const pct = p.actual > 0 ? ((p.delta / p.actual) * 100).toFixed(1) : '0';
                    return (
                      <div key={key} className="bg-gray-800 rounded-lg px-4 py-3">
                        <p className="text-xs font-semibold mb-2" style={{ color }}>{label}</p>
                        <div className="flex items-end gap-2 mb-1">
                          <span className="text-xs text-gray-500">Actual</span>
                          <span className="text-sm font-bold text-white">{p.actual} kg</span>
                        </div>
                        <div className="flex items-end gap-2 mb-2">
                          <span className="text-xs text-gray-500">Proyectado</span>
                          <span className="text-lg font-black text-white">{p.proyectado} kg</span>
                        </div>
                        <p className={`text-xs font-semibold ${up ? 'text-green-400' : 'text-red-400'}`}>
                          {up ? '+' : ''}{p.delta} kg ({up ? '+' : ''}{pct}%)
                        </p>
                        <p className="text-xs text-gray-600 mt-0.5">
                          tendencia {p.tendencia_kg_semana >= 0 ? '+' : ''}{p.tendencia_kg_semana} kg/sem
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Tendencia 1RM (siempre visible si hay datos) ── */}
            {data.tendencia && (
              <div className="bg-[#0f0f0f] border border-gray-800 rounded-2xl overflow-hidden mb-5">
                <div className="px-5 py-4 border-b border-gray-800/60 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">Tendencia 1RM estimado</p>
                    <p className="text-xs text-gray-600 mt-0.5">Regresión lineal sobre el historial seleccionado</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 divide-x divide-gray-800/60">
                  {([
                    { key: 'sq' as const, label: 'Sentadilla' },
                    { key: 'bp' as const, label: 'Banca' },
                    { key: 'dl' as const, label: 'Peso muerto' },
                  ]).map(({ key, label }) => {
                    const t = data.tendencia![key];
                    if (!t) return (
                      <div key={key} className="px-5 py-4 text-center opacity-40">
                        <p className="text-xs text-gray-600 mb-2">{label}</p>
                        <p className="text-xs text-gray-700">Sin datos</p>
                      </div>
                    );
                    const estadoCfg = {
                      subiendo: { icon: '↑', color: 'text-green-400', bg: 'bg-green-500/10' },
                      plateau:  { icon: '→', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
                      bajando:  { icon: '↓', color: 'text-red-400',   bg: 'bg-red-500/10' },
                    }[t.estado];
                    return (
                      <div key={key} className="px-5 py-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs text-gray-500">{label}</p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${estadoCfg.bg} ${estadoCfg.color}`}>
                            {estadoCfg.icon} {t.estado}
                          </span>
                        </div>
                        <p className="text-2xl font-bold text-white mb-1">{t.actual} <span className="text-sm text-gray-600 font-normal">kg</span></p>
                        <p className={`text-xs font-semibold mb-3 ${t.tendencia_kg_semana >= 0.5 ? 'text-green-400' : t.tendencia_kg_semana <= -0.2 ? 'text-red-400' : 'text-yellow-400'}`}>
                          {t.tendencia_kg_semana >= 0 ? '+' : ''}{t.tendencia_kg_semana} kg/sem
                        </p>
                        <div className="space-y-1">
                          {[
                            { label: '4 sem', val: t.en4w },
                            { label: '8 sem', val: t.en8w },
                            { label: '12 sem', val: t.en12w },
                          ].map(({ label: l, val }) => (
                            <div key={l} className="flex items-center justify-between text-xs">
                              <span className="text-gray-700">{l}</span>
                              <span className={`font-semibold ${val > t.actual ? 'text-green-400' : val < t.actual ? 'text-red-400' : 'text-gray-400'}`}>
                                {val} kg
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* No data */}
            {data.semanas.length === 0 ? (
              <div className="text-center py-24 bg-gray-900 border border-gray-800 rounded-xl text-gray-600">
                <p className="text-lg mb-2">Sin sesiones registradas</p>
                <p className="text-sm">Los gráficos aparecerán cuando {data.atleta.nombre} complete sus primeras sesiones.</p>
              </div>
            ) : (
              <div className="space-y-5">
                <ChartCard title="Tonelaje semanal" subtitle="kg totales movidos en la semana (peso × reps por cada serie)">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data.semanas} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
                      <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} width={55}
                        tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}t` : String(v)} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '10px 14px' }}
                        labelStyle={{ color: '#fff', fontWeight: '700', marginBottom: 4 }}
                        formatter={(v) => [`${Number(v).toLocaleString('es')} kg`, 'Tonelaje']}
                        cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                      />
                      <Bar dataKey="tonelaje" fill="#FF4500" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="RPE promedio semanal" subtitle="Intensidad percibida — líneas de referencia en 8.5 (alerta) y 8.7 (riesgo)">
                  <ResponsiveContainer width="100%" height={220}>
                    <ComposedChart data={data.semanas} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
                      <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis domain={[5, 10]} tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '10px 14px' }}
                        labelStyle={{ color: '#fff', fontWeight: '700', marginBottom: 4 }}
                        formatter={(v) => [v, 'RPE promedio']}
                        cursor={{ stroke: '#333' }}
                      />
                      <ReferenceLine y={8.5} stroke="#FFB800" strokeDasharray="5 4" strokeWidth={1.5}
                        label={{ value: '8.5', fill: '#FFB800', fontSize: 10, position: 'insideTopRight', dx: 4 }} />
                      <ReferenceLine y={8.7} stroke="#ef4444" strokeDasharray="5 4" strokeWidth={1.5}
                        label={{ value: '8.7', fill: '#ef4444', fontSize: 10, position: 'insideTopRight', dx: 4 }} />
                      <Line type="monotone" dataKey="rpePromedio"
                        stroke="#FF4500" strokeWidth={2.5}
                        dot={{ fill: '#FF4500', r: 4, strokeWidth: 0 }}
                        activeDot={{ r: 6, fill: '#FF4500' }}
                        connectNulls />
                    </ComposedChart>
                  </ResponsiveContainer>
                </ChartCard>

                {hasRm && (
                  <ChartCard title="1RM estimado por levantamiento" subtitle="Fórmula Epley aplicada al mejor set COMPETITIVO de cada semana">
                    <ResponsiveContainer width="100%" height={240}>
                      <LineChart data={data.semanas} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
                        <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} width={45} unit=" kg" />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '10px 14px' }}
                          labelStyle={{ color: '#fff', fontWeight: '700', marginBottom: 4 }}
                          formatter={(v, name) => [`${Number(v)} kg`, String(name)]}
                          cursor={{ stroke: '#333' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }}
                          formatter={(value) => <span style={{ color: '#9ca3af' }}>{value}</span>} />
                        <Line type="monotone" dataKey="rmSq" name="Sentadilla"
                          stroke="#FF4500" strokeWidth={2.5} dot={{ r: 4, fill: '#FF4500', strokeWidth: 0 }} connectNulls />
                        <Line type="monotone" dataKey="rmBp" name="Banca"
                          stroke="#FFB800" strokeWidth={2.5} dot={{ r: 4, fill: '#FFB800', strokeWidth: 0 }} connectNulls />
                        <Line type="monotone" dataKey="rmDl" name="Muerto"
                          stroke="#60a5fa" strokeWidth={2.5} dot={{ r: 4, fill: '#60a5fa', strokeWidth: 0 }} connectNulls />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartCard>
                )}
              </div>
            )}
          </>
        )}

        {/* ── Tab: Récords ── */}
        {activeTab === 'records' && (
          loadingRecords ? (
            <div className="text-center py-20 text-gray-500">Cargando récords...</div>
          ) : !records ? (
            <div className="text-center py-20 text-gray-600">Sin datos</div>
          ) : (
            <div className="space-y-5">
              <p className="text-xs text-gray-500">
                Mejor marca histórica por levantamiento · {records.total_sets} sets registrados en total
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {([
                  { key: 'sq' as const, label: 'Sentadilla', color: '#FF4500' },
                  { key: 'bp' as const, label: 'Banca', color: '#FFB800' },
                  { key: 'dl' as const, label: 'Muerto', color: '#60a5fa' },
                ]).map(({ key, label, color }) => {
                  const rec = records.records[key];
                  const hasData = rec.mejor_1rm || rec.mejor_single || rec.mejor_tonelaje_set;
                  return (
                    <div key={key} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-8 rounded-full" style={{ backgroundColor: color }} />
                        <p className="font-bold text-white">{label}</p>
                      </div>
                      {!hasData ? (
                        <p className="text-gray-600 text-sm">Sin registros aún</p>
                      ) : (
                        <div className="space-y-3">
                          {rec.mejor_1rm && (
                            <div className="bg-gray-800/60 rounded-lg p-3">
                              <p className="text-xs text-gray-500 mb-0.5">Mejor 1RM estimado (Epley)</p>
                              <p className="text-2xl font-black" style={{ color }}>{rec.mejor_1rm.valor} kg</p>
                              <p className="text-xs text-gray-600 mt-1">
                                {rec.mejor_1rm.peso} kg × {rec.mejor_1rm.reps} reps · {new Date(rec.mejor_1rm.fecha).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </p>
                            </div>
                          )}
                          {rec.mejor_single && (
                            <div className="bg-gray-800/40 rounded-lg p-3">
                              <p className="text-xs text-gray-500 mb-0.5">Mejor single (1 rep)</p>
                              <p className="text-lg font-bold text-white">{rec.mejor_single.peso} kg</p>
                              <p className="text-xs text-gray-600">{new Date(rec.mejor_single.fecha).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                            </div>
                          )}
                          {rec.mejor_tonelaje_set && (
                            <div className="bg-gray-800/40 rounded-lg p-3">
                              <p className="text-xs text-gray-500 mb-0.5">Mejor set (tonelaje)</p>
                              <p className="text-lg font-bold text-white">{rec.mejor_tonelaje_set.valor.toLocaleString()} kg</p>
                              <p className="text-xs text-gray-600">
                                {rec.mejor_tonelaje_set.peso} kg × {rec.mejor_tonelaje_set.reps} reps · {new Date(rec.mejor_tonelaje_set.fecha).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )
        )}

        {/* ── Tab: Comparativa ── */}
        {activeTab === 'comparativa' && (
          <div>
            {/* Week selector */}
            <div className="flex items-center gap-3 mb-5">
              <span className="text-xs text-gray-500">Últimas semanas:</span>
              {[4, 8, 12].map(w => (
                <button key={w} onClick={() => setSemanasComp(w)}
                  className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition-colors ${
                    semanasComp === w
                      ? 'bg-[#FF4500] text-white'
                      : 'bg-gray-800 border border-gray-700 text-gray-400 hover:text-white'
                  }`}>
                  {w} sem
                </button>
              ))}
            </div>

            {loadingComp ? (
              <div className="text-center py-20 text-gray-500">Cargando sesiones...</div>
            ) : comparativa.length === 0 ? (
              <div className="text-center py-20 bg-gray-900 border border-gray-800 rounded-xl text-gray-600">
                <p className="text-lg mb-2">Sin sesiones en el período</p>
                <p className="text-sm">{data.atleta.nombre} aún no ha registrado sesiones con seguimiento.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {comparativa.map(ses => (
                  <SessionCard
                    key={`${ses.fecha}__${ses.sesion_id}`}
                    ses={ses}
                    isOpen={openSesion === `${ses.fecha}__${ses.sesion_id}`}
                    onToggle={() => setOpenSesion(o =>
                      o === `${ses.fecha}__${ses.sesion_id}` ? null : `${ses.fecha}__${ses.sesion_id}`
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Session card ─────────────────────────────────────────────────────────────

function SessionCard({ ses, isOpen, onToggle }: { ses: SesionComp; isOpen: boolean; onToggle: () => void }) {
  const confColor = ses.conformidad >= 90 ? 'text-green-400 bg-green-400/10'
    : ses.conformidad >= 70 ? 'text-yellow-400 bg-yellow-400/10'
    : 'text-red-400 bg-red-400/10';

  const rpeColor = ses.rpe_promedio > 8.7 ? 'text-red-400'
    : ses.rpe_promedio > 8.5 ? 'text-yellow-400'
    : 'text-green-400';

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <button onClick={onToggle}
        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gray-800/50 transition-colors">
        <div className="flex items-center gap-4">
          <div className="text-left shrink-0">
            <p className="text-xs text-gray-500">{fmtDate(ses.fecha)}</p>
            <p className="text-xs text-gray-600">{ses.bloque_nombre}</p>
          </div>
          <div>
            <p className="font-semibold text-sm">{ses.movimiento_principal}</p>
            <p className="text-xs text-gray-500">{ses.enfoque_dia}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className={`text-xs font-bold px-2 py-1 rounded-lg ${confColor}`}>
            {ses.conformidad}% volumen
          </span>
          <span className={`text-xs font-semibold ${rpeColor}`}>
            RPE {ses.rpe_promedio}
          </span>
          <span className="text-gray-600 text-xs">{isOpen ? '▲' : '▼'}</span>
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-gray-800 px-5 py-4">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-[#0d0d0d]">
                  <th className="px-3 py-2 text-left text-[#FFB800] font-semibold border border-gray-800">Ejercicio</th>
                  <th className="px-3 py-2 text-center text-gray-500 font-semibold border border-gray-800">Tipo</th>
                  <th className="px-3 py-2 text-center text-gray-500 font-semibold border border-gray-800 bg-gray-800/30">Programado</th>
                  <th className="px-3 py-2 text-center text-[#FF4500] font-semibold border border-gray-800">Ejecutado</th>
                  <th className="px-3 py-2 text-center text-gray-500 font-semibold border border-gray-800">Δ RPE</th>
                  <th className="px-3 py-2 text-center text-gray-500 font-semibold border border-gray-800">Sets %</th>
                </tr>
              </thead>
              <tbody>
                {ses.ejercicios.map((ej, i) => {
                  const rpeSign = ej.rpe_vs_programado > 0 ? '+' : '';
                  const rpeClass = Math.abs(ej.rpe_vs_programado) <= 0.5 ? 'text-green-400'
                    : ej.rpe_vs_programado > 0.5 ? 'text-red-400' : 'text-blue-400';
                  const setsClass = ej.sets_pct >= 90 ? 'text-green-400'
                    : ej.sets_pct >= 70 ? 'text-yellow-400' : 'text-red-400';
                  return (
                    <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/30">
                      <td className="px-3 py-2.5 border border-gray-800 font-semibold text-white">{ej.nombre}</td>
                      <td className="px-3 py-2.5 border border-gray-800 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${TIPO_COLOR[ej.tipo] ?? 'text-gray-400 bg-gray-800'}`}>
                          {ej.tipo.charAt(0) + ej.tipo.slice(1).toLowerCase()}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 border border-gray-800 text-center bg-gray-800/20">
                        <p className="font-mono text-gray-300">
                          {ej.programado.sets}×{ej.programado.reps} @RPE {ej.programado.rpe}
                        </p>
                        {ej.programado.peso ? (
                          <p className="text-gray-500">{ej.programado.peso} kg</p>
                        ) : ej.programado.carga_ref ? (
                          <p className="text-gray-600">{ej.programado.carga_ref}</p>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5 border border-gray-800 text-center">
                        <p className="font-mono text-[#FF4500] font-bold">
                          {ej.ejecutado.sets}×{ej.ejecutado.reps_promedio} @RPE {ej.ejecutado.rpe_promedio}
                        </p>
                        {ej.ejecutado.peso_promedio > 0 && (
                          <p className="text-[#FF4500]/60">{ej.ejecutado.peso_promedio} kg</p>
                        )}
                      </td>
                      <td className={`px-3 py-2.5 border border-gray-800 text-center font-bold ${rpeClass}`}>
                        {rpeSign}{ej.rpe_vs_programado}
                      </td>
                      <td className={`px-3 py-2.5 border border-gray-800 text-center font-bold ${setsClass}`}>
                        {ej.sets_pct}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab: Bloques ─────────────────────────────────────────────────────────────
function BloquesTab({ bloques, loading }: { bloques: BloqueComp[]; loading: boolean }) {
  const ENFASIS_CFG: Record<string, { bg: string; text: string; bar: string }> = {
    Hipertrofia:   { bg: 'bg-purple-500/10', text: 'text-purple-300', bar: 'bg-purple-500' },
    'Fuerza Base': { bg: 'bg-blue-500/10',   text: 'text-blue-300',   bar: 'bg-blue-500' },
    Volumen:       { bg: 'bg-cyan-500/10',    text: 'text-cyan-300',   bar: 'bg-cyan-500' },
    Peaking:       { bg: 'bg-[#FF4500]/10',  text: 'text-[#FF4500]', bar: 'bg-[#FF4500]' },
    Tapering:      { bg: 'bg-gray-500/10',   text: 'text-gray-400',  bar: 'bg-gray-500' },
  };

  if (loading) return (
    <div className="space-y-3">
      {[1,2,3].map(i => <div key={i} className="h-32 bg-gray-900 border border-gray-800 rounded-2xl animate-pulse" />)}
    </div>
  );

  if (bloques.length === 0) return (
    <div className="text-center py-16 text-gray-600">
      <p className="text-lg mb-1">Sin datos de bloques</p>
      <p className="text-sm">El atleta necesita completar sesiones de un plan para ver la comparativa</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {bloques.map((b, i) => {
        const cfg = ENFASIS_CFG[b.enfasis] ?? ENFASIS_CFG['Tapering'];
        const semanas = b.semanaFin - b.semanaInicio + 1;

        return (
          <div key={b.bloqueId} className={`border border-gray-800 rounded-2xl overflow-hidden`}>
            {/* Header */}
            <div className={`px-5 py-4 flex items-center gap-3 ${cfg.bg}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text} border border-current/20`}>
                    {b.enfasis}
                  </span>
                  <p className="font-semibold text-sm text-white">{b.bloqueNombre}</p>
                  <p className="text-xs text-gray-600">{b.periNombre}</p>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Sem. {b.semanaInicio}–{b.semanaFin} · {semanas} semana{semanas !== 1 ? 's' : ''} · RPE objetivo {b.rpeTarget.min}–{b.rpeTarget.max}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-2xl font-bold text-white">{b.adherencia}%</p>
                <p className="text-[10px] text-gray-600">adherencia</p>
              </div>
            </div>

            {/* Stats row */}
            <div className="px-5 py-4 bg-[#0f0f0f] grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Sesiones</p>
                <p className="text-lg font-bold text-white">
                  {b.sesionesRealizadas}
                  <span className="text-xs text-gray-600 font-normal"> / {b.sesionesProgramadas}</span>
                </p>
                {/* Adherence bar */}
                <div className="w-full h-1 bg-gray-800 rounded-full mt-1.5 overflow-hidden">
                  <div className={`h-full rounded-full ${cfg.bar}`} style={{ width: `${b.adherencia}%` }} />
                </div>
              </div>

              <div>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">RPE promedio</p>
                <p className={`text-lg font-bold ${
                  b.rpePromedio
                    ? b.rpePromedio > b.rpeTarget.max + 0.3
                      ? 'text-red-400'
                      : b.rpePromedio < b.rpeTarget.min - 0.3
                      ? 'text-yellow-400'
                      : 'text-green-400'
                    : 'text-gray-600'
                }`}>
                  {b.rpePromedio ?? '—'}
                </p>
                <p className="text-[10px] text-gray-600">zona {b.rpeTarget.min}–{b.rpeTarget.max}</p>
              </div>

              <div>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Tonelaje total</p>
                <p className="text-lg font-bold text-white">
                  {b.tonelajeTotal >= 1000
                    ? `${(b.tonelajeTotal / 1000).toFixed(1)}t`
                    : `${b.tonelajeTotal}kg`}
                </p>
                <p className="text-[10px] text-gray-600">
                  ~{b.sesionesRealizadas > 0
                    ? Math.round(b.tonelajeTotal / b.sesionesRealizadas).toLocaleString()
                    : '—'} kg/sesión
                </p>
              </div>

              {/* 1RM deltas */}
              <div>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">1RM estimado (δ)</p>
                <div className="flex gap-3">
                  {(['sq', 'bp', 'dl'] as const).map(lift => {
                    const l = b.lifts[lift];
                    if (!l) return null;
                    const pos = l.delta >= 0;
                    return (
                      <div key={lift} className="text-center">
                        <p className="text-[9px] text-gray-600 uppercase">{lift}</p>
                        <p className={`text-sm font-bold ${pos ? 'text-green-400' : 'text-red-400'}`}>
                          {pos ? '+' : ''}{l.delta}
                        </p>
                      </div>
                    );
                  })}
                  {!b.lifts.sq && !b.lifts.bp && !b.lifts.dl && (
                    <p className="text-xs text-gray-700">Sin datos Big 3</p>
                  )}
                </div>
              </div>
            </div>

            {/* 1RM detail — only if there's data */}
            {(b.lifts.sq || b.lifts.bp || b.lifts.dl) && (
              <div className="px-5 py-3 bg-[#0a0a0a] border-t border-gray-800/60 flex gap-6">
                {(['sq', 'bp', 'dl'] as const).map(lift => {
                  const l = b.lifts[lift];
                  if (!l) return null;
                  const liftLabel = lift === 'sq' ? 'Sentadilla' : lift === 'bp' ? 'Banca' : 'Peso muerto';
                  return (
                    <div key={lift} className="flex items-center gap-2 text-sm">
                      <span className="text-gray-600">{liftLabel}</span>
                      <span className="text-gray-500">{l.inicio} kg</span>
                      <span className="text-gray-700">→</span>
                      <span className="text-white font-semibold">{l.fin} kg</span>
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${l.delta >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                        {l.delta >= 0 ? '+' : ''}{l.delta}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Esta semana — tracker compacto ───────────────────────────────────────────

function ThisWeekMini({ data, inputs }: { data: VolumenData; inputs: Record<string, string> }) {
  const currentWeek = isoWeekKey();
  const thisWeek = data.semanas_series.find(s => s.semana === currentWeek) ?? { sq: 0, bp: 0, dl: 0, semana: currentWeek };

  const hasLandmarks = ['sqMev', 'bpMev', 'dlMev'].some(k => inputs[k] !== '');

  return (
    <div className="bg-[#0f0f0f] border border-gray-800 rounded-2xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Volumen esta semana</p>
          <p className="text-[10px] text-gray-700 mt-0.5">Series efectivas acumuladas vs MEV → MRV</p>
        </div>
        {!hasLandmarks && (
          <span className="text-[10px] text-gray-600 bg-gray-800 px-2 py-1 rounded-lg">
            Configura landmarks en tab Volumen
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {LIFT_CFG.map(({ key, label, color, mev, mav, mrv }) => {
          const current = (thisWeek as unknown as Record<string, number>)[key] ?? 0;
          const mevVal = inputs[mev] ? Number(inputs[mev]) : null;
          const mavVal = inputs[mav] ? Number(inputs[mav]) : null;
          const mrvVal = inputs[mrv] ? Number(inputs[mrv]) : null;

          const barMax = mrvVal ? mrvVal * 1.15 : Math.max(current + 4, 12);
          const fillPct = Math.min((current / barMax) * 100, 100);
          const mevPct = mevVal ? (mevVal / barMax) * 100 : null;
          const mavPct = mavVal ? (mavVal / barMax) * 100 : null;
          const mrvPct = mrvVal ? (mrvVal / barMax) * 100 : null;

          const fillColor = (() => {
            if (!mevVal) return '#374151';
            if (mrvVal && current > mrvVal) return '#ef4444';
            if (mavVal && current >= mavVal) return '#FFB800';
            if (current >= mevVal) return '#10B981';
            return '#374151';
          })();

          const statusLabel = (() => {
            if (!mevVal) return { text: '—', color: 'text-gray-700' };
            if (current === 0) return { text: 'Sin series', color: 'text-gray-600' };
            if (mrvVal && current > mrvVal) return { text: '⚠ Sobre MRV', color: 'text-red-400' };
            if (mavVal && current >= mavVal) return { text: 'Cerca del MRV', color: 'text-yellow-400' };
            if (current >= mevVal) return { text: 'Zona productiva', color: 'text-green-400' };
            return { text: 'Bajo MEV', color: 'text-gray-500' };
          })();

          return (
            <div key={key}>
              <div className="flex items-end justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>{label}</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black tabular-nums text-white leading-none">{current}</span>
                  {mevVal && mrvVal && (
                    <span className="text-[10px] text-gray-600 leading-none">{mevVal}–{mrvVal}</span>
                  )}
                </div>
              </div>

              {/* Barra */}
              <div className="relative h-2.5 bg-gray-800 rounded-full overflow-visible mb-1">
                {/* Fill */}
                <div
                  className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
                  style={{ width: `${fillPct}%`, backgroundColor: fillColor }}
                />
                {/* MEV tick */}
                {mevPct !== null && (
                  <div className="absolute top-[-2px] bottom-[-2px] w-[2px] rounded-full bg-gray-500 z-10"
                    style={{ left: `${mevPct}%` }} />
                )}
                {/* MAV tick */}
                {mavPct !== null && (
                  <div className="absolute top-[-2px] bottom-[-2px] w-[2px] rounded-full bg-green-600/60 z-10"
                    style={{ left: `${mavPct}%` }} />
                )}
                {/* MRV tick */}
                {mrvPct !== null && (
                  <div className="absolute top-[-2px] bottom-[-2px] w-[2px] rounded-full bg-red-500/60 z-10"
                    style={{ left: `${mrvPct}%` }} />
                )}
              </div>

              {/* Etiquetas debajo de la barra */}
              <div className="relative h-3.5">
                {mevPct !== null && (
                  <span className="absolute text-[8px] text-gray-600 -translate-x-1/2" style={{ left: `${mevPct}%` }}>MEV</span>
                )}
                {mavPct !== null && (
                  <span className="absolute text-[8px] text-gray-600 -translate-x-1/2" style={{ left: `${mavPct}%` }}>MAV</span>
                )}
                {mrvPct !== null && (
                  <span className="absolute text-[8px] text-gray-600 -translate-x-1/2" style={{ left: `${mrvPct}%` }}>MRV</span>
                )}
              </div>

              <p className={`text-[10px] font-semibold mt-0.5 ${statusLabel.color}`}>{statusLabel.text}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Volume Tab ───────────────────────────────────────────────────────────────

type VolumenTabProps = {
  data: VolumenData | null;
  loading: boolean;
  inputs: Record<string, string>;
  setInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onSave: () => void;
  saving: boolean;
};

const LIFT_CFG = [
  { key: 'sq', label: 'Sentadilla', color: '#FF4500', mev: 'sqMev', mav: 'sqMav', mrv: 'sqMrv' },
  { key: 'bp', label: 'Banca',      color: '#FFB800', mev: 'bpMev', mav: 'bpMav', mrv: 'bpMrv' },
  { key: 'dl', label: 'Peso Muerto',color: '#10B981', mev: 'dlMev', mav: 'dlMav', mrv: 'dlMrv' },
] as const;

function barColor(value: number, mev: number | null, mav: number | null, mrv: number | null): string {
  if (!mev) return '#6b7280';
  if (mrv && value > mrv) return '#ef4444';
  if (mav && value >= mav) return '#FFB800';
  if (value >= mev) return '#10B981';
  return '#6b7280';
}

function VolumenTab({ data, loading, inputs, setInputs, onSave, saving }: VolumenTabProps) {
  if (loading) return <div className="text-center py-20 text-gray-500">Cargando datos de volumen...</div>;

  const inp = (k: string) => inputs[k] ?? '';
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setInputs(prev => ({ ...prev, [k]: e.target.value }));

  return (
    <div className="space-y-6">
      {/* Landmarks form */}
      {/* Nota: el panel "Esta semana" ya aparece arriba del área de tabs, siempre visible */}
      <div className="bg-[#0f0f0f] border border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <p className="font-semibold text-sm">Landmarks de volumen</p>
          <p className="text-xs text-gray-600 mt-0.5">Series efectivas por semana por movimiento</p>
        </div>
        <div className="p-5 space-y-4">
          {LIFT_CFG.map(({ key, label, color, mev, mav, mrv }) => (
            <div key={key}>
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color }}>{label}</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { field: mev, label: 'MEV', hint: 'Mínimo efectivo' },
                  { field: mav, label: 'MAV', hint: 'Máximo adaptativo' },
                  { field: mrv, label: 'MRV', hint: 'Máximo recuperable' },
                ].map(({ field, label: fl, hint }) => (
                  <div key={field}>
                    <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">
                      {fl} <span className="text-gray-700 normal-case">({hint})</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={60}
                      value={inp(field)}
                      onChange={set(field)}
                      placeholder="—"
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-gray-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
          <button
            onClick={onSave}
            disabled={saving}
            className="mt-2 px-5 py-2.5 bg-[#FF4500] hover:bg-[#e03d00] text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-40"
          >
            {saving ? 'Guardando...' : 'Guardar landmarks'}
          </button>
        </div>
      </div>

      {/* Charts per lift */}
      {data && data.semanas_series.length === 0 ? (
        <div className="text-center py-16 bg-gray-900 border border-gray-800 rounded-xl text-gray-600">
          <p className="text-lg mb-1">Sin series registradas</p>
          <p className="text-sm">Los datos aparecerán cuando el atleta complete sesiones.</p>
        </div>
      ) : data && (
        <div className="space-y-5">
          {LIFT_CFG.map(({ key, label, color, mev, mav, mrv }) => {
            const mevVal = inputs[mev] ? Number(inputs[mev]) : null;
            const mavVal = inputs[mav] ? Number(inputs[mav]) : null;
            const mrvVal = inputs[mrv] ? Number(inputs[mrv]) : null;

            const chartData = data.semanas_series.map(s => ({
              semana: s.semana,
              series: s[key],
            }));

            const maxY = Math.max(
              mrvVal ?? 0,
              ...chartData.map(d => d.series),
              10
            ) + 2;

            return (
              <div key={key} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <p className="font-semibold text-sm mb-0.5" style={{ color }}>{label}</p>
                <p className="text-xs text-gray-600 mb-4">Series por semana vs landmarks</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
                    <XAxis dataKey="semana" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, maxY]} tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} width={25} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 8 }}
                      formatter={(v) => [`${v} series`, label]}
                      cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                    />
                    {mevVal !== null && (
                      <ReferenceLine y={mevVal} stroke="#6b7280" strokeDasharray="4 3" strokeWidth={1.5}
                        label={{ value: 'MEV', fill: '#6b7280', fontSize: 9, position: 'insideTopRight', dx: 4 }} />
                    )}
                    {mavVal !== null && (
                      <ReferenceLine y={mavVal} stroke="#10B981" strokeDasharray="4 3" strokeWidth={1.5}
                        label={{ value: 'MAV', fill: '#10B981', fontSize: 9, position: 'insideTopRight', dx: 4 }} />
                    )}
                    {mrvVal !== null && (
                      <ReferenceLine y={mrvVal} stroke="#ef4444" strokeDasharray="4 3" strokeWidth={1.5}
                        label={{ value: 'MRV', fill: '#ef4444', fontSize: 9, position: 'insideTopRight', dx: 4 }} />
                    )}
                    <Bar dataKey="series" radius={[4, 4, 0, 0]} maxBarSize={36}>
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={barColor(entry.series, mevVal, mavVal, mrvVal)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                {/* Zone legend */}
                <div className="flex gap-4 mt-2 text-[10px] text-gray-600">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-500 inline-block" /> Por debajo MEV</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#10B981] inline-block" /> Zona productiva</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#FFB800] inline-block" /> Zona MAV→MRV</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Sobre MRV</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Chart card ───────────────────────────────────────────────────────────────

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <p className="font-semibold text-white mb-0.5">{title}</p>
      <p className="text-xs text-gray-500 mb-5">{subtitle}</p>
      {children}
    </div>
  );
}
