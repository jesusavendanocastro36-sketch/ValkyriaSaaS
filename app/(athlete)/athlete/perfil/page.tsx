'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Perfil = {
  id: string;
  pesoActual: number | null;
  altura: number | null;
  edad: number | null;
  categoriaPeso: string | null;
  experienciaPowerlifting: string;
  lesionesActuales: string[];
  objetivos: string[];
  equipamiento: string[];
  diasDisponibles: string[];
  rmSquat: number | null;
  rmBench: number | null;
  rmDeadlift: number | null;
  user: { nombre: string; email: string };
};

type PesoEntry = { id: string; peso: number; fecha: string; nota: string | null };

type Nutricion = {
  peso: number;
  fase: string;
  razon: string;
  diasEntrenamiento: number;
  calorias: { min: number; max: number; referencia: number };
  macros: {
    proteina: { min: number; max: number; porKg: number };
    carbohidratos: { min: number; max: number };
    grasa: { min: number; max: number };
  };
  nota: string;
  peso_no_configurado?: boolean;
};

const DIAS_ORDER = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const DIAS_SHORT: Record<string, string> = {
  lunes: 'L', martes: 'M', miércoles: 'X', jueves: 'J', viernes: 'V', sábado: 'S', domingo: 'D',
};

const EXP_LABEL: Record<string, string> = {
  principiante: 'Principiante', intermedio: 'Intermedio', avanzado: 'Avanzado', elite: 'Élite',
};
const EXP_COLOR: Record<string, string> = {
  principiante: 'text-green-400 bg-green-400/10',
  intermedio:   'text-yellow-400 bg-yellow-400/10',
  avanzado:     'text-orange-400 bg-orange-400/10',
  elite:        'text-red-400 bg-red-400/10',
};

const LESION_SUGERENCIAS = [
  'Dolor lumbar', 'Rodilla derecha', 'Rodilla izquierda',
  'Hombro derecho', 'Hombro izquierdo', 'Codo', 'Muñeca',
  'Cadera', 'Tobillo', 'Cervical',
];

export default function AthletePerfilPage() {
  const router = useRouter();
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [peso, setPeso] = useState('');
  const [lesiones, setLesiones] = useState<string[]>([]);
  const [lesionInput, setLesionInput] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [loading, setLoading] = useState(true);
  const [nutricion, setNutricion] = useState<Nutricion | null>(null);
  const [historialPeso, setHistorialPeso] = useState<PesoEntry[]>([]);
  const [registrandoPeso, setRegistrandoPeso] = useState(false);

  useEffect(() => {
    const rol = localStorage.getItem('rol');
    if (rol !== 'ATHLETE') { router.push('/login'); return; }

    const token = localStorage.getItem('token');
    const h = { Authorization: `Bearer ${token}` };

    fetch('/api/athlete/perfil', { headers: h })
      .then(r => r.json())
      .then((d: Perfil) => {
        setPerfil(d);
        setPeso(d.pesoActual ? String(d.pesoActual) : '');
        setLesiones(d.lesionesActuales ?? []);
      })
      .finally(() => setLoading(false));

    fetch('/api/athlete/nutricion', { headers: h })
      .then(r => r.json())
      .then((d: Nutricion) => setNutricion(d))
      .catch(() => {});

    fetch('/api/peso-historial', { headers: h })
      .then(r => r.json())
      .then((d: PesoEntry[]) => setHistorialPeso([...d].reverse().slice(0, 12)))
      .catch(() => {});
  }, [router]);

  const agregarLesion = (l: string) => {
    const trimmed = l.trim();
    if (!trimmed || lesiones.includes(trimmed)) return;
    setLesiones(prev => [...prev, trimmed]);
    setLesionInput('');
    setGuardado(false);
  };

  const quitarLesion = (l: string) => {
    setLesiones(prev => prev.filter(x => x !== l));
    setGuardado(false);
  };

  const handleGuardar = async () => {
    setGuardando(true);
    const token = localStorage.getItem('token');
    const h = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
    const body: Record<string, unknown> = { lesionesActuales: lesiones };
    const pesoAnterior = perfil?.pesoActual;
    if (peso !== '') body.pesoActual = Number(peso);

    await fetch('/api/athlete/perfil', {
      method: 'PATCH', headers: h, body: JSON.stringify(body),
    });

    // Log to weight history when peso changes
    if (peso !== '' && Number(peso) !== pesoAnterior) {
      setRegistrandoPeso(true);
      const entry = await fetch('/api/peso-historial', {
        method: 'POST', headers: h,
        body: JSON.stringify({ peso: Number(peso) }),
      }).then(r => r.json()).catch(() => null);
      if (entry?.id) {
        setHistorialPeso(prev => [entry, ...prev].slice(0, 12));
      }
      setRegistrandoPeso(false);
    }

    setGuardando(false);
    setGuardado(true);
    setTimeout(() => setGuardado(false), 3000);

    fetch('/api/athlete/nutricion', { headers: { Authorization: `Bearer ${token ?? ''}` } })
      .then(r => r.json())
      .then((d: Nutricion) => setNutricion(d))
      .catch(() => {});
  };

  if (loading) return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center text-gray-600 text-sm">
      Cargando...
    </div>
  );

  if (!perfil) return null;

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <div className="max-w-lg mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-7">
          <h1 className="text-2xl font-bold tracking-tight">Mi perfil</h1>
          <p className="text-gray-600 text-sm mt-1">Actualizá tu peso y lesiones — lo demás lo gestiona tu coach</p>
        </div>

        {/* Identity card */}
        <div className="bg-[#0f0f0f] border border-gray-800 rounded-2xl px-5 py-4 mb-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#FF4500]/15 border border-[#FF4500]/20 flex items-center justify-center text-[#FF4500] font-black text-xl shrink-0">
            {perfil.user.nombre[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold">{perfil.user.nombre}</p>
            <p className="text-gray-600 text-xs truncate">{perfil.user.email}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${EXP_COLOR[perfil.experienciaPowerlifting] ?? EXP_COLOR.principiante}`}>
                {EXP_LABEL[perfil.experienciaPowerlifting] ?? perfil.experienciaPowerlifting}
              </span>
              {perfil.categoriaPeso && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-500">
                  Cat. {perfil.categoriaPeso}
                </span>
              )}
            </div>
          </div>
          {(perfil.rmSquat || perfil.rmBench || perfil.rmDeadlift) && (
            <div className="flex gap-3 shrink-0">
              {perfil.rmSquat    && <div className="text-center"><p className="text-[9px] text-gray-600">SQ</p><p className="text-sm font-bold">{perfil.rmSquat}</p></div>}
              {perfil.rmBench    && <div className="text-center"><p className="text-[9px] text-gray-600">BP</p><p className="text-sm font-bold">{perfil.rmBench}</p></div>}
              {perfil.rmDeadlift && <div className="text-center"><p className="text-[9px] text-gray-600">DL</p><p className="text-sm font-bold">{perfil.rmDeadlift}</p></div>}
            </div>
          )}
        </div>

        {/* ── EDITABLE ─────────────────────────────────────────────── */}
        <p className="text-[10px] text-[#FF4500] uppercase tracking-wider mb-3 font-semibold">Puedes actualizar</p>

        {/* Peso actual */}
        <div className="bg-[#0f0f0f] border border-gray-800 rounded-2xl p-5 mb-4">
          <p className="text-sm font-semibold mb-1">Peso corporal actual</p>
          <p className="text-gray-600 text-xs mb-3">Actualízalo cada semana para llevar un registro de tu progreso</p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              step="0.1"
              min="30"
              max="250"
              value={peso}
              onChange={e => { setPeso(e.target.value); setGuardado(false); }}
              placeholder="Ej. 85.5"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-base focus:outline-none focus:border-[#FF4500] placeholder-gray-600"
            />
            <span className="text-gray-500 text-sm shrink-0">kg</span>
          </div>
          {perfil.altura && peso && (
            <p className="text-xs text-gray-700 mt-2">
              IMC estimado: {(Number(peso) / ((perfil.altura / 100) ** 2)).toFixed(1)}
            </p>
          )}
        </div>

        {/* Lesiones */}
        <div className="bg-[#0f0f0f] border border-gray-800 rounded-2xl p-5 mb-6">
          <p className="text-sm font-semibold mb-1">Lesiones / molestias activas</p>
          <p className="text-gray-600 text-xs mb-3">Tu coach las tendrá en cuenta al programar tu plan</p>

          {lesiones.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {lesiones.map((l, i) => (
                <button
                  key={i}
                  onClick={() => quitarLesion(l)}
                  className="inline-flex items-center gap-1.5 text-xs bg-red-900/30 text-red-300 px-3 py-1.5 rounded-full hover:bg-red-900/50 transition-colors"
                >
                  {l} <span className="text-red-500">×</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={lesionInput}
              onChange={e => setLesionInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && agregarLesion(lesionInput)}
              placeholder="Escribe una lesión y presiona +"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#FF4500] placeholder-gray-600"
            />
            <button
              onClick={() => agregarLesion(lesionInput)}
              className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-sm font-bold transition-colors"
            >
              +
            </button>
          </div>

          {/* Quick suggestions */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {LESION_SUGERENCIAS.filter(s => !lesiones.includes(s)).slice(0, 6).map(s => (
              <button
                key={s}
                onClick={() => agregarLesion(s)}
                className="text-[10px] px-2 py-1 rounded-full bg-gray-800/60 text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"
              >
                + {s}
              </button>
            ))}
          </div>

          {lesiones.length === 0 && (
            <p className="text-xs text-gray-700 mt-3 text-center">Sin lesiones registradas ✓</p>
          )}
        </div>

        {/* Save */}
        <button
          onClick={handleGuardar}
          disabled={guardando}
          className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all mb-8 ${
            guardado
              ? 'bg-green-500/20 border border-green-500/40 text-green-400'
              : 'bg-[#FF4500] hover:bg-[#e03d00] text-white disabled:opacity-50'
          }`}
        >
          {guardando ? 'Guardando...' : guardado ? '✓ Guardado' : 'Guardar cambios'}
        </button>

        {/* ── WEIGHT HISTORY ───────────────────────────────────────── */}
        {historialPeso.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold">Historial de peso</p>
              {registrandoPeso && <p className="text-xs text-gray-600 animate-pulse">Registrando...</p>}
            </div>

            {/* Trend bar */}
            {historialPeso.length >= 2 && (() => {
              const ultimo = historialPeso[0].peso;
              const primero = historialPeso[historialPeso.length - 1].peso;
              const diff = ultimo - primero;
              const min = Math.min(...historialPeso.map(e => e.peso));
              const max = Math.max(...historialPeso.map(e => e.peso));
              const range = max - min || 1;
              return (
                <div className="bg-[#0f0f0f] border border-gray-800 rounded-2xl p-4 mb-3">
                  <div className="flex items-end gap-1 h-10 mb-2">
                    {[...historialPeso].reverse().map((e, i) => {
                      const h = Math.max(16, Math.round(((e.peso - min) / range) * 32) + 8);
                      return (
                        <div key={i} title={`${e.peso} kg`}
                          style={{ height: `${h}px` }}
                          className="flex-1 rounded-sm bg-[#FF4500]/60 hover:bg-[#FF4500] transition-colors cursor-default"
                        />
                      );
                    })}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">{new Date(historialPeso[historialPeso.length - 1].fecha).toLocaleDateString('es', { day: '2-digit', month: 'short' })}</span>
                    <span className={`text-xs font-bold ${diff > 0 ? 'text-green-400' : diff < 0 ? 'text-blue-400' : 'text-gray-500'}`}>
                      {diff > 0 ? '+' : ''}{diff.toFixed(1)} kg
                    </span>
                    <span className="text-xs text-gray-600">Hoy</span>
                  </div>
                </div>
              );
            })()}

            <div className="space-y-1.5">
              {historialPeso.slice(0, 6).map((e, i) => (
                <div key={e.id} className={`flex items-center justify-between px-4 py-2.5 rounded-xl ${i === 0 ? 'bg-[#FF4500]/10 border border-[#FF4500]/20' : 'bg-[#0f0f0f] border border-gray-800'}`}>
                  <span className="text-xs text-gray-500">
                    {new Date(e.fecha).toLocaleDateString('es', { weekday: 'short', day: '2-digit', month: 'short' })}
                  </span>
                  <div className="flex items-center gap-2">
                    {i === 0 && i + 1 < historialPeso.length && (() => {
                      const d = historialPeso[0].peso - historialPeso[1].peso;
                      return d !== 0 ? (
                        <span className={`text-[10px] ${d > 0 ? 'text-green-400' : 'text-blue-400'}`}>
                          {d > 0 ? '↑' : '↓'} {Math.abs(d).toFixed(1)}
                        </span>
                      ) : null;
                    })()}
                    <span className={`text-sm font-bold ${i === 0 ? 'text-[#FF4500]' : 'text-white'}`}>
                      {e.peso} kg
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── READ-ONLY ─────────────────────────────────────────────── */}
        <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-3 font-semibold">Datos del plan (solo lectura)</p>

        {/* Días */}
        {perfil.diasDisponibles.length > 0 && (
          <div className="bg-[#0f0f0f] border border-gray-800 rounded-2xl p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-300">Días disponibles</p>
              <span className="text-xs text-gray-600">{perfil.diasDisponibles.length}/sem</span>
            </div>
            <div className="flex gap-1.5">
              {DIAS_ORDER.map(d => (
                <div key={d} className={`flex-1 h-9 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                  perfil.diasDisponibles.includes(d)
                    ? 'bg-[#FF4500]/20 text-[#FF4500] border border-[#FF4500]/30'
                    : 'bg-gray-900 text-gray-700'
                }`}>
                  {DIAS_SHORT[d]}
                </div>
              ))}
            </div>
            <p className="text-[10px] text-gray-700 mt-3 text-center">Para cambiarlos, habla con tu coach</p>
          </div>
        )}

        {/* Equipamiento */}
        {perfil.equipamiento.length > 0 && (
          <div className="bg-[#0f0f0f] border border-gray-800 rounded-2xl p-5 mb-6">
            <p className="text-sm font-semibold text-gray-300 mb-3">Equipamiento registrado</p>
            <div className="flex flex-wrap gap-2">
              {perfil.equipamiento.map((e, i) => (
                <span key={i} className="text-xs bg-gray-800/80 text-gray-400 px-3 py-1.5 rounded-full">{e}</span>
              ))}
            </div>
            <p className="text-[10px] text-gray-700 mt-3 text-center">Para cambiarlos, habla con tu coach</p>
          </div>
        )}

        {/* ── NUTRITION PANEL ─────────────────────────────────── */}
        {nutricion && !nutricion.peso_no_configurado && (
          <div className="mt-2">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-base">🥩</span>
              <p className="font-semibold text-sm">Nutrición de apoyo</p>
              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-[#FF4500]/10 text-[#FF4500] font-semibold uppercase tracking-wide">
                {nutricion.fase}
              </span>
            </div>

            <div className="bg-[#0f0f0f] border border-gray-800 rounded-2xl px-5 py-4 mb-3">
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Calorías diarias estimadas</p>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-black text-white">{nutricion.calorias.min.toLocaleString()}</span>
                <span className="text-xl text-gray-600 mb-0.5">—</span>
                <span className="text-3xl font-black text-[#FF4500]">{nutricion.calorias.max.toLocaleString()}</span>
                <span className="text-gray-500 text-sm mb-1">kcal</span>
              </div>
              <p className="text-xs text-gray-600 mt-2">{nutricion.razon}</p>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-[#0f0f0f] border border-gray-800 rounded-xl px-3 py-3 text-center">
                <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-1">Proteína</p>
                <p className="text-lg font-black text-blue-400">{nutricion.macros.proteina.min}<span className="text-xs font-normal text-gray-600">–{nutricion.macros.proteina.max}g</span></p>
                <p className="text-[10px] text-gray-700 mt-0.5">{nutricion.macros.proteina.porKg} g/kg</p>
              </div>
              <div className="bg-[#0f0f0f] border border-gray-800 rounded-xl px-3 py-3 text-center">
                <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-1">Carbos</p>
                <p className="text-lg font-black text-[#FFB800]">{nutricion.macros.carbohidratos.min}<span className="text-xs font-normal text-gray-600">–{nutricion.macros.carbohidratos.max}g</span></p>
                <p className="text-[10px] text-gray-700 mt-0.5">combustible</p>
              </div>
              <div className="bg-[#0f0f0f] border border-gray-800 rounded-xl px-3 py-3 text-center">
                <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-1">Grasas</p>
                <p className="text-lg font-black text-green-400">{nutricion.macros.grasa.min}<span className="text-xs font-normal text-gray-600">–{nutricion.macros.grasa.max}g</span></p>
                <p className="text-[10px] text-gray-700 mt-0.5">1.0–1.2 g/kg</p>
              </div>
            </div>

            <p className="text-[10px] text-gray-700 leading-relaxed">{nutricion.nota}</p>
          </div>
        )}

        {nutricion?.peso_no_configurado && (
          <div className="mt-4 px-4 py-3 rounded-xl bg-[#0f0f0f] border border-gray-800 text-center">
            <p className="text-sm text-gray-500">Registra tu peso para ver las referencias nutricionales</p>
          </div>
        )}

      </div>
    </div>
  );
}
