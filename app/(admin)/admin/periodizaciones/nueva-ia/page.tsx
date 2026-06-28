'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// ── Types ────────────────────────────────────────────────────────────────────

type Atleta = {
  id: string;
  rmSquat: number | null;
  rmBench: number | null;
  rmDeadlift: number | null;
  experienciaPowerlifting: string;
  user: { nombre: string };
};

type EjercicioIA = {
  nombre: string;
  tipo: 'COMPETITIVO' | 'VARIANTE' | 'AUXILIAR' | 'COMPENSATORIO' | 'MOVILIDAD';
  grupo: string;
  series: number;
  reps: number;
  rpe_inicial: number;
  rpe_final: number;
  pct_rm: number;
  rest_min: number;
  rir: string;
  notas: string;
};

type DiaIA = {
  dia_semana: string;
  movimiento_principal: string;
  enfoque_dia: string;
  orden: number;
  ejercicios: EjercicioIA[];
};

type BloqueIA = {
  nombre: string;
  numero_bloque: number;
  semana_inicio: number;
  semana_fin: number;
  enfasis: string;
  intensidad_rpe_min: number;
  intensidad_rpe_max: number;
  razon: string;
  dias: DiaIA[];
};

type PlanIA = {
  nombre: string;
  tipo: string;
  objetivo: string;
  descripcion: string;
  bloques: BloqueIA[];
};

// ── Constants ────────────────────────────────────────────────────────────────

const FASES = [
  {
    value: 'Hipertrofia',
    emoji: '💪',
    desc: 'Volumen alto con variantes y accesorios. Resensibiliza el SNC y construye masa muscular base.',
    detalle: '60–80% RM · 6–12 reps · RPE 7–8',
    minSemanas: 4,
    maxSemanas: 12,
    defaultSemanas: 8,
    color: 'text-blue-400 border-blue-500 bg-blue-500/10',
    colorActivo: 'border-blue-400 bg-blue-400/10',
  },
  {
    value: 'Fuerza Base',
    emoji: '🏋️',
    desc: 'Variante principal que ataca el punto débil del atleta. Alta intensidad sobre la variante elegida.',
    detalle: '80–100% RM variante · 3–6 reps · RPE 8–8.5',
    minSemanas: 3,
    maxSemanas: 8,
    defaultSemanas: 5,
    color: 'text-[#FFB800] border-[#FFB800] bg-[#FFB800]/10',
    colorActivo: 'border-[#FFB800] bg-[#FFB800]/10',
  },
  {
    value: 'Volumen',
    emoji: '📈',
    desc: 'Básico de competición como ejercicio principal. Aumenta la capacidad de trabajo.',
    detalle: '70–85% RM · 3–6 reps · RPE 7.5–8.5',
    minSemanas: 4,
    maxSemanas: 8,
    defaultSemanas: 6,
    color: 'text-orange-400 border-orange-400 bg-orange-400/10',
    colorActivo: 'border-orange-400 bg-orange-400/10',
  },
  {
    value: 'Peaking',
    emoji: '🎯',
    desc: 'Movimiento de competición puro. Especificidad máxima. Simula la competición en cada sesión.',
    detalle: '85–100% RM · 1–4 reps · RPE 8.5–9.5',
    minSemanas: 2,
    maxSemanas: 4,
    defaultSemanas: 3,
    color: 'text-[#FF4500] border-[#FF4500] bg-[#FF4500]/10',
    colorActivo: 'border-[#FF4500] bg-[#FF4500]/10',
  },
] as const;

type FaseValue = typeof FASES[number]['value'];

const TIPOS = [
  { value: 'LINEAL', label: 'Lineal', desc: 'Intensidad sube, volumen baja semana a semana. Clásico y predecible.' },
  { value: 'ONDULANTE', label: 'Ondulante', desc: 'Intensidad/volumen varían día a día. Mayor densidad de estímulos.' },
  { value: 'CONJUGADA', label: 'Conjugada', desc: 'ME + DE + Rep days simultáneos. Ejercicio principal rota cada 3 sem.' },
  { value: 'POR_BLOQUES', label: 'Por Bloques', desc: 'Fases secuenciales: Hipertrofia → Fuerza Base → Volumen → Peaking → Tapering.' },
];

const DIA_MAP: Record<string, string> = {
  lunes: 'Lun', martes: 'Mar', miercoles: 'Mié', jueves: 'Jue',
  viernes: 'Vie', sabado: 'Sáb', domingo: 'Dom',
};

function tipoColor(tipo: string) {
  const t = tipo.toUpperCase();
  if (t === 'COMPETITIVO') return 'text-[#FF4500] bg-[#FF4500]/10';
  if (t === 'VARIANTE') return 'text-blue-300 bg-blue-400/10';
  if (t === 'ACCESORIO' || t === 'AUXILIAR') return 'text-orange-300 bg-orange-400/10';
  if (t === 'COMPENSATORIO') return 'text-purple-300 bg-purple-400/10';
  return 'text-green-400 bg-green-400/10';
}

// ── Component ────────────────────────────────────────────────────────────────

export default function NuevaPeriodizacionIAPage() {
  const router = useRouter();
  const getToken = () => localStorage.getItem('token') ?? '';

  type Step = 'configure' | 'generating' | 'review' | 'saving' | 'done';
  const [step, setStep] = useState<Step>('configure');

  // Config form
  const [atletas, setAtletas] = useState<Atleta[]>([]);
  const [atletaId, setAtletaId] = useState('');
  const [faseInicio, setFaseInicio] = useState<FaseValue>('Hipertrofia');
  const [tipo, setTipo] = useState('LINEAL');
  const [duracion, setDuracion] = useState(8);
  const [objetivo, setObjetivo] = useState('');
  const [notas, setNotas] = useState('');
  const [fechaInicio, setFechaInicio] = useState(() => new Date().toISOString().slice(0, 10));
  const [fechaCompetencia, setFechaCompetencia] = useState('');
  const [rms, setRms] = useState<{ sq: string; bp: string; dl: string }>({ sq: '', bp: '', dl: '' });
  const [error, setError] = useState('');

  const faseActual = FASES.find(f => f.value === faseInicio)!;

  const handleFaseChange = (fase: FaseValue) => {
    setFaseInicio(fase);
    const f = FASES.find(ff => ff.value === fase)!;
    setDuracion(f.defaultSemanas);
  };

  // Generated plan
  const [plan, setPlan] = useState<PlanIA | null>(null);
  const [atletaInfo, setAtletaInfo] = useState<{ nombre: string; rmSquat: number | null; rmBench: number | null; rmDeadlift: number | null } | null>(null);
  const [bloqueAbierto, setBloqueAbierto] = useState<number | null>(0);
  const [diaAbierto, setDiaAbierto] = useState<string | null>(null);
  const [editingBloque, setEditingBloque] = useState<number | null>(null);

  // Save
  const [savedId, setSavedId] = useState('');

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push('/login'); return; }
    fetch('/api/atletas', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        const lista: Atleta[] = d.data ?? [];
        setAtletas(lista);
        if (lista[0]) {
          setAtletaId(lista[0].id);
          setRms({
            sq: lista[0].rmSquat ? String(lista[0].rmSquat) : '',
            bp: lista[0].rmBench ? String(lista[0].rmBench) : '',
            dl: lista[0].rmDeadlift ? String(lista[0].rmDeadlift) : '',
          });
        }
      });
  }, [router]);

  // Sync RMs when athlete changes
  useEffect(() => {
    const a = atletas.find(x => x.id === atletaId);
    if (a) {
      setRms({
        sq: a.rmSquat ? String(a.rmSquat) : '',
        bp: a.rmBench ? String(a.rmBench) : '',
        dl: a.rmDeadlift ? String(a.rmDeadlift) : '',
      });
    }
  }, [atletaId, atletas]);

  const handleGenerar = async () => {
    if (!atletaId || !objetivo.trim()) { setError('Selecciona un atleta y escribe el objetivo.'); return; }
    setError('');
    setStep('generating');
    try {
      const res = await fetch('/api/periodizaciones/generar-ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          atletaId, tipo, duracion, objetivo, faseInicio,
          notas: notas || undefined,
          fechaCompetencia: fechaCompetencia || undefined,
          rmsOverride: {
            sq: rms.sq ? Number(rms.sq) : null,
            bp: rms.bp ? Number(rms.bp) : null,
            dl: rms.dl ? Number(rms.dl) : null,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Error generando plan'); setStep('configure'); return; }
      setPlan(data.plan);
      setAtletaInfo(data.atleta);
      setBloqueAbierto(0);
      setStep('review');
    } catch {
      setError('Error de conexión');
      setStep('configure');
    }
  };

  const handleGuardar = async () => {
    if (!plan) return;
    setStep('saving');
    try {
      const res = await fetch('/api/periodizaciones/guardar-ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ plan, atletaId, fechaInicio, fechaCompetencia: fechaCompetencia || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Error guardando'); setStep('review'); return; }
      setSavedId(data.id);
      setStep('done');
    } catch {
      setError('Error de conexión');
      setStep('review');
    }
  };

  const atleta = atletas.find(a => a.id === atletaId);

  // ── Render steps ──────────────────────────────────────────────────────────

  if (step === 'generating') {
    return (
      <div className="min-h-screen bg-[#080808] text-white flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md px-6">
          <div className="w-16 h-16 border-4 border-[#FF4500]/30 border-t-[#FF4500] rounded-full animate-spin mx-auto" />
          <h2 className="text-xl font-bold">Generando periodización con IA</h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            La IA está diseñando una fase de <span className="text-white font-semibold">{faseInicio}</span> para{' '}
            <span className="text-white font-semibold">{atleta?.user.nombre ?? 'tu atleta'}</span> según el Método RV.
            Esto puede tomar 20–40 segundos.
          </p>
          <div className="text-xs text-gray-700 space-y-1">
            <p>✦ Analizando 1RMs y experiencia del atleta</p>
            <p>✦ Estructurando bloques de {faseInicio} ({faseActual.minSemanas}–{faseActual.maxSemanas} sem)</p>
            <p>✦ Calculando progresión de RPE semana a semana</p>
            <p>✦ Seleccionando ejercicios por jerarquía RV</p>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen bg-[#080808] text-white flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md px-6">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold">¡Plan guardado con éxito!</h2>
          <p className="text-gray-500 text-sm">{plan?.nombre}</p>
          <div className="flex gap-3 justify-center">
            <Link href={`/admin/periodizaciones/${savedId}`}
              className="px-5 py-2.5 bg-[#FF4500] hover:bg-[#e03d00] text-white text-sm font-bold rounded-lg transition-colors">
              Ver plan completo →
            </Link>
            <Link href="/admin/periodizaciones"
              className="px-5 py-2.5 border border-gray-700 text-gray-400 hover:text-white text-sm rounded-lg transition-colors">
              Volver a la lista
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'saving') {
    return (
      <div className="min-h-screen bg-[#080808] text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#FF4500]/30 border-t-[#FF4500] rounded-full animate-spin mx-auto" />
          <p className="text-gray-400">Guardando plan en la base de datos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Link href="/admin/periodizaciones" className="inline-block text-sm text-gray-500 hover:text-white transition-colors mb-6">
          ← Periodizaciones
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-[#FF4500]/20 flex items-center justify-center text-xl shrink-0">⚡</div>
          <div>
            <h1 className="text-2xl font-bold">Nueva Periodización con IA</h1>
            <p className="text-gray-500 text-sm">La IA diseña el plan completo según el Método RV. Tú revisas y apruebas.</p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8 text-xs">
          {(['configure', 'review'] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <div className="w-8 h-px bg-gray-800" />}
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-semibold ${
                step === s ? 'bg-[#FF4500] text-white' :
                (step === 'review' && s === 'configure') ? 'bg-gray-800 text-gray-400' :
                'bg-gray-900 text-gray-600'
              }`}>
                <span>{i + 1}</span>
                <span>{s === 'configure' ? 'Configurar' : 'Revisar & Aprobar'}</span>
              </div>
            </div>
          ))}
        </div>

        {/* ── Step: Configure ── */}
        {step === 'configure' && (
          <div className="space-y-6">
            {error && <p className="text-red-400 text-sm bg-red-900/20 border border-red-800/30 rounded-lg px-4 py-3">{error}</p>}

            {/* Athlete */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <p className="text-xs text-[#FFB800] font-bold uppercase tracking-wider mb-4">Atleta</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">Seleccionar atleta</label>
                  <select value={atletaId} onChange={e => setAtletaId(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#FF4500]">
                    {atletas.map(a => (
                      <option key={a.id} value={a.id}>{a.user.nombre}</option>
                    ))}
                  </select>
                  {atleta && (
                    <p className="text-xs text-gray-600 mt-1.5">{atleta.experienciaPowerlifting}</p>
                  )}
                </div>
                <div className="bg-gray-800 rounded-lg px-4 py-3">
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-2.5">
                    1RMs para el plan
                    <span className="text-gray-600 normal-case font-normal ml-1">(editable)</span>
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { key: 'sq' as const, label: 'Sentadilla', color: 'focus:border-[#FF4500]' },
                      { key: 'bp' as const, label: 'Banca', color: 'focus:border-[#FFB800]' },
                      { key: 'dl' as const, label: 'Muerto', color: 'focus:border-green-400' },
                    ]).map(({ key, label, color }) => (
                      <div key={key}>
                        <label className="text-xs text-gray-600 block mb-1">{label}</label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number" min={0} step={2.5}
                            value={rms[key]}
                            onChange={e => setRms(r => ({ ...r, [key]: e.target.value }))}
                            placeholder="—"
                            className={`w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white text-sm focus:outline-none ${color} text-center`}
                          />
                          <span className="text-xs text-gray-600 shrink-0">kg</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Phase selector */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <p className="text-xs text-[#FFB800] font-bold uppercase tracking-wider mb-1">Fase de inicio</p>
              <p className="text-xs text-gray-600 mb-4">Según el Método RV: Hipertrofia → Fuerza Base → Volumen → Peaking</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {FASES.map(f => {
                  const activo = faseInicio === f.value;
                  return (
                    <button key={f.value} onClick={() => handleFaseChange(f.value)}
                      className={`rounded-xl p-4 text-left transition-all border ${
                        activo ? f.colorActivo : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                      }`}>
                      <p className="text-xl mb-2">{f.emoji}</p>
                      <p className={`text-sm font-bold mb-1 ${activo ? f.color.split(' ')[0] : 'text-white'}`}>{f.value}</p>
                      <p className="text-xs text-gray-500 leading-relaxed mb-2">{f.desc}</p>
                      <div className={`text-xs font-mono px-2 py-1 rounded-lg inline-block ${activo ? f.color : 'text-gray-600 bg-gray-700'}`}>
                        {f.minSemanas}–{f.maxSemanas} sem
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Phase detail banner */}
              <div className={`mt-4 rounded-xl px-4 py-3 border flex flex-wrap items-center gap-3 ${faseActual.colorActivo}`}>
                <span className="text-lg">{faseActual.emoji}</span>
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${faseActual.color.split(' ')[0]}`}>{faseActual.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{faseActual.detalle}</p>
                </div>
                <div className="text-right text-xs text-gray-500 shrink-0">
                  <p>Mínimo: <span className="text-white font-semibold">{faseActual.minSemanas} sem</span></p>
                  <p>Máximo: <span className="text-white font-semibold">{faseActual.maxSemanas} sem</span></p>
                </div>
              </div>
            </div>

            {/* Plan parameters */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <p className="text-xs text-[#FFB800] font-bold uppercase tracking-wider mb-4">Parámetros del Plan</p>

              {/* Type */}
              <div className="mb-5">
                <label className="text-xs text-gray-500 block mb-2">Tipo de periodización</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {TIPOS.map(t => (
                    <button key={t.value} onClick={() => setTipo(t.value)}
                      className={`rounded-xl p-3 text-left transition-colors border ${
                        tipo === t.value
                          ? 'border-[#FF4500] bg-[#FF4500]/10'
                          : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                      }`}>
                      <p className={`text-sm font-semibold mb-1 ${tipo === t.value ? 'text-[#FF4500]' : 'text-white'}`}>{t.label}</p>
                      <p className="text-xs text-gray-500 leading-relaxed">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration + Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">
                    Duración — <span className="text-white font-semibold">{faseInicio}</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <input type="range" min={faseActual.minSemanas} max={faseActual.maxSemanas} step={1} value={duracion}
                      onChange={e => setDuracion(Number(e.target.value))}
                      className="flex-1 accent-[#FF4500]" />
                    <span className="text-[#FF4500] font-bold text-lg w-8 text-right">{duracion}</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{faseActual.minSemanas} – {faseActual.maxSemanas} semanas</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">Fecha de inicio</label>
                  <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF4500]" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">Competencia (opcional)</label>
                  <input type="date" value={fechaCompetencia} onChange={e => setFechaCompetencia(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF4500]" />
                </div>
              </div>

              {/* Goal */}
              <div className="mb-4">
                <label className="text-xs text-gray-500 block mb-1.5">
                  Objetivo del plan <span className="text-red-400">*</span>
                </label>
                <textarea value={objetivo} onChange={e => setObjetivo(e.target.value)} rows={2}
                  placeholder="Ej: Preparación para campeonato nacional, aumentar 1RM en los 3 básicos, mejorar técnica en sentadilla..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#FF4500] resize-none" />
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs text-gray-500 block mb-1.5">Notas para la IA (opcional)</label>
                <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2}
                  placeholder="Ej: El atleta tiene limitación en cadera, priorizar variantes de sentadilla. Incluir más trabajo de banca. No incluir días seguidos de pierna..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#FF4500] resize-none" />
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <Link href="/admin/periodizaciones"
                className="px-5 py-2.5 border border-gray-700 text-gray-400 hover:text-white text-sm rounded-lg transition-colors">
                Cancelar
              </Link>
              <button onClick={handleGenerar} disabled={!atletaId || !objetivo.trim()}
                className="px-6 py-2.5 bg-[#FF4500] hover:bg-[#e03d00] text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2">
                ⚡ Generar con IA
              </button>
            </div>
          </div>
        )}

        {/* ── Step: Review ── */}
        {step === 'review' && plan && (
          <div className="space-y-6">
            {error && <p className="text-red-400 text-sm bg-red-900/20 border border-red-800/30 rounded-lg px-4 py-3">{error}</p>}

            {/* Plan header */}
            <div className="bg-gray-900 border border-[#FF4500]/20 rounded-xl p-5">
              <div className="flex flex-wrap justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <input
                    value={plan.nombre}
                    onChange={e => setPlan(p => p ? { ...p, nombre: e.target.value } : p)}
                    className="text-xl font-bold bg-transparent border-b border-transparent hover:border-gray-700 focus:border-[#FF4500] focus:outline-none w-full pb-0.5 transition-colors"
                  />
                  <p className="text-gray-400 text-sm mt-2 leading-relaxed">{plan.descripcion}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs text-gray-600 mb-1">{tipo} · {duracion} semanas</p>
                  {atletaInfo && (
                    <div className="text-xs text-gray-500 space-y-0.5">
                      <p>SQ <span className="text-[#FF4500]">{atletaInfo.rmSquat ?? '—'} kg</span></p>
                      <p>BP <span className="text-[#FFB800]">{atletaInfo.rmBench ?? '—'} kg</span></p>
                      <p>DL <span className="text-green-400">{atletaInfo.rmDeadlift ?? '—'} kg</span></p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* IA badge */}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="w-2 h-2 rounded-full bg-[#FF4500] animate-pulse shrink-0" />
              Plan generado por IA según el Método RV. Revisa cada bloque antes de aprobar.
            </div>

            {/* Blocks */}
            <div className="space-y-3">
              {plan.bloques.map((bloque, bi) => (
                <BloqueReviewCard
                  key={bi}
                  bloque={bloque}
                  isOpen={bloqueAbierto === bi}
                  isEditing={editingBloque === bi}
                  onToggle={() => setBloqueAbierto(bloqueAbierto === bi ? null : bi)}
                  onEditToggle={() => setEditingBloque(editingBloque === bi ? null : bi)}
                  diaAbierto={diaAbierto}
                  setDiaAbierto={setDiaAbierto}
                  onChange={(updated: BloqueIA) => setPlan(p => {
                    if (!p) return p;
                    const bloques = [...p.bloques];
                    bloques[bi] = updated;
                    return { ...p, bloques };
                  })}
                />
              ))}
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-center">
                <p className="text-xs text-gray-500 mb-1">Bloques</p>
                <p className="text-2xl font-bold text-white">{plan.bloques.length}</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-center">
                <p className="text-xs text-gray-500 mb-1">Semanas</p>
                <p className="text-2xl font-bold text-white">{plan.bloques.reduce((max, b) => Math.max(max, b.semana_fin), 0)}</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-center">
                <p className="text-xs text-gray-500 mb-1">Sesiones totales</p>
                <p className="text-2xl font-bold text-white">
                  {plan.bloques.reduce((sum, b) => sum + b.dias.length * (b.semana_fin - b.semana_inicio + 1), 0)}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 justify-between items-center pt-2">
              <button onClick={() => { setPlan(null); setStep('configure'); }}
                className="text-sm text-gray-500 hover:text-white transition-colors flex items-center gap-1.5">
                ← Regenerar
              </button>
              <div className="flex gap-3">
                <button onClick={handleGuardar}
                  className="px-6 py-2.5 bg-[#FF4500] hover:bg-[#e03d00] text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2">
                  ✓ Aprobar y guardar plan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Block review card ─────────────────────────────────────────────────────────

function BloqueReviewCard({
  bloque, isOpen, isEditing, onToggle, onEditToggle, diaAbierto, setDiaAbierto, onChange,
}: {
  bloque: BloqueIA;
  isOpen: boolean;
  isEditing: boolean;
  onToggle: () => void;
  onEditToggle: () => void;
  diaAbierto: string | null;
  setDiaAbierto: (k: string | null) => void;
  onChange: (b: BloqueIA) => void;
}) {
  const sesionesTotales = bloque.dias.length * (bloque.semana_fin - bloque.semana_inicio + 1);
  const semanas = bloque.semana_fin - bloque.semana_inicio + 1;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <button onClick={onToggle}
        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gray-800/40 transition-colors">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-[#FF4500]/20 flex items-center justify-center text-[#FF4500] font-bold text-sm shrink-0">
            {bloque.numero_bloque}
          </span>
          <div>
            <p className="font-semibold">{bloque.nombre}</p>
            <p className="text-gray-500 text-xs mt-0.5">
              Sem. {bloque.semana_inicio}–{bloque.semana_fin} · {bloque.enfasis} · RPE {bloque.intensidad_rpe_min}–{bloque.intensidad_rpe_max}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-2">
          <span className="text-xs text-gray-600">{semanas} sem · {sesionesTotales} sesiones</span>
          <span className="text-gray-600 text-xs">{isOpen ? '▲' : '▼'}</span>
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-gray-800 px-5 py-4 space-y-4">
          {/* IA reason */}
          <div className="flex items-start gap-2 bg-[#FF4500]/5 border border-[#FF4500]/10 rounded-lg px-3 py-2.5">
            <span className="text-[#FF4500] text-xs mt-0.5 shrink-0">⚡</span>
            <p className="text-xs text-gray-400 leading-relaxed">{bloque.razon}</p>
          </div>

          {/* Inline editor */}
          {isEditing ? (
            <div className="bg-gray-800 rounded-xl p-4 space-y-3 border border-gray-700">
              <p className="text-xs text-[#FFB800] font-semibold uppercase tracking-wider">Editar bloque</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 block mb-1">Nombre</label>
                  <input value={bloque.nombre} onChange={e => onChange({ ...bloque, nombre: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF4500]" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">RPE mín</label>
                  <input type="number" min={6} max={10} step={0.5}
                    value={bloque.intensidad_rpe_min}
                    onChange={e => onChange({ ...bloque, intensidad_rpe_min: Number(e.target.value) })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF4500]" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">RPE máx</label>
                  <input type="number" min={6} max={10} step={0.5}
                    value={bloque.intensidad_rpe_max}
                    onChange={e => onChange({ ...bloque, intensidad_rpe_max: Number(e.target.value) })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF4500]" />
                </div>
              </div>
              <button onClick={onEditToggle}
                className="text-xs text-green-400 hover:text-green-300 font-semibold">
                ✓ Listo
              </button>
            </div>
          ) : (
            <button onClick={onEditToggle}
              className="text-xs text-gray-500 hover:text-white transition-colors border border-dashed border-gray-700 hover:border-gray-500 rounded-lg px-3 py-1.5">
              ✏️ Editar nombre / RPE
            </button>
          )}

          {/* Training days */}
          <div>
            <p className="text-xs text-gray-600 uppercase font-semibold tracking-wider mb-2">
              {bloque.dias.length} días / semana — plantilla que se repite {semanas} semanas
            </p>
            <div className="space-y-2">
              {[...bloque.dias].sort((a, b) => a.orden - b.orden).map((dia, di) => {
                const key = `${bloque.numero_bloque}-${di}`;
                const isOpenDia = diaAbierto === key;
                return (
                  <div key={di} className="border border-gray-700 rounded-xl overflow-hidden">
                    <button onClick={() => setDiaAbierto(isOpenDia ? null : key)}
                      className="w-full px-4 py-3 flex items-center justify-between bg-gray-800/50 hover:bg-gray-800 transition-colors text-left">
                      <div>
                        <span className="text-xs text-[#FFB800] font-semibold mr-2">
                          {DIA_MAP[dia.dia_semana.toLowerCase()] ?? dia.dia_semana}
                        </span>
                        <span className="text-sm font-semibold">{dia.movimiento_principal}</span>
                        <span className="text-xs text-gray-500 ml-2">{dia.enfoque_dia}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-gray-600">{dia.ejercicios.length} ej.</span>
                        <span className="text-xs text-gray-600">{isOpenDia ? '▲' : '▼'}</span>
                      </div>
                    </button>

                    {isOpenDia && (
                      <div className="bg-[#0d0d0d] px-4 py-3 overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#111]">
                              <th className="px-2 py-2 text-left text-gray-500 border border-gray-800">Ejercicio</th>
                              <th className="px-2 py-2 text-center text-gray-500 border border-gray-800">Tipo</th>
                              <th className="px-2 py-2 text-center text-[#FFB800] border border-gray-800">S×R</th>
                              <th className="px-2 py-2 text-center text-gray-500 border border-gray-800">RPE S1→SF</th>
                              <th className="px-2 py-2 text-center text-gray-500 border border-gray-800">%RM</th>
                              <th className="px-2 py-2 text-center text-gray-500 border border-gray-800">RIR</th>
                              <th className="px-2 py-2 text-left text-gray-500 border border-gray-800">Notas</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dia.ejercicios.map((ej, ei) => (
                              <tr key={ei} className="border-b border-gray-800 hover:bg-gray-800/30">
                                <td className="px-2 py-2 border border-gray-800 font-semibold text-white">
                                  {ej.grupo && <span className="text-[#FFB800] font-mono mr-1.5">{ej.grupo}</span>}
                                  {ej.nombre}
                                </td>
                                <td className="px-2 py-2 border border-gray-800 text-center">
                                  <span className={`px-1.5 py-0.5 rounded text-xs ${tipoColor(ej.tipo)}`}>
                                    {ej.tipo.charAt(0) + ej.tipo.slice(1).toLowerCase()}
                                  </span>
                                </td>
                                <td className="px-2 py-2 border border-gray-800 text-center font-mono text-[#FF4500] font-bold">
                                  {ej.series}×{ej.reps}
                                </td>
                                <td className="px-2 py-2 border border-gray-800 text-center text-gray-300">
                                  {ej.rpe_inicial} → {ej.rpe_final}
                                </td>
                                <td className="px-2 py-2 border border-gray-800 text-center text-[#FF4500] font-mono">
                                  {ej.pct_rm ? `${ej.pct_rm}%` : '—'}
                                </td>
                                <td className="px-2 py-2 border border-gray-800 text-center text-[#FFB800]">
                                  {ej.rir || '—'}
                                </td>
                                <td className="px-2 py-2 border border-gray-800 text-gray-500 max-w-[160px] truncate">
                                  {ej.notas || '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
