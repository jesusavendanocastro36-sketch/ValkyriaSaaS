'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

type Atleta = { id: string; user: { nombre: string } };

type AtletaFicha = {
  id: string;
  pesoActual: number | null;
  altura: number | null;
  edad: number | null;
  categoriaPeso: string | null;
  experienciaPowerlifting: string;
  lesionesActuales: string[];
  objetivos: string[];
  diasDisponibles: string[];
  rmSquat: number | null;
  rmBench: number | null;
  rmDeadlift: number | null;
  user: { nombre: string; email: string };
};

const EXP_LABEL: Record<string, string> = {
  principiante: 'Principiante', intermedio: 'Intermedio', avanzado: 'Avanzado', elite: 'Élite',
};
const EXP_COLOR: Record<string, string> = {
  principiante: 'text-green-400', intermedio: 'text-yellow-400', avanzado: 'text-orange-400', elite: 'text-red-400',
};
const DIAS_SHORT: Record<string, string> = {
  lunes: 'L', martes: 'M', miércoles: 'X', jueves: 'J', viernes: 'V', sábado: 'S', domingo: 'D',
};
const DIAS_ORDER = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

const TIPOS = ['LINEAL', 'ONDULANTE', 'CONJUGADA', 'POR_BLOQUES'];
const TIPO_LABEL: Record<string, string> = { LINEAL: 'Lineal', ONDULANTE: 'Ondulante', CONJUGADA: 'Conjugada', POR_BLOQUES: 'Por Bloques' };

function NuevaPeriodizacionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedAtleta = searchParams.get('atleta') ?? '';

  const [atletas, setAtletas] = useState<Atleta[]>([]);
  const [fichaAtleta, setFichaAtleta] = useState<AtletaFicha | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    nombre: '',
    tipo: 'ONDULANTE',
    athlete_id: preselectedAtleta,
    fecha_inicio: '',
    fecha_fin: '',
    duracion_semanas: 8,
    fecha_competencia: '',
    descripcion: '',
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    fetch('/api/atletas', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setAtletas(d.data ?? []));
  }, [router]);

  useEffect(() => {
    const id = form.athlete_id;
    if (!id) { setFichaAtleta(null); return; }
    const token = localStorage.getItem('token') ?? '';
    fetch(`/api/atletas/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setFichaAtleta(d.error ? null : d))
      .catch(() => setFichaAtleta(null));
  }, [form.athlete_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.athlete_id) { setError('Selecciona un atleta'); return; }
    setLoading(true);
    setError(null);

    const token = localStorage.getItem('token')!;

    try {
      const res = await fetch('/api/periodizaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          objetivo: 'fuerza',
          duracion_semanas: Number(form.duracion_semanas),
          ...(form.fecha_competencia ? { fecha_competencia: form.fecha_competencia } : {}),
        }),
      });
      if (!res.ok) { setError('Error al crear periodización'); setLoading(false); return; }
      const periodizacion = await res.json();

      await fetch('/api/bloques', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          periodizacion_id: periodizacion.id,
          numero_bloque: 1,
          nombre: 'Ciclo Principal',
          semana_inicio: 1,
          semana_fin: Number(form.duracion_semanas),
          enfasis: 'Fuerza Base',
          intensidad_rpe_min: 7,
          intensidad_rpe_max: 9.5,
        }),
      });

      router.push('/admin/periodizaciones');
    } catch {
      setError('Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin/periodizaciones" className="text-gray-500 hover:text-white text-sm transition-colors">← Volver</Link>
          <h1 className="text-2xl font-bold">Nueva Periodización</h1>
        </div>

        <div className={`flex gap-6 items-start ${fichaAtleta ? 'flex-col lg:flex-row' : ''}`}>

        {/* ── Ficha sidebar ─────────────────────────────────── */}
        {fichaAtleta && (
          <aside className="w-full lg:w-72 lg:shrink-0 space-y-3">
            <div className="bg-[#0f0f0f] border border-gray-800 rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#FF4500]/15 text-[#FF4500] flex items-center justify-center font-black text-base shrink-0">
                  {fichaAtleta.user.nombre[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate">{fichaAtleta.user.nombre}</p>
                  <p className={`text-xs ${EXP_COLOR[fichaAtleta.experienciaPowerlifting] ?? 'text-gray-400'}`}>
                    {EXP_LABEL[fichaAtleta.experienciaPowerlifting] ?? fichaAtleta.experienciaPowerlifting}
                  </p>
                </div>
              </div>

              {/* Physical */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {fichaAtleta.pesoActual && (
                  <div className="bg-gray-900 rounded-lg px-3 py-2">
                    <p className="text-[9px] text-gray-600 uppercase">Peso</p>
                    <p className="text-sm font-bold">{fichaAtleta.pesoActual} kg</p>
                  </div>
                )}
                {fichaAtleta.edad && (
                  <div className="bg-gray-900 rounded-lg px-3 py-2">
                    <p className="text-[9px] text-gray-600 uppercase">Edad</p>
                    <p className="text-sm font-bold">{fichaAtleta.edad} años</p>
                  </div>
                )}
                {fichaAtleta.categoriaPeso && (
                  <div className="bg-gray-900 rounded-lg px-3 py-2 col-span-2">
                    <p className="text-[9px] text-gray-600 uppercase">Categoría</p>
                    <p className="text-sm font-bold">{fichaAtleta.categoriaPeso}</p>
                  </div>
                )}
              </div>

              {/* 1RMs */}
              {(fichaAtleta.rmSquat || fichaAtleta.rmBench || fichaAtleta.rmDeadlift) ? (
                <div className="mb-4">
                  <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-2">1RMs</p>
                  <div className="space-y-1.5">
                    {fichaAtleta.rmSquat && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-blue-400">Sentadilla</span>
                        <span className="text-xs font-bold text-white">{fichaAtleta.rmSquat} kg</span>
                      </div>
                    )}
                    {fichaAtleta.rmBench && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-green-400">Banca</span>
                        <span className="text-xs font-bold text-white">{fichaAtleta.rmBench} kg</span>
                      </div>
                    )}
                    {fichaAtleta.rmDeadlift && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-orange-400">Peso muerto</span>
                        <span className="text-xs font-bold text-white">{fichaAtleta.rmDeadlift} kg</span>
                      </div>
                    )}
                    {(fichaAtleta.rmSquat || 0) + (fichaAtleta.rmBench || 0) + (fichaAtleta.rmDeadlift || 0) > 0 && (
                      <div className="flex justify-between items-center pt-1.5 border-t border-gray-800">
                        <span className="text-xs text-gray-500">Total</span>
                        <span className="text-sm font-black text-[#FF4500]">
                          {(fichaAtleta.rmSquat ?? 0) + (fichaAtleta.rmBench ?? 0) + (fichaAtleta.rmDeadlift ?? 0)} kg
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-700 mb-4">Sin 1RMs registrados</p>
              )}

              {/* Lesiones */}
              {fichaAtleta.lesionesActuales.length > 0 && (
                <div className="mb-4">
                  <p className="text-[9px] text-red-400 uppercase tracking-wider mb-2">⚠ Lesiones</p>
                  <div className="flex flex-wrap gap-1">
                    {fichaAtleta.lesionesActuales.map((l, i) => (
                      <span key={i} className="text-[10px] bg-red-900/30 text-red-300 px-2 py-0.5 rounded-full">{l}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Días */}
              {fichaAtleta.diasDisponibles.length > 0 && (
                <div>
                  <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-2">Días disponibles</p>
                  <div className="flex gap-1">
                    {DIAS_ORDER.map(d => (
                      <div key={d} className={`w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold ${
                        fichaAtleta.diasDisponibles.includes(d)
                          ? 'bg-[#FF4500] text-white'
                          : 'bg-gray-900 text-gray-700'
                      }`}>
                        {DIAS_SHORT[d]}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Link href={`/admin/atletas/${fichaAtleta.id}`}
              className="block text-center text-xs text-gray-600 hover:text-[#FF4500] transition-colors py-1">
              Ver ficha completa →
            </Link>
          </aside>
        )}

        {/* ── Main form ─────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Info básica */}
          <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
            <h2 className="font-semibold text-[#FFB800] mb-2">Información General</h2>

            <div>
              <label className="text-sm text-gray-400 block mb-1">Nombre</label>
              <input
                value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#FF4500]"
                placeholder="Ciclo Fuerza Q2 2026" required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 block mb-1">Atleta</label>
                <select
                  value={form.athlete_id}
                  onChange={(e) => setForm({ ...form, athlete_id: e.target.value })}
                  className={`w-full bg-gray-800 border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#FF4500] ${
                    form.athlete_id ? 'border-[#FF4500]/40' : 'border-gray-700'
                  }`}
                  required
                >
                  <option value="">Seleccionar atleta</option>
                  {atletas.map((a) => <option key={a.id} value={a.id}>{a.user.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Tipo de periodización</label>
                <select
                  value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#FF4500]"
                >
                  {TIPOS.map((t) => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-gray-400 block mb-1">Fecha inicio</label>
                <input type="date" value={form.fecha_inicio} onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#FF4500]" required />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Fecha fin</label>
                <input type="date" value={form.fecha_fin} onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#FF4500]" required />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Semanas</label>
                <input type="number" min={1} max={52} value={form.duracion_semanas} onChange={(e) => setForm({ ...form, duracion_semanas: Number(e.target.value) })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#FF4500]" required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 block mb-1">Fecha de peak / competencia</label>
                <input type="date" value={form.fecha_competencia} onChange={(e) => setForm({ ...form, fecha_competencia: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#FF4500]" />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Descripción (opcional)</label>
                <input value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#FF4500]"
                  placeholder="Notas sobre el ciclo..." />
              </div>
            </div>
          </section>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full bg-[#FF4500] hover:bg-[#e03d00] text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50">
            {loading ? 'Guardando...' : 'Guardar como borrador'}
          </button>
        </form>
        </div>
        </div>
      </div>
    </div>
  );
}

export default function NuevaPeriodizacionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#080808] flex items-center justify-center text-gray-500">Cargando...</div>}>
      <NuevaPeriodizacionForm />
    </Suspense>
  );
}
