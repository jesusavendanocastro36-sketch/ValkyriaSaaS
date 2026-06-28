'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// ── Constants ────────────────────────────────────────────────────────────────

const DIAS = [
  { id: 'lunes', short: 'Lun' }, { id: 'martes', short: 'Mar' },
  { id: 'miércoles', short: 'Mié' }, { id: 'jueves', short: 'Jue' },
  { id: 'viernes', short: 'Vie' }, { id: 'sábado', short: 'Sáb' },
  { id: 'domingo', short: 'Dom' },
];

const CATEGORIAS_HOMBRE = ['59kg', '66kg', '74kg', '83kg', '93kg', '105kg', '120kg', '+120kg'];
const CATEGORIAS_MUJER  = ['47kg', '52kg', '57kg', '63kg', '69kg', '76kg', '84kg', '+84kg'];

const OBJETIVOS_OPTS = [
  { id: 'competencia',   label: 'Competir en powerlifting', icon: '🏆' },
  { id: 'fuerza',        label: 'Ganar fuerza máxima',      icon: '💪' },
  { id: 'hipertrofia',   label: 'Hipertrofia / volumen',    icon: '📈' },
  { id: 'perder_peso',   label: 'Perder peso',              icon: '⚖️' },
  { id: 'recreacional',  label: 'Entrenamiento recreacional',icon: '🎯' },
  { id: 'rehabilitacion',label: 'Rehabilitación / salud',   icon: '🩺' },
];

const LESIONES_OPTS = [
  'Rodilla', 'Hombro', 'Lumbar', 'Cadera', 'Codo', 'Muñeca', 'Tobillo', 'Cuello',
];

const EQUIPO_CATS = [
  { cat: 'Básico (powerlifting)', items: [
    { id: 'barra_olimpica',    label: 'Barra olímpica',          icon: '🏋️' },
    { id: 'discos',            label: 'Discos / Plates',         icon: '⭕' },
    { id: 'rack',              label: 'Rack / Jaula',            icon: '🔩' },
    { id: 'banco_plano',       label: 'Banco plano',             icon: '🪑' },
  ]},
  { cat: 'Barras especializadas', items: [
    { id: 'barra_hex',         label: 'Barra hexagonal (trap)',  icon: '🔷' },
    { id: 'barra_ssb',         label: 'Safety squat bar',        icon: '🔁' },
    { id: 'barra_ez',          label: 'Barra EZ / curl',         icon: '〰️' },
    { id: 'barra_suiza',       label: 'Barra suiza (football)',  icon: '🏈' },
  ]},
  { cat: 'Musculación', items: [
    { id: 'mancuernas',        label: 'Mancuernas',              icon: '💪' },
    { id: 'banco_inclinado',   label: 'Banco inclinado',         icon: '📐' },
    { id: 'polea_alta',        label: 'Polea alta / jalón',      icon: '🔼' },
    { id: 'polea_baja',        label: 'Polea baja',              icon: '🔽' },
    { id: 'cable_crossover',   label: 'Cable crossover',         icon: '✖️' },
    { id: 'smith',             label: 'Máquina Smith',           icon: '🔧' },
    { id: 'maq_pecho',         label: 'Máquina de pecho',        icon: '🫀' },
    { id: 'maq_hombros',       label: 'Máquina de hombros',      icon: '🏔️' },
    { id: 'remo_t',            label: 'Remo en T / máquina',     icon: '🚣' },
  ]},
  { cat: 'Piernas', items: [
    { id: 'leg_press',         label: 'Leg press',               icon: '🦵' },
    { id: 'hack_squat',        label: 'Hack squat',              icon: '📦' },
    { id: 'leg_curl',          label: 'Leg curl',                icon: '🦿' },
    { id: 'leg_extension',     label: 'Leg extension',           icon: '↗️' },
    { id: 'glute_machine',     label: 'Máquina de glúteos',      icon: '🍑' },
    { id: 'ghd',               label: 'GHD / Hiperextensión',    icon: '📉' },
  ]},
  { cat: 'Powerlifting específico', items: [
    { id: 'bandas',            label: 'Bandas elásticas',        icon: '🔴' },
    { id: 'cadenas',           label: 'Cadenas',                 icon: '⛓️' },
    { id: 'cinto',             label: 'Cinto de levantamiento',  icon: '🥋' },
    { id: 'monolift',          label: 'Monolift',                icon: '🏗️' },
    { id: 'reverse_hyper',     label: 'Reverse hyper',           icon: '🔃' },
    { id: 'pec_deck',          label: 'Pec deck / mariposa',     icon: '🦋' },
  ]},
];

const TOTAL_STEPS = 5;

// ── Form state type ───────────────────────────────────────────────────────────

type FormData = {
  sexo: 'M' | 'F' | '';
  peso: string;
  altura: string;
  edad: string;
  categoriaPeso: string;
  experiencia: string;
  rmSquat: string;
  rmBench: string;
  rmDeadlift: string;
  sinRm: boolean;
  objetivos: string[];
  lesionesConocidas: string[];
  lesionesTexto: string;
  equipamiento: string[];
  dias: string[];
};

const INITIAL: FormData = {
  sexo: '', peso: '', altura: '', edad: '', categoriaPeso: '',
  experiencia: 'principiante', rmSquat: '', rmBench: '', rmDeadlift: '', sinRm: false,
  objetivos: [], lesionesConocidas: [], lesionesTexto: '',
  equipamiento: [],
  dias: [],
};

const STEPS = [
  { num: 1, title: 'Datos físicos',       sub: 'Peso, altura, edad y categoría' },
  { num: 2, title: 'Experiencia y 1RMs',  sub: 'Nivel y cargas actuales' },
  { num: 3, title: 'Objetivos y lesiones',sub: 'Qué buscas y cómo cuidarte' },
  { num: 4, title: 'Equipamiento',        sub: 'Qué tienes disponible en tu gym' },
  { num: 5, title: 'Días de entreno',     sub: 'Cuándo puedes entrenar' },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(INITIAL);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const rol = localStorage.getItem('rol');
    if (rol !== 'ATHLETE') { router.push('/login'); return; }

    const token = localStorage.getItem('token');
    fetch('/api/athlete/perfil', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d.altura && d.edad) router.push('/athlete/dashboard');
      })
      .catch(() => {});
  }, [router]);

  const set = (field: keyof FormData, val: FormData[keyof FormData]) =>
    setForm(f => ({ ...f, [field]: val }));

  const toggleArr = (field: 'objetivos' | 'lesionesConocidas' | 'equipamiento' | 'dias', val: string) =>
    setForm(f => {
      const arr = f[field] as string[];
      return { ...f, [field]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] };
    });

  const canNext = () => {
    if (step === 1) return form.sexo && form.peso && form.altura && form.edad;
    if (step === 2) return form.experiencia;
    if (step === 3) return form.objetivos.length > 0;
    if (step === 4) return true;
    if (step === 5) return form.dias.length > 0;
    return true;
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    const token = localStorage.getItem('token');

    const lesionesActuales = [
      ...form.lesionesConocidas,
      ...(form.lesionesTexto.trim() ? [form.lesionesTexto.trim()] : []),
    ];

    try {
      const res = await fetch('/api/athlete/perfil', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          pesoActual:              form.peso    ? Number(form.peso)    : null,
          altura:                  form.altura  ? Number(form.altura)  : null,
          edad:                    form.edad    ? Number(form.edad)    : null,
          categoriaPeso:           form.categoriaPeso || null,
          experienciaPowerlifting: form.experiencia,
          rmSquat:                 !form.sinRm && form.rmSquat  ? Number(form.rmSquat)  : null,
          rmBench:                 !form.sinRm && form.rmBench  ? Number(form.rmBench)  : null,
          rmDeadlift:              !form.sinRm && form.rmDeadlift ? Number(form.rmDeadlift) : null,
          objetivos:               form.objetivos,
          lesionesActuales,
          equipamiento:            form.equipamiento,
          diasDisponibles:         form.dias,
        }),
      });

      if (!res.ok) { setError('Error al guardar. Inténtalo de nuevo.'); return; }

      // Mark profile as complete so the layout doesn't re-check on next load
      const uid = localStorage.getItem('userId');
      if (uid) localStorage.setItem(`valkyria_perfil_ok_${uid}`, '1');

      const nombre = localStorage.getItem('nombre') ?? 'Tu atleta';
      fetch('/api/mensajes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          contenido: `📋 ${nombre} acaba de completar su ficha de onboarding. Ya tienes todos sus datos (físicos, 1RMs, objetivos y equipamiento) para crear su plan de entrenamiento.`,
          tipo: 'TEXTO',
        }),
      }).catch(() => {});

      router.push('/athlete/dashboard?onboarding=done');
    } catch {
      setError('Error de conexión.');
    } finally {
      setSaving(false);
    }
  };

  const pct = Math.round((step / TOTAL_STEPS) * 100);
  const categorias = form.sexo === 'F' ? CATEGORIAS_MUJER : CATEGORIAS_HOMBRE;

  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col">

      {/* Header */}
      <div className="px-4 pt-6 pb-4 border-b border-gray-900">
        <p className="text-xs text-[#FF4500] font-black tracking-widest mb-1">VALKYRIA</p>
        <h1 className="text-xl font-black">{STEPS[step - 1].title}</h1>
        <p className="text-gray-500 text-sm">{STEPS[step - 1].sub}</p>

        <div className="mt-4">
          <div className="flex justify-between text-[10px] text-gray-700 mb-1.5">
            <span>Paso {step} de {TOTAL_STEPS}</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 bg-gray-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#FF4500] to-[#FFB800] transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex gap-1 mt-2">
            {STEPS.map(s => (
              <div key={s.num} className={`flex-1 h-1 rounded-full ${s.num <= step ? 'bg-[#FF4500]' : 'bg-gray-800'}`} />
            ))}
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-lg mx-auto w-full">

        {/* ── STEP 1: Datos físicos ── */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider block mb-2">Sexo biológico</label>
              <div className="grid grid-cols-2 gap-3">
                {[{ id: 'M', label: 'Masculino' }, { id: 'F', label: 'Femenino' }].map(o => (
                  <button key={o.id} type="button"
                    onClick={() => { set('sexo', o.id as 'M' | 'F'); set('categoriaPeso', ''); }}
                    className={`py-3.5 rounded-xl border font-semibold text-sm transition-all ${
                      form.sexo === o.id ? 'bg-[#FF4500]/10 border-[#FF4500]/60 text-[#FF4500]' : 'bg-[#111] border-gray-800 text-gray-500'
                    }`}
                  >{o.label}</button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider block mb-2">Peso actual (kg)</label>
                <input type="number" step="0.1" min="30" max="250" value={form.peso}
                  onChange={e => set('peso', e.target.value)} placeholder="ej: 83"
                  className="w-full bg-[#111] border border-gray-800 focus:border-[#FF4500] rounded-xl px-4 py-3.5 text-white text-center text-xl font-bold focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider block mb-2">Altura (cm)</label>
                <input type="number" min="140" max="220" value={form.altura}
                  onChange={e => set('altura', e.target.value)} placeholder="ej: 175"
                  className="w-full bg-[#111] border border-gray-800 focus:border-[#FF4500] rounded-xl px-4 py-3.5 text-white text-center text-xl font-bold focus:outline-none" />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider block mb-2">Edad</label>
              <input type="number" min="14" max="80" value={form.edad}
                onChange={e => set('edad', e.target.value)} placeholder="ej: 24"
                className="w-full bg-[#111] border border-gray-800 focus:border-[#FF4500] rounded-xl px-4 py-3.5 text-white text-center text-xl font-bold focus:outline-none" />
            </div>

            {form.sexo && (
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider block mb-2">
                  Categoría de competencia <span className="text-gray-700 normal-case">(opcional)</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {categorias.map(c => (
                    <button key={c} type="button"
                      onClick={() => set('categoriaPeso', form.categoriaPeso === c ? '' : c)}
                      className={`py-2.5 rounded-xl text-sm font-bold border transition-all ${
                        form.categoriaPeso === c ? 'bg-[#FF4500]/10 border-[#FF4500]/60 text-[#FF4500]' : 'bg-[#111] border-gray-800 text-gray-500'
                      }`}
                    >{c}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Experiencia + 1RMs ── */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider block mb-2">Nivel de experiencia</label>
              <div className="space-y-2">
                {[
                  { id: 'principiante', label: 'Principiante',  sub: 'Menos de 1 año entrenando con barra' },
                  { id: 'intermedio',   label: 'Intermedio',    sub: '1–3 años, domino los movimientos básicos' },
                  { id: 'avanzado',     label: 'Avanzado',      sub: '3+ años, he competido o tengo técnica sólida' },
                  { id: 'elite',        label: 'Élite',         sub: '5+ años, compito regularmente a nivel nacional/internacional' },
                ].map(o => (
                  <button key={o.id} type="button" onClick={() => set('experiencia', o.id)}
                    className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all ${
                      form.experiencia === o.id ? 'bg-[#FF4500]/10 border-[#FF4500]/60' : 'bg-[#111] border-gray-800'
                    }`}
                  >
                    <p className={`font-semibold text-sm ${form.experiencia === o.id ? 'text-[#FF4500]' : 'text-white'}`}>{o.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{o.sub}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-gray-500 uppercase tracking-wider">1RMs actuales</label>
                <button type="button" onClick={() => set('sinRm', !form.sinRm)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                    form.sinRm ? 'bg-gray-700 border-gray-600 text-white' : 'bg-[#111] border-gray-800 text-gray-500'
                  }`}
                >
                  {form.sinRm ? '✓ No sé mis 1RMs' : 'No sé mis 1RMs'}
                </button>
              </div>

              {!form.sinRm ? (
                <div className="space-y-3">
                  {[
                    { field: 'rmSquat' as const,    label: 'Sentadilla',    emoji: '🦵' },
                    { field: 'rmBench' as const,    label: 'Press de banca',emoji: '💪' },
                    { field: 'rmDeadlift' as const, label: 'Peso muerto',   emoji: '🏋️' },
                  ].map(({ field, label, emoji }) => (
                    <div key={field} className="flex items-center gap-3">
                      <span className="text-lg w-8 shrink-0 text-center">{emoji}</span>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 mb-1">{label}</p>
                        <div className="flex items-center gap-2">
                          <input type="number" step="2.5" min="20" max="500"
                            value={form[field]} onChange={e => set(field, e.target.value)} placeholder="kg"
                            className="w-28 bg-[#111] border border-gray-800 focus:border-[#FF4500] rounded-xl px-4 py-3 text-white text-center font-bold text-lg focus:outline-none" />
                          <span className="text-gray-600 text-sm">kg</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  <p className="text-[11px] text-gray-700 mt-1">
                    Si no tienes 1RM de competencia, puedes colocar tu mejor entrenamiento reciente.
                  </p>
                </div>
              ) : (
                <div className="bg-[#111] border border-gray-800 rounded-xl px-4 py-3">
                  <p className="text-sm text-gray-400">Tu coach definirá los pesos de trabajo en tu primer plan.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 3: Objetivos + Lesiones ── */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider block mb-3">
                ¿Qué buscas lograr? <span className="text-gray-700 normal-case">(selecciona todos los que apliquen)</span>
              </label>
              <div className="space-y-2">
                {OBJETIVOS_OPTS.map(o => {
                  const sel = form.objetivos.includes(o.id);
                  return (
                    <button key={o.id} type="button" onClick={() => toggleArr('objetivos', o.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all ${
                        sel ? 'bg-[#FF4500]/10 border-[#FF4500]/50 text-white' : 'bg-[#111] border-gray-800 text-gray-400'
                      }`}
                    >
                      <span className="text-xl shrink-0">{o.icon}</span>
                      <span className="text-sm font-medium flex-1 text-left">{o.label}</span>
                      {sel && <span className="text-[#FF4500] shrink-0">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider block mb-3">
                Lesiones o limitaciones <span className="text-gray-700 normal-case">(si tienes alguna)</span>
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {LESIONES_OPTS.map(l => {
                  const sel = form.lesionesConocidas.includes(l);
                  return (
                    <button key={l} type="button" onClick={() => toggleArr('lesionesConocidas', l)}
                      className={`px-3 py-2 rounded-xl text-sm border transition-all ${
                        sel ? 'bg-red-500/10 border-red-500/40 text-red-400' : 'bg-[#111] border-gray-800 text-gray-500'
                      }`}
                    >{l}</button>
                  );
                })}
              </div>
              <textarea
                value={form.lesionesTexto}
                onChange={e => set('lesionesTexto', e.target.value)}
                placeholder="Describe en detalle si hay algo que tu coach deba saber (cirugías, dolores crónicos, limitaciones de rango, etc.)"
                rows={3}
                className="w-full bg-[#111] border border-gray-800 focus:border-[#FF4500] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-700 resize-none focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* ── STEP 4: Equipamiento ── */}
        {step === 4 && (
          <div className="space-y-5">
            <p className="text-sm text-gray-400">
              Marca todo lo que tienes disponible en tu gym. Tu coach lo tendrá en cuenta al programar.
            </p>
            {EQUIPO_CATS.map(cat => (
              <div key={cat.cat}>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">{cat.cat}</p>
                <div className="grid grid-cols-2 gap-2">
                  {cat.items.map(item => {
                    const sel = form.equipamiento.includes(item.id);
                    return (
                      <button key={item.id} type="button" onClick={() => toggleArr('equipamiento', item.id)}
                        className={`flex items-center gap-2.5 px-3 py-3 rounded-xl border text-left transition-all active:scale-95 ${
                          sel ? 'bg-[#FF4500]/10 border-[#FF4500]/40 text-white' : 'bg-[#111] border-gray-800 text-gray-500'
                        }`}
                      >
                        <span className="text-lg shrink-0">{item.icon}</span>
                        <span className="text-xs font-medium leading-tight flex-1">{item.label}</span>
                        {sel && <span className="text-[#FF4500] text-xs shrink-0">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {form.equipamiento.length === 0 && (
              <p className="text-xs text-gray-700 text-center pt-2">
                Si no seleccionas nada, tu coach lo completará contigo.
              </p>
            )}
          </div>
        )}

        {/* ── STEP 5: Días disponibles ── */}
        {step === 5 && (
          <div className="space-y-6">
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider block mb-3">
                ¿Qué días puedes entrenar?
              </label>
              <div className="grid grid-cols-7 gap-1">
                {DIAS.map(d => {
                  const sel = form.dias.includes(d.id);
                  return (
                    <button key={d.id} type="button" onClick={() => toggleArr('dias', d.id)}
                      className={`py-4 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                        sel ? 'bg-[#FF4500] text-white shadow-lg shadow-[#FF4500]/20' : 'bg-[#111] border border-gray-800 text-gray-600'
                      }`}
                    >{d.short}</button>
                  );
                })}
              </div>
              {form.dias.length > 0 && (
                <p className="text-xs text-gray-600 mt-3 text-center">
                  {form.dias.length === 1 && '1 día/semana — plan mínimo adaptado'}
                  {form.dias.length === 2 && '2 días — split Upper/Lower básico'}
                  {form.dias.length === 3 && '3 días — ideal: un día por movimiento principal'}
                  {form.dias.length === 4 && '4 días — estructura estándar de periodización ✓'}
                  {form.dias.length === 5 && '5 días — periodización avanzada DUP'}
                  {form.dias.length >= 6 && `${form.dias.length} días — excelente disponibilidad`}
                </p>
              )}
            </div>

            {/* Resumen final */}
            <div className="bg-[#0f0f0f] border border-gray-800 rounded-2xl px-4 py-4 space-y-3">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Resumen de tu perfil</p>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Peso / Altura</span>
                  <span className="text-white">{form.peso}kg · {form.altura}cm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Experiencia</span>
                  <span className="text-white capitalize">{form.experiencia}</span>
                </div>
                {!form.sinRm && (form.rmSquat || form.rmBench || form.rmDeadlift) && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">1RMs</span>
                    <span className="text-[#FF4500] font-mono text-xs">
                      SQ {form.rmSquat||'—'} · BP {form.rmBench||'—'} · DL {form.rmDeadlift||'—'} kg
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Objetivos</span>
                  <span className="text-white">{form.objetivos.length} seleccionados</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Equipamiento</span>
                  <span className="text-white">{form.equipamiento.length} ítems</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Días de entreno</span>
                  <span className="text-white">{form.dias.length} días/semana</span>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer navigation */}
      <div className="px-4 py-4 border-t border-gray-900 bg-[#080808]">
        <div className="flex gap-3 max-w-lg mx-auto">
          {step > 1 && (
            <button type="button" onClick={() => setStep(s => s - 1)}
              className="flex-1 py-3.5 rounded-xl border border-gray-800 text-gray-500 font-semibold text-sm transition-colors hover:border-gray-700 hover:text-white">
              ← Atrás
            </button>
          )}

          {step < TOTAL_STEPS ? (
            <button type="button" onClick={() => { if (canNext()) setStep(s => s + 1); }}
              disabled={!canNext()}
              className="flex-1 py-3.5 rounded-xl bg-[#FF4500] hover:bg-[#e03d00] active:scale-[0.98] text-white font-black text-sm transition-all disabled:opacity-30">
              Siguiente →
            </button>
          ) : (
            <button type="button" onClick={handleSubmit}
              disabled={saving || form.dias.length === 0}
              className="flex-1 py-3.5 rounded-xl bg-[#FF4500] hover:bg-[#e03d00] active:scale-[0.98] text-white font-black text-sm transition-all disabled:opacity-30">
              {saving ? 'Guardando...' : '✓ Completar perfil'}
            </button>
          )}
        </div>

        {step === 1 && (
          <p className="text-center text-xs text-gray-700 mt-3">
            Estos datos son privados y solo los ve tu coach.
          </p>
        )}
      </div>
    </div>
  );
}
