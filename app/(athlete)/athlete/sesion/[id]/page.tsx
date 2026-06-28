'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { estimateOneRM, calcTonnage } from '@/lib/formulas';

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
  orden: number;
};

type Sesion = {
  id: string;
  movimientoPrincipal: string;
  enfocuoDia: string | null;
  diaSemana: string;
  numeroSemana: number;
  ejercicios: Ejercicio[];
};

type RegistroRow = {
  kg: string;
  reps: string;
  rir: string;
  rpe: string;
  obs: string;
  guardado: boolean;
};

type Sugerencia = {
  ultimoPeso: number;
  ultimoRpe: number;
  rpeProgramado: number;
  pesoProgramado: number | null;
  pesoPropuesto: number;
  delta: number;
  fecha: string;
};

// ── Color helpers ────────────────────────────────────────────────────────────

function sesionTheme(mov: string): { border: string; badge: string; label: string; glow: string } {
  const m = mov.toLowerCase();
  if (m.includes('sentadilla') || m.includes('squat'))
    return { border: 'border-blue-500/40', badge: 'bg-blue-500/20 text-blue-300', label: 'SQ', glow: 'shadow-blue-500/10' };
  if (m.includes('muerto') || m.includes('dl') || m.includes('sumo') || m.includes('conv'))
    return { border: 'border-orange-500/40', badge: 'bg-orange-500/20 text-orange-300', label: 'DL', glow: 'shadow-orange-500/10' };
  if (m.includes('banca') || m.includes('bench') || m.includes('press'))
    return { border: 'border-green-500/40', badge: 'bg-green-500/20 text-green-300', label: 'BP', glow: 'shadow-green-500/10' };
  return { border: 'border-[#FF4500]/30', badge: 'bg-[#FF4500]/20 text-[#FF4500]', label: '—', glow: 'shadow-[#FF4500]/10' };
}

function tipoColor(tipo: string): string {
  const t = tipo.toUpperCase();
  if (t === 'COMPETITIVO') return 'text-[#FF4500] bg-[#FF4500]/10';
  if (t === 'VARIANTE') return 'text-blue-300 bg-blue-400/10';
  if (t === 'ACCESORIO' || t === 'AUXILIAR') return 'text-orange-300 bg-orange-400/10';
  if (t === 'COMPENSATORIO') return 'text-purple-300 bg-purple-400/10';
  if (t === 'MOVILIDAD') return 'text-green-400 bg-green-400/10';
  return 'text-gray-400 bg-gray-800';
}

function grupoColor(grupo: string | null): string {
  if (!grupo) return 'text-gray-400';
  if (grupo.startsWith('A')) return 'text-[#FFB800] font-bold';
  if (grupo.startsWith('B')) return 'text-blue-300 font-semibold';
  return 'text-gray-400';
}

function rpeColor(rpe: number): { text: string; bg: string; border: string } {
  if (rpe <= 7)   return { text: 'text-green-400',    bg: 'bg-green-400/15',    border: 'border-green-400/40' };
  if (rpe <= 8)   return { text: 'text-[#FFB800]',    bg: 'bg-[#FFB800]/15',    border: 'border-[#FFB800]/40' };
  if (rpe <= 9)   return { text: 'text-[#FF4500]',    bg: 'bg-[#FF4500]/15',    border: 'border-[#FF4500]/40' };
  return              { text: 'text-red-400',      bg: 'bg-red-400/15',      border: 'border-red-400/40' };
}

// ── Warmup calculator ────────────────────────────────────────────────────────

type WarmupSet = { peso: number; reps: number; pct: number };

function calcularCalentamiento(pesoTrabajo: number): WarmupSet[] {
  const BAR = 20;
  const round = (w: number) => Math.round(w / 2.5) * 2.5;
  if (pesoTrabajo <= BAR) return [];
  const sets: WarmupSet[] = [{ peso: BAR, reps: 8, pct: 0 }];
  let pcts: { pct: number; reps: number }[];
  if (pesoTrabajo <= 60) {
    pcts = [{ pct: 0.60, reps: 5 }];
  } else if (pesoTrabajo <= 90) {
    pcts = [{ pct: 0.52, reps: 5 }, { pct: 0.72, reps: 3 }];
  } else if (pesoTrabajo <= 130) {
    pcts = [{ pct: 0.48, reps: 5 }, { pct: 0.63, reps: 3 }, { pct: 0.78, reps: 2 }];
  } else if (pesoTrabajo <= 170) {
    pcts = [{ pct: 0.43, reps: 5 }, { pct: 0.58, reps: 3 }, { pct: 0.70, reps: 2 }, { pct: 0.83, reps: 1 }];
  } else {
    pcts = [{ pct: 0.38, reps: 5 }, { pct: 0.52, reps: 3 }, { pct: 0.65, reps: 2 }, { pct: 0.77, reps: 1 }, { pct: 0.88, reps: 1 }];
  }
  for (const { pct, reps } of pcts) {
    const w = round(pesoTrabajo * pct);
    if (w > BAR && w < pesoTrabajo) sets.push({ peso: w, reps, pct });
  }
  return sets;
}

const STORAGE_KEY = (id: string) => `valkyria_sesion_${id}`;
const RPE_OPTS = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];

export default function SesionPage() {
  const router = useRouter();
  const params = useParams();
  const sesionId = params.id as string;

  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [loading, setLoading] = useState(true);
  const [registros, setRegistros] = useState<Record<string, RegistroRow[]>>({});
  const [selEjId, setSelEjId] = useState<string | null>(null);
  const [completada, setCompletada] = useState(false);
  const [completando, setCompletando] = useState(false);
  const [tonelaje, setTonelaje] = useState(0);
  const [notaModal, setNotaModal] = useState(false);
  const [nota, setNota] = useState('');
  const [videoLink, setVideoLink] = useState('');
  const [sugerencias, setSugerencias] = useState<Record<string, Sugerencia>>({});
  const [estadoFatiga, setEstadoFatiga] = useState<'VERDE' | 'AMARILLA' | 'ROJA' | null>(null);
  const [records, setRecords] = useState<Record<string, number>>({});
  const [prFlash, setPrFlash] = useState<{ nombre: string; valor: number } | null>(null);
  const [pesoDelDia, setPesoDelDia] = useState<Record<string, string>>({});
  const [movilidadCheck, setMovilidadCheck] = useState<Record<string, boolean>>({});

  const getToken = () => localStorage.getItem('token') ?? '';

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push('/login'); return; }

    const saved = localStorage.getItem(STORAGE_KEY(sesionId));
    if (saved) {
      const p = JSON.parse(saved);
      setRegistros(p.registros ?? {});
      setTonelaje(p.tonelaje ?? 0);
    }

    (async () => {
      try {
        const res = await fetch('/api/periodizaciones', { headers: { Authorization: `Bearer ${token}` } });
        const d = await res.json();
        const activa = d.data?.[0];
        if (!activa) return;

        const detail = await fetch(`/api/periodizaciones/${activa.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.json());

        for (const bloque of detail.bloques) {
          const s = bloque.sesiones.find((s: Sesion) => s.id === sesionId);
          if (s) {
            setSesion(s);
            setPesoDelDia(prev => {
              const next = { ...prev };
              for (const ej of s.ejercicios) {
                if (ej.pesoProgramado != null && !next[ej.id]) {
                  next[ej.id] = String(ej.pesoProgramado);
                }
              }
              return next;
            });
            fetch(`/api/athlete/autoregulacion?sesionId=${sesionId}`, {
              headers: { Authorization: `Bearer ${token}` },
            })
              .then(r => r.json())
              .then(d => {
                if (d.sugerencias) setSugerencias(d.sugerencias);
                if (d.estadoFatiga) setEstadoFatiga(d.estadoFatiga);
                if (d.maxrm) setRecords(d.maxrm);
              })
              .catch(() => {});
            break;
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [router, sesionId]);

  const saveLocal = useCallback((r: typeof registros, t: number) => {
    localStorage.setItem(STORAGE_KEY(sesionId), JSON.stringify({ registros: r, tonelaje: t }));
  }, [sesionId]);

  const addRow = (ejId: string) => {
    setRegistros(prev => {
      const rows = prev[ejId] ?? [];
      return { ...prev, [ejId]: [...rows, { kg: pesoDelDia[ejId] ?? '', reps: '', rir: '', rpe: '8', obs: '', guardado: false }] };
    });
  };

  const updateRow = (ejId: string, idx: number, field: keyof RegistroRow, val: string) => {
    setRegistros(prev => {
      const rows = [...(prev[ejId] ?? [])];
      rows[idx] = { ...rows[idx], [field]: val };
      return { ...prev, [ejId]: rows };
    });
  };

  const saveRow = async (ej: Ejercicio, idx: number) => {
    const row = registros[ej.id]?.[idx];
    if (!row || !row.kg || !row.reps) return;

    const token = getToken();
    const kg = Number(row.kg);
    const reps = Number(row.reps);
    const t = calcTonnage(kg, reps, 1);

    try {
      await fetch('/api/seguimiento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ejercicio_sesion_id: ej.id,
          numero_set: idx + 1,
          reps_realizadas: reps,
          peso_usado: kg,
          rpe_reportado: Number(row.rpe) || ej.rpeProgramado,
          notas: row.obs,
        }),
      });

      const newT = tonelaje + t;
      setRegistros(prev => {
        const rows = [...(prev[ej.id] ?? [])];
        rows[idx] = { ...rows[idx], guardado: true };
        const next = { ...prev, [ej.id]: rows };
        saveLocal(next, newT);
        return next;
      });
      setTonelaje(newT);

      const rm1 = Math.round(estimateOneRM(kg, reps) * 10) / 10;
      const prevBest = records[ej.id] ?? 0;
      if (rm1 > prevBest) {
        setRecords(prev => ({ ...prev, [ej.id]: rm1 }));
        setPrFlash({ nombre: ej.ejercicioNombre, valor: rm1 });
        setTimeout(() => setPrFlash(null), 5000);
      }
    } catch { /* silent */ }
  };

  const handleConfirmar = async () => {
    setNotaModal(false);
    setCompletando(true);
    const token = getToken();
    try {
      await fetch('/api/seguimiento/completar-sesion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          sesion_id: sesionId,
          nota_general: nota.trim() || undefined,
          video_link: videoLink.trim() || undefined,
        }),
      });
      localStorage.removeItem(STORAGE_KEY(sesionId));
      setCompletada(true);
    } finally {
      setCompletando(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[#FF4500] border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-600 text-sm">Cargando sesión...</p>
      </div>
    </div>
  );

  if (completada) return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col items-center justify-center gap-5 px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-[#FF4500]/15 flex items-center justify-center text-4xl">💪</div>
      <div>
        <h1 className="text-2xl font-bold text-[#FF4500]">Sesión completada</h1>
        <p className="text-gray-500 text-sm mt-1">Tu coach revisará tu sesión pronto</p>
      </div>
      <div className="flex gap-6 mt-2">
        <div className="text-center">
          <p className="text-3xl font-black text-white">{tonelaje.toLocaleString()}</p>
          <p className="text-xs text-gray-600 mt-0.5">kg tonelaje</p>
        </div>
      </div>
      {nota.trim() && (
        <div className="max-w-xs w-full text-left bg-[#0f0f0f] border border-gray-800 rounded-xl px-4 py-3">
          <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Tu nota</p>
          <p className="text-xs text-gray-400 italic">"{nota.trim()}"</p>
        </div>
      )}
      <Link href="/athlete/dashboard" className="mt-2 px-8 py-3.5 bg-[#FF4500] hover:bg-[#e03d00] rounded-xl font-bold transition-colors">
        Volver al dashboard →
      </Link>
    </div>
  );

  if (!sesion) return (
    <div className="min-h-screen bg-[#080808] text-white flex items-center justify-center text-gray-500">
      Sesión no encontrada
    </div>
  );

  const theme = sesionTheme(sesion.movimientoPrincipal);
  const todosEjercicios = [...sesion.ejercicios].sort((a, b) => a.orden - b.orden);
  const ejMovilidad = todosEjercicios.filter(e => e.tipoEjercicio === 'MOVILIDAD');
  const ejercicios = todosEjercicios.filter(e => e.tipoEjercicio !== 'MOVILIDAD');
  const totalSets = ejercicios.reduce((s, e) => s + e.setsProgramados, 0);
  const savedSets = Object.values(registros).flat().filter(r => r.guardado).length;
  const progressPct = totalSets > 0 ? Math.round((savedSets / totalSets) * 100) : 0;
  const movilidadDone = ejMovilidad.length > 0 && ejMovilidad.every(e => movilidadCheck[e.id]);

  return (
    <div className="min-h-screen bg-[#080808] text-white">

      {/* PR Flash Banner */}
      {prFlash && (
        <div className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pt-3 pointer-events-none">
          <div className="bg-gradient-to-r from-[#FFB800] to-[#FF4500] text-black font-black px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 w-full max-w-sm">
            <span className="text-2xl">🏆</span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-widest opacity-70">¡Nuevo récord personal!</p>
              <p className="text-sm leading-tight truncate">{prFlash.nombre}</p>
              <p className="text-xs opacity-80">1RM estimado: <span className="font-black text-base">{prFlash.valor} kg</span></p>
            </div>
            <button onClick={() => setPrFlash(null)} className="text-black/50 hover:text-black text-xl pointer-events-auto shrink-0">×</button>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="border-b border-gray-800 px-4 py-3 flex items-center justify-between sticky top-0 bg-[#080808]/95 backdrop-blur z-10">
        <Link href="/athlete/dashboard" className="text-gray-500 text-sm flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Volver
        </Link>
        <div className="flex flex-col items-end">
          <span className="text-xs font-bold text-[#FFB800]">{tonelaje.toLocaleString()} kg</span>
          <span className="text-[10px] text-gray-600">tonelaje</span>
        </div>
      </nav>

      {/* Progress bar */}
      <div className="h-1 bg-gray-900">
        <div
          className="h-full bg-gradient-to-r from-[#FF4500] to-[#FFB800] transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="max-w-3xl mx-auto px-4 py-5">

        {/* Session header */}
        <div className={`border ${theme.border} rounded-2xl px-4 py-4 mb-5 shadow-lg ${theme.glow}`}>
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${theme.badge}`}>{theme.label}</span>
            <span className="text-xs text-gray-500 uppercase tracking-wider">{sesion.diaSemana} · Semana {sesion.numeroSemana}</span>
            {progressPct > 0 && (
              <span className="ml-auto text-xs text-gray-500">{savedSets}/{totalSets} sets</span>
            )}
          </div>
          <h1 className="text-xl font-black">{sesion.movimientoPrincipal}</h1>
          {sesion.enfocuoDia && <p className="text-gray-400 text-sm mt-0.5">{sesion.enfocuoDia}</p>}
          <p className="text-xs text-[#FF4500]/70 mt-2">ORDEN: A → B → C · El principal siempre primero</p>
        </div>

        {/* Fatigue banners */}
        {estadoFatiga === 'ROJA' && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 flex gap-3 items-start">
            <span className="text-red-400 text-lg shrink-0">⚠️</span>
            <div>
              <p className="text-sm font-bold text-red-400">Fatiga crítica detectada</p>
              <p className="text-xs text-red-300/70 mt-0.5">Tu RPE lleva varios días por encima de 8.7. Pesos reducidos — considera hablar con tu coach.</p>
            </div>
          </div>
        )}
        {estadoFatiga === 'AMARILLA' && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/25 flex gap-3 items-start">
            <span className="text-yellow-400 text-lg shrink-0">🔶</span>
            <div>
              <p className="text-sm font-bold text-yellow-400">Fatiga elevada</p>
              <p className="text-xs text-yellow-300/70 mt-0.5">RPE promedio &gt; 8.5 los últimos 7 días. Respeta los pesos sugeridos.</p>
            </div>
          </div>
        )}

        {/* ── MOVILIDAD / ANTES DE ENTRENAR ────────────────────────────── */}
        {ejMovilidad.length > 0 && (
          <div className={`rounded-2xl border mb-5 overflow-hidden transition-all ${movilidadDone ? 'border-green-500/30' : 'border-green-500/20'}`}>
            <div className={`px-4 py-3 flex items-center justify-between ${movilidadDone ? 'bg-green-500/10' : 'bg-green-500/5'}`}>
              <div className="flex items-center gap-2">
                <span className="text-green-400 text-base">🧘</span>
                <div>
                  <p className="text-sm font-bold text-green-400">Antes de entrenar</p>
                  <p className="text-[10px] text-green-400/50 uppercase tracking-wider">Movilidad · {ejMovilidad.length} ejercicio{ejMovilidad.length > 1 ? 's' : ''}</p>
                </div>
              </div>
              {movilidadDone && (
                <span className="text-xs text-green-400 font-bold bg-green-400/10 px-2.5 py-1 rounded-full">✓ Listo</span>
              )}
            </div>
            <div className="px-4 py-3 space-y-2 bg-[#080808]">
              {ejMovilidad.map((ej) => {
                const checked = movilidadCheck[ej.id] ?? false;
                return (
                  <button
                    key={ej.id}
                    onClick={() => setMovilidadCheck(prev => ({ ...prev, [ej.id]: !prev[ej.id] }))}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
                      checked ? 'bg-green-500/5 border-green-500/20 opacity-60' : 'bg-[#111] border-gray-800 hover:border-green-500/20'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                      checked ? 'bg-green-500 border-green-500' : 'border-gray-600'
                    }`}>
                      {checked && <span className="text-[10px] text-black font-black">✓</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${checked ? 'line-through text-gray-600' : 'text-white'}`}>
                        {ej.ejercicioNombre}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[11px] text-gray-500 font-mono">{ej.setsProgramados}×{ej.repsProgramadas}</span>
                        {ej.rirLabel && <span className="text-[11px] text-gray-600">{ej.rirLabel}</span>}
                        {ej.notasTecnicas && <span className="text-[11px] text-gray-600 italic truncate">{ej.notasTecnicas}</span>}
                      </div>
                    </div>
                    {ej.videoUrl && (
                      <a href={ej.videoUrl} target="_blank" rel="noopener noreferrer"
                         onClick={e => e.stopPropagation()}
                         className="text-green-400 text-xs shrink-0 hover:text-green-300">▶</a>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── PLAN DEL DÍA ─────────────────────────────────────────────── */}
        <div className="mb-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Plan del día</p>

          {/* Mobile card view */}
          <div className="md:hidden space-y-2">
            {ejercicios.map((ej) => {
              const rpeC = rpeColor(ej.rpeProgramado);
              return (
                <button
                  key={ej.id}
                  onClick={() => setSelEjId(selEjId === ej.id ? null : ej.id)}
                  className={`w-full text-left rounded-xl border px-4 py-3 flex items-center gap-3 transition-colors ${
                    selEjId === ej.id ? 'bg-gray-800 border-[#FF4500]/40' : 'bg-[#111] border-gray-800'
                  }`}
                >
                  <span className={`text-sm shrink-0 w-6 ${grupoColor(ej.ordenGrupo)}`}>{ej.ordenGrupo ?? ej.orden}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm truncate">{ej.ejercicioNombre}</p>
                      {ej.videoUrl && (
                        <a href={ej.videoUrl} target="_blank" rel="noopener noreferrer"
                           onClick={e => e.stopPropagation()}
                           className="text-green-400 text-xs shrink-0">▶</a>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-gray-400 font-mono">{ej.setsProgramados}×{ej.repsProgramadas}</span>
                      {ej.pesoProgramado != null && (
                        <span className="text-xs text-[#FFB800] font-bold font-mono">{ej.pesoProgramado}kg</span>
                      )}
                      {ej.cargaRef && (
                        <span className="text-[10px] text-gray-500">{ej.cargaRef}</span>
                      )}
                      {ej.rirLabel && (
                        <span className="text-[10px] text-gray-600">{ej.rirLabel}</span>
                      )}
                    </div>
                    {ej.notasTecnicas && (
                      <p className="text-[10px] text-gray-600 mt-1 line-clamp-1 italic">{ej.notasTecnicas}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs px-2 py-1 rounded-full font-bold border ${rpeC.text} ${rpeC.bg} ${rpeC.border}`}>
                      {ej.rpeProgramado}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${tipoColor(ej.tipoEjercicio)}`}>
                      {ej.tipoEjercicio.charAt(0)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[#0d0d0d]">
                  <th className="px-3 py-2 text-left text-xs text-[#FFB800] font-semibold border border-gray-800">Orden</th>
                  <th className="px-3 py-2 text-left text-xs text-[#FFB800] font-semibold border border-gray-800">Ejercicio</th>
                  <th className="px-3 py-2 text-center text-xs text-[#FFB800] font-semibold border border-gray-800">Tipo</th>
                  <th className="px-3 py-2 text-center text-xs text-gray-500 font-semibold border border-gray-800">Carga / ref.</th>
                  <th className="px-3 py-2 text-center text-xs text-gray-500 font-semibold border border-gray-800">Aproximación</th>
                  <th className="px-3 py-2 text-center text-xs text-gray-500 font-semibold border border-gray-800">Series×Reps</th>
                  <th className="px-3 py-2 text-center text-xs text-gray-500 font-semibold border border-gray-800">RPE</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-500 font-semibold border border-gray-800">Notas</th>
                </tr>
              </thead>
              <tbody>
                {ejercicios.map((ej) => {
                  const rpeC = rpeColor(ej.rpeProgramado);
                  return (
                    <tr
                      key={ej.id}
                      onClick={() => setSelEjId(selEjId === ej.id ? null : ej.id)}
                      className={`border-b border-gray-800 cursor-pointer transition-colors ${
                        selEjId === ej.id ? 'bg-gray-800' : 'bg-gray-900 hover:bg-gray-800/70'
                      }`}
                    >
                      <td className="px-3 py-3 border border-gray-800">
                        <span className={`text-sm ${grupoColor(ej.ordenGrupo)}`}>{ej.ordenGrupo ?? ej.orden}</span>
                      </td>
                      <td className="px-3 py-3 border border-gray-800">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-white">{ej.ejercicioNombre}</p>
                          {ej.videoUrl && (
                            <a href={ej.videoUrl} target="_blank" rel="noopener noreferrer"
                               onClick={e => e.stopPropagation()} className="text-green-400 text-xs">▶</a>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 border border-gray-800 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded ${tipoColor(ej.tipoEjercicio)}`}>
                          {ej.tipoEjercicio.charAt(0) + ej.tipoEjercicio.slice(1).toLowerCase()}
                        </span>
                      </td>
                      <td className="px-3 py-2 border border-gray-800 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          {ej.pesoProgramado != null && (
                            <span className="text-sm font-bold text-[#FFB800] font-mono">{ej.pesoProgramado} kg</span>
                          )}
                          {ej.cargaRef && <span className="text-[10px] text-gray-500">{ej.cargaRef}</span>}
                          {!ej.pesoProgramado && !ej.cargaRef && <span className="text-gray-700 text-xs">—</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2 border border-gray-800 text-center">
                        <span className="text-xs text-gray-400">{ej.rirLabel ?? '—'}</span>
                      </td>
                      <td className="px-3 py-2 border border-gray-800 text-center">
                        <span className="font-mono text-[#FF4500] font-bold">{ej.setsProgramados}×{ej.repsProgramadas}</span>
                      </td>
                      <td className="px-3 py-2 border border-gray-800 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${rpeC.text} ${rpeC.bg}`}>
                          {ej.rpeProgramado}
                        </span>
                      </td>
                      <td className="px-3 py-2 border border-gray-800">
                        <span className="text-xs text-gray-500 line-clamp-2">{ej.notasTecnicas ?? '—'}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Coach notes (mobile, for selected exercise) */}
        {selEjId && (() => {
          const ej = ejercicios.find(e => e.id === selEjId)!;
          return (ej.notasTecnicas || ej.videoUrl) ? (
            <div className="bg-[#1c1c1c] border border-gray-700 rounded-xl px-4 py-3 mb-4 md:hidden">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Notas del entrenador</p>
              {ej.notasTecnicas && <p className="text-sm text-gray-300">{ej.notasTecnicas}</p>}
              {ej.videoUrl && (
                <a href={ej.videoUrl} target="_blank" rel="noopener noreferrer"
                   className="inline-flex items-center gap-1.5 mt-2 text-green-400 text-sm font-semibold">
                  ▶ Ver video de referencia
                </a>
              )}
            </div>
          ) : null;
        })()}

        {/* ── REGISTRO ──────────────────────────────────────────────────── */}
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">
            Registro — completa después de cada ejercicio
          </p>

          <div className="space-y-3">
            {ejercicios.map((ej) => {
              const rows = registros[ej.id] ?? [];
              const isSelected = selEjId === ej.id;
              const completedSets = rows.filter(r => r.guardado).length;
              const allDone = completedSets >= ej.setsProgramados;

              return (
                <div
                  key={ej.id}
                  className={`rounded-2xl border overflow-hidden transition-all ${
                    allDone ? 'border-green-500/30' : isSelected ? 'border-[#FF4500]/40' : 'border-gray-800'
                  }`}
                >
                  {/* Header */}
                  <button
                    onClick={() => setSelEjId(isSelected ? null : ej.id)}
                    className={`w-full px-4 py-3.5 flex items-center justify-between text-left transition-colors ${
                      allDone ? 'bg-green-500/5' : 'bg-[#1c1c1c]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`text-sm shrink-0 ${grupoColor(ej.ordenGrupo)}`}>{ej.ordenGrupo ?? ej.orden}</span>
                      <span className="font-semibold text-sm truncate">{ej.ejercicioNombre}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      {completedSets > 0 && (
                        <div className="flex items-center gap-1.5">
                          <div className="flex gap-0.5">
                            {Array.from({ length: ej.setsProgramados }).map((_, i) => (
                              <div
                                key={i}
                                className={`w-1.5 h-1.5 rounded-full ${i < completedSets ? 'bg-green-400' : 'bg-gray-700'}`}
                              />
                            ))}
                          </div>
                          <span className={`text-xs font-medium ${allDone ? 'text-green-400' : 'text-gray-500'}`}>
                            {completedSets}/{ej.setsProgramados}
                          </span>
                        </div>
                      )}
                      <span className="text-gray-600 text-xs">{isSelected ? '▲' : '▼'}</span>
                    </div>
                  </button>

                  {/* Expanded */}
                  {isSelected && (
                    <div className="bg-[#141414] px-4 py-4">

                      {/* Peso del día */}
                      <div className="mb-5">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="text-[10px] text-gray-600 uppercase tracking-wider">Peso de hoy</span>
                          {ej.cargaRef && (
                            <span className="text-[10px] text-[#FFB800] bg-[#FFB800]/10 px-2 py-0.5 rounded font-mono">
                              ref: {ej.cargaRef}
                            </span>
                          )}
                          {ej.videoUrl && (
                            <a href={ej.videoUrl} target="_blank" rel="noopener noreferrer"
                               className="text-[10px] text-green-400 flex items-center gap-1">▶ video</a>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <input
                            type="number" step={2.5} min={0}
                            value={pesoDelDia[ej.id] ?? ''}
                            onChange={e => {
                              const val = e.target.value;
                              setPesoDelDia(p => ({ ...p, [ej.id]: val }));
                              setRegistros(prev => ({
                                ...prev,
                                [ej.id]: (prev[ej.id] ?? []).map(row => row.guardado ? row : { ...row, kg: val }),
                              }));
                            }}
                            placeholder="kg"
                            className="w-28 text-2xl font-black bg-gray-800 border-2 border-gray-600 focus:border-[#FF4500] rounded-xl px-4 py-3 text-white text-center focus:outline-none"
                          />
                          <div className="text-xs text-gray-600 leading-relaxed">
                            <p className="font-mono text-gray-400">{ej.setsProgramados} × {ej.repsProgramadas}</p>
                            <p className="mt-0.5">RPE objetivo: {(() => { const c = rpeColor(ej.rpeProgramado); return <span className={`font-bold ${c.text}`}>{ej.rpeProgramado}</span>; })()}</p>
                          </div>
                        </div>
                      </div>

                      {/* Warmup */}
                      {(() => {
                        const pesoTrabajo = pesoDelDia[ej.id] ? Number(pesoDelDia[ej.id]) : (sugerencias[ej.id]?.pesoPropuesto ?? ej.pesoProgramado ?? null);
                        if (!pesoTrabajo || ej.tipoEjercicio === 'MOVILIDAD') return null;
                        const warmup = calcularCalentamiento(pesoTrabajo);
                        if (!warmup.length) return null;
                        return (
                          <div className="mb-4">
                            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">
                              Calentamiento → <span className="text-white font-bold">{pesoTrabajo} kg</span>
                            </p>
                            <div className="flex gap-2 flex-wrap">
                              {warmup.map((s, i) => {
                                const intensity = pesoTrabajo > 0 ? s.peso / pesoTrabajo : 0;
                                const warmColor = intensity < 0.5 ? 'border-gray-700 text-gray-400' :
                                  intensity < 0.7 ? 'border-blue-500/30 text-blue-300' :
                                  intensity < 0.85 ? 'border-[#FFB800]/30 text-[#FFB800]' :
                                  'border-[#FF4500]/30 text-[#FF4500]';
                                return (
                                  <div key={i} className={`flex flex-col items-center bg-[#1a1a1a] border rounded-lg px-3 py-2 ${warmColor}`}>
                                    <span className="text-xs font-bold">{s.peso}kg</span>
                                    <span className="text-[10px] opacity-60">×{s.reps}</span>
                                    <span className="text-[9px] opacity-40">{s.pct === 0 ? 'barra' : `${Math.round(s.pct * 100)}%`}</span>
                                  </div>
                                );
                              })}
                              <div className="flex flex-col items-center bg-[#FF4500]/10 border border-[#FF4500]/40 rounded-lg px-3 py-2">
                                <span className="text-xs font-bold text-[#FF4500]">{pesoTrabajo}kg</span>
                                <span className="text-[10px] text-[#FF4500]/60">×trab.</span>
                                <span className="text-[9px] text-[#FF4500]/40">100%</span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Autoregulation */}
                      {sugerencias[ej.id] && (() => {
                        const s = sugerencias[ej.id];
                        const deltaColor = s.delta > 0 ? 'text-green-400' : s.delta < 0 ? 'text-red-400' : 'text-gray-400';
                        return (
                          <div className="mb-4 px-3 py-2.5 rounded-xl bg-[#1a1a1a] border border-[#FF4500]/20 flex items-center justify-between gap-2 flex-wrap">
                            <div className="text-xs text-gray-500">
                              <span className="text-[#FFB800] font-semibold">⚡ Auto</span>
                              <span className="ml-2">{s.ultimoPeso}kg · RPE {s.ultimoRpe} ({s.fecha})</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-bold text-white">{s.pesoPropuesto}kg</span>
                              <span className={`text-xs ${deltaColor}`}>({s.delta > 0 ? '+' : ''}{s.delta}kg)</span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Set rows */}
                      <div className="space-y-2">
                        {rows.map((row, idx) => {
                          const rpeVal = Number(row.rpe) || 8;
                          const rpeC = rpeColor(rpeVal);
                          return (
                            <div key={idx} className={`transition-opacity ${row.guardado ? 'opacity-50' : ''}`}>
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className="text-[10px] text-gray-600 w-10">Set {idx + 1}</span>
                                {row.guardado && <span className="text-[10px] text-green-400">✓ guardado</span>}
                              </div>
                              {/* Mobile: 3 inputs + save */}
                              <div className="flex gap-2 md:hidden">
                                <div className="flex-1">
                                  <label className="text-[9px] text-gray-600 uppercase block mb-1">Kg</label>
                                  <input
                                    type="number" step={2.5} min={0}
                                    value={row.kg}
                                    onChange={e => updateRow(ej.id, idx, 'kg', e.target.value)}
                                    disabled={row.guardado}
                                    placeholder="—"
                                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-3 text-white text-sm text-center focus:outline-none focus:border-[#FF4500] disabled:opacity-40"
                                  />
                                </div>
                                <div className="flex-1">
                                  <label className="text-[9px] text-gray-600 uppercase block mb-1">Reps</label>
                                  <input
                                    type="number" min={0}
                                    value={row.reps}
                                    onChange={e => updateRow(ej.id, idx, 'reps', e.target.value)}
                                    disabled={row.guardado}
                                    placeholder={String(ej.repsProgramadas)}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-3 text-white text-sm text-center focus:outline-none focus:border-[#FF4500] disabled:opacity-40"
                                  />
                                </div>
                                <div className="flex-1">
                                  <label className="text-[9px] text-gray-600 uppercase block mb-1">RPE</label>
                                  <select
                                    value={row.rpe}
                                    onChange={e => updateRow(ej.id, idx, 'rpe', e.target.value)}
                                    disabled={row.guardado}
                                    className={`w-full border rounded-xl px-2 py-3 text-sm text-center focus:outline-none disabled:opacity-40 bg-gray-800 ${rpeC.text} ${rpeC.border}`}
                                  >
                                    {RPE_OPTS.map(r => (
                                      <option key={r} value={r} className="bg-gray-900 text-white">{r}</option>
                                    ))}
                                  </select>
                                </div>
                                {!row.guardado ? (
                                  <div className="flex flex-col justify-end">
                                    <label className="text-[9px] text-transparent block mb-1">.</label>
                                    <button
                                      onClick={() => saveRow(ej, idx)}
                                      disabled={!row.kg || !row.reps}
                                      className="bg-[#FF4500] text-white rounded-xl px-4 py-3 font-bold text-base disabled:opacity-30 hover:bg-[#e03d00] active:scale-95 transition-all"
                                    >
                                      ✓
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex flex-col justify-end">
                                    <label className="text-[9px] text-transparent block mb-1">.</label>
                                    <div className="px-3 py-3 flex items-center text-green-400 text-lg">✓</div>
                                  </div>
                                )}
                              </div>

                              {/* Desktop: 5-col grid */}
                              <div className="hidden md:grid grid-cols-5 gap-2 items-end">
                                <div>
                                  <label className="text-[9px] text-gray-600 uppercase block mb-1">Kg real</label>
                                  <input
                                    type="number" step={2.5} min={0}
                                    value={row.kg}
                                    onChange={e => updateRow(ej.id, idx, 'kg', e.target.value)}
                                    disabled={row.guardado}
                                    placeholder="kg"
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-2.5 text-white text-sm text-center focus:outline-none focus:border-[#FF4500] disabled:opacity-40"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] text-gray-600 uppercase block mb-1">Reps</label>
                                  <input
                                    type="number" min={0}
                                    value={row.reps}
                                    onChange={e => updateRow(ej.id, idx, 'reps', e.target.value)}
                                    disabled={row.guardado}
                                    placeholder={String(ej.repsProgramadas)}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-2.5 text-white text-sm text-center focus:outline-none focus:border-[#FF4500] disabled:opacity-40"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] text-gray-600 uppercase block mb-1">RIR</label>
                                  <input
                                    type="text"
                                    value={row.rir}
                                    onChange={e => updateRow(ej.id, idx, 'rir', e.target.value)}
                                    disabled={row.guardado}
                                    placeholder="ej: 3"
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-2.5 text-white text-sm text-center focus:outline-none focus:border-[#FF4500] disabled:opacity-40"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] text-gray-600 uppercase block mb-1">RPE</label>
                                  <select
                                    value={row.rpe}
                                    onChange={e => updateRow(ej.id, idx, 'rpe', e.target.value)}
                                    disabled={row.guardado}
                                    className={`w-full border rounded-lg px-2 py-2.5 text-sm focus:outline-none disabled:opacity-40 bg-gray-800 ${rpeC.text} ${rpeC.border}`}
                                  >
                                    {RPE_OPTS.map(r => (
                                      <option key={r} value={r} className="bg-gray-900 text-white">{r}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="flex gap-1">
                                  <input
                                    type="text"
                                    value={row.obs}
                                    onChange={e => updateRow(ej.id, idx, 'obs', e.target.value)}
                                    disabled={row.guardado}
                                    placeholder="obs."
                                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-2.5 text-white text-xs focus:outline-none focus:border-[#FF4500] disabled:opacity-40"
                                  />
                                  {!row.guardado ? (
                                    <button
                                      onClick={() => saveRow(ej, idx)}
                                      disabled={!row.kg || !row.reps}
                                      className="bg-[#FF4500] text-white rounded-lg px-3 py-2.5 text-sm font-bold disabled:opacity-30 hover:bg-[#e03d00]"
                                    >✓</button>
                                  ) : (
                                    <span className="text-green-400 px-2 flex items-center">✓</span>
                                  )}
                                </div>
                              </div>

                              {/* Mobile obs (below, collapsible only if not saved) */}
                              {!row.guardado && (
                                <div className="mt-1.5 md:hidden">
                                  <input
                                    type="text"
                                    value={row.obs}
                                    onChange={e => updateRow(ej.id, idx, 'obs', e.target.value)}
                                    placeholder="Observación (opcional)"
                                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none focus:border-[#FF4500]"
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Add set */}
                      {rows.length < ej.setsProgramados + 2 && (
                        <button
                          onClick={() => addRow(ej.id)}
                          className="mt-3 w-full py-3 rounded-xl border border-dashed border-gray-700 text-sm text-gray-500 hover:text-[#FF4500] hover:border-[#FF4500]/40 transition-colors"
                        >
                          + Set {rows.length + 1}
                        </button>
                      )}

                      {/* 1RM live estimate */}
                      {rows.some(r => r.guardado && r.kg && r.reps) && (() => {
                        const lastSaved = rows.filter(r => r.guardado && r.kg && r.reps).at(-1);
                        const rm = Math.round(estimateOneRM(Number(lastSaved?.kg ?? 0), Number(lastSaved?.reps ?? 0)) * 10) / 10;
                        const pr = records[ej.id] ?? 0;
                        const esPR = rm >= pr && pr > 0;
                        const diff = pr > 0 ? Math.round((rm - pr) * 10) / 10 : null;
                        return (
                          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-800">
                            <p className="text-xs text-gray-600">
                              1RM est.: <span className={esPR ? 'text-[#FFB800] font-bold' : 'text-gray-400'}>{rm} kg</span>
                              {esPR && <span className="ml-1">🏆</span>}
                            </p>
                            {pr > 0 && !esPR && diff !== null && (
                              <p className="text-xs text-gray-700">PR: {pr}kg ({diff > 0 ? '+' : ''}{diff})</p>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Complete button */}
        <button
          onClick={() => setNotaModal(true)}
          disabled={completando}
          className="mt-8 mb-6 w-full bg-[#FF4500] hover:bg-[#e03d00] active:scale-[0.98] text-white font-black py-4 rounded-2xl transition-all disabled:opacity-50 text-base shadow-lg shadow-[#FF4500]/20"
        >
          {completando ? 'Finalizando...' : `Completar sesión →`}
        </button>
      </div>

      {/* ── NOTA MODAL ─────────────────────────────────────────────── */}
      {notaModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setNotaModal(false)} />
          <div className="relative w-full max-w-md bg-[#111] border border-gray-800 rounded-2xl p-5 shadow-2xl">
            <h2 className="text-lg font-bold mb-1">¿Cómo te sentiste?</h2>
            <p className="text-gray-500 text-sm mb-4">¿Cómo te sentiste en la sesión? Opcional.</p>

            <textarea
              value={nota}
              onChange={e => setNota(e.target.value)}
              maxLength={500}
              rows={4}
              autoFocus
              placeholder="Ej: Las sentadillas estuvieron pesadas, me dolió la rodilla derecha al final..."
              className="w-full bg-[#0a0a0a] border border-gray-700 focus:border-[#FF4500] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 resize-none outline-none transition-colors"
            />
            <p className="text-[11px] text-gray-700 mt-1 text-right mb-3">{nota.length}/500</p>

            <label className="text-xs text-gray-500 block mb-1.5">📎 Link de video <span className="text-gray-700">(opcional)</span></label>
            <input
              type="url"
              value={videoLink}
              onChange={e => setVideoLink(e.target.value)}
              placeholder="https://www.instagram.com/reel/..."
              className="w-full bg-[#0a0a0a] border border-gray-700 focus:border-[#FF4500] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none transition-colors mb-4"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setNotaModal(false)}
                className="flex-1 py-3.5 rounded-xl border border-gray-800 text-gray-500 hover:text-white hover:border-gray-600 text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmar}
                className="flex-1 py-3.5 rounded-xl bg-[#FF4500] hover:bg-[#e03d00] text-white font-bold text-sm transition-colors"
              >
                {nota.trim() ? 'Guardar y completar' : 'Completar sin nota'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
