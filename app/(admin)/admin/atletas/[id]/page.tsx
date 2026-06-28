'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

type AtletaFicha = {
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
  user: { nombre: string; email: string; activo: boolean };
  periodizaciones?: { id: string; nombre: string; tipo: string }[];
};

const EXP_CFG: Record<string, { label: string; color: string; desc: string }> = {
  principiante: { label: 'Principiante', color: 'text-green-400 bg-green-400/10 border-green-400/20',  desc: 'Menos de 2 años de experiencia' },
  intermedio:   { label: 'Intermedio',   color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20', desc: '2–4 años de experiencia' },
  avanzado:     { label: 'Avanzado',     color: 'text-orange-400 bg-orange-400/10 border-orange-400/20', desc: '4–7 años de experiencia' },
  elite:        { label: 'Élite',        color: 'text-red-400 bg-red-400/10 border-red-400/20',          desc: 'Competidor de alto nivel' },
};

const OBJ_ICON: Record<string, string> = {
  'Competir en powerlifting': '🏆',
  'Aumentar fuerza máxima': '💪',
  'Ganar masa muscular': '🔥',
  'Mejorar técnica': '🎯',
  'Perder grasa': '⚡',
  'Mejorar resistencia': '🫀',
};

const DIAS_ORDER = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const DIAS_SHORT: Record<string, string> = {
  lunes: 'L', martes: 'M', miércoles: 'X', jueves: 'J', viernes: 'V', sábado: 'S', domingo: 'D',
};

function RMCard({ label, value, color }: { label: string; value: number | null; color: string }) {
  return (
    <div className={`bg-[#0f0f0f] border rounded-xl p-4 text-center ${color}`}>
      <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-1">{label}</p>
      {value ? (
        <p className="text-2xl font-black text-white">{value}<span className="text-sm text-gray-500 ml-1">kg</span></p>
      ) : (
        <p className="text-lg text-gray-700 font-bold">—</p>
      )}
    </div>
  );
}

export default function AtletaFichaPage() {
  const router = useRouter();
  const params = useParams();
  const atletaId = params.id as string;

  const [atleta, setAtleta] = useState<AtletaFicha | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const rol = localStorage.getItem('rol');
    if (!token || rol !== 'ADMIN') { router.push('/login'); return; }

    Promise.all([
      fetch(`/api/atletas/${atletaId}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch('/api/atletas', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([perfil, lista]) => {
      const match = (lista.data ?? []).find((a: AtletaFicha) => a.id === atletaId);
      setAtleta({ ...perfil, periodizaciones: match?.periodizaciones ?? [] });
    }).catch(() => router.push('/admin/atletas'))
      .finally(() => setLoading(false));
  }, [atletaId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#FF4500] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!atleta) return null;

  const exp = EXP_CFG[atleta.experienciaPowerlifting] ?? EXP_CFG.principiante;
  const total = (atleta.rmSquat ?? 0) + (atleta.rmBench ?? 0) + (atleta.rmDeadlift ?? 0);
  const perfilCompleto = !!(atleta.altura && atleta.edad);

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">

        {/* Back */}
        <Link href="/admin/atletas" className="inline-flex items-center gap-1.5 text-gray-500 hover:text-white text-sm transition-colors mb-6">
          ← Atletas
        </Link>

        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shrink-0 ${
            atleta.user.activo ? 'bg-[#FF4500]/15 text-[#FF4500]' : 'bg-gray-800 text-gray-500'
          }`}>
            {atleta.user.nombre[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold">{atleta.user.nombre}</h1>
              {!atleta.user.activo && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-500">Inactivo</span>
              )}
              {!perfilCompleto && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                  Perfil incompleto
                </span>
              )}
            </div>
            <p className="text-gray-500 text-sm mt-0.5">{atleta.user.email}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${exp.color}`}>
                {exp.label}
              </span>
              {atleta.categoriaPeso && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">
                  Categoría {atleta.categoriaPeso}
                </span>
              )}
              {atleta.lesionesActuales.length > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-900/30 text-red-400">
                  ⚠ {atleta.lesionesActuales.length} lesión{atleta.lesionesActuales.length > 1 ? 'es' : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Incomplete profile alert */}
        {!perfilCompleto && (
          <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl px-4 py-3 mb-6 flex items-center gap-3">
            <span className="text-lg">📋</span>
            <div>
              <p className="text-yellow-400 text-sm font-semibold">El atleta aún no completó su perfil</p>
              <p className="text-gray-500 text-xs mt-0.5">Algunos datos físicos están incompletos. El atleta debe hacer el onboarding.</p>
            </div>
          </div>
        )}

        {/* Datos físicos */}
        <section className="bg-[#0f0f0f] border border-gray-800 rounded-2xl p-5 mb-4">
          <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-4">Datos físicos</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatBlock label="Peso" value={atleta.pesoActual ? `${atleta.pesoActual} kg` : '—'} />
            <StatBlock label="Altura" value={atleta.altura ? `${atleta.altura} cm` : '—'} />
            <StatBlock label="Edad" value={atleta.edad ? `${atleta.edad} años` : '—'} />
            <StatBlock label="Categoría" value={atleta.categoriaPeso ?? '—'} />
          </div>
          <div className="mt-3 pt-3 border-t border-gray-800">
            <p className="text-xs text-gray-600">{exp.desc}</p>
          </div>
        </section>

        {/* 1RMs */}
        <section className="mb-4">
          <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-3">1RMs de referencia</p>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <RMCard label="Sentadilla" value={atleta.rmSquat} color="border-blue-500/20" />
            <RMCard label="Banca" value={atleta.rmBench}   color="border-green-500/20" />
            <RMCard label="Peso muerto" value={atleta.rmDeadlift} color="border-orange-500/20" />
          </div>
          {total > 0 && (
            <div className="bg-[#FF4500]/5 border border-[#FF4500]/20 rounded-xl px-4 py-3 flex items-center justify-between">
              <p className="text-sm text-gray-400">Total Big 3</p>
              <p className="text-xl font-black text-[#FF4500]">{total} <span className="text-sm text-gray-500 font-normal">kg</span></p>
            </div>
          )}
          {total === 0 && (
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl px-4 py-3 text-center text-gray-600 text-sm">
              Sin 1RMs registrados
            </div>
          )}
        </section>

        {/* Objetivos */}
        {atleta.objetivos.length > 0 && (
          <section className="bg-[#0f0f0f] border border-gray-800 rounded-2xl p-5 mb-4">
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-3">Objetivos</p>
            <div className="flex flex-wrap gap-2">
              {atleta.objetivos.map((o, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 text-sm bg-gray-800/80 text-gray-300 px-3 py-1.5 rounded-full">
                  <span>{OBJ_ICON[o] ?? '🎯'}</span> {o}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Lesiones */}
        {atleta.lesionesActuales.length > 0 && (
          <section className="bg-red-900/10 border border-red-500/20 rounded-2xl p-5 mb-4">
            <p className="text-[10px] text-red-400 uppercase tracking-wider mb-3">Lesiones activas</p>
            <div className="flex flex-wrap gap-2">
              {atleta.lesionesActuales.map((l, i) => (
                <span key={i} className="text-sm bg-red-900/30 text-red-300 px-3 py-1.5 rounded-full">{l}</span>
              ))}
            </div>
          </section>
        )}

        {/* Equipamiento + Días */}
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          {atleta.equipamiento.length > 0 && (
            <section className="bg-[#0f0f0f] border border-gray-800 rounded-2xl p-5">
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-3">Equipamiento</p>
              <div className="flex flex-wrap gap-1.5">
                {atleta.equipamiento.map((e, i) => (
                  <span key={i} className="text-xs bg-gray-800 text-gray-400 px-2.5 py-1 rounded-full">{e}</span>
                ))}
              </div>
            </section>
          )}

          {atleta.diasDisponibles.length > 0 && (
            <section className="bg-[#0f0f0f] border border-gray-800 rounded-2xl p-5">
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-3">
                Días disponibles <span className="text-gray-700 ml-1">({atleta.diasDisponibles.length}/sem)</span>
              </p>
              <div className="flex gap-1.5">
                {DIAS_ORDER.map(d => (
                  <div key={d} className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-colors ${
                    atleta.diasDisponibles.includes(d)
                      ? 'bg-[#FF4500] text-white'
                      : 'bg-gray-900 text-gray-700'
                  }`}>
                    {DIAS_SHORT[d]}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Plan activo */}
        {atleta.periodizaciones && atleta.periodizaciones.length > 0 && (
          <section className="bg-[#0f0f0f] border border-gray-800 rounded-2xl p-5 mb-6">
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-3">Plan activo</p>
            {atleta.periodizaciones.map(p => (
              <Link key={p.id} href={`/admin/periodizaciones/${p.id}`}
                className="flex items-center justify-between hover:bg-white/[0.02] -mx-2 px-2 py-2 rounded-xl transition-colors">
                <div>
                  <p className="text-sm font-semibold text-white">{p.nombre}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{p.tipo}</p>
                </div>
                <span className="text-[#FF4500]">→</span>
              </Link>
            ))}
          </section>
        )}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:gap-3">
          <Link href={`/admin/atletas/${atletaId}/progreso`}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-[#FF4500] hover:bg-[#e03d00] text-white font-semibold rounded-xl text-sm transition-colors">
            📈 Ver progreso
          </Link>
          <Link href={`/admin/atletas/${atletaId}/volumen`}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-xl text-sm transition-colors">
            💪 Volumen muscular
          </Link>
          <Link href={`/admin/periodizaciones/nueva?atleta=${atletaId}`}
            className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-800 text-gray-400 hover:border-gray-600 hover:text-white rounded-xl text-sm transition-colors">
            📋 Crear plan
          </Link>
          <Link href={`/admin/periodizaciones/nueva-ia?atleta=${atletaId}`}
            className="flex items-center justify-center gap-2 px-4 py-3 border border-[#FF4500]/40 text-[#FF4500] hover:bg-[#FF4500]/10 font-semibold rounded-xl text-sm transition-colors">
            ⚡ Plan IA
          </Link>
          <Link href={`/admin/mensajes?atleta=${atletaId}`}
            className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-800 text-gray-400 hover:border-gray-600 hover:text-white rounded-xl text-sm transition-colors">
            💬 Mensajes
          </Link>
        </div>

      </div>
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-base font-bold text-white">{value}</p>
    </div>
  );
}
