'use client';

import Link from 'next/link';
import { useWorkoutPlans, bloqueActualDe, semanaActualDe } from '@/app/hooks/useWorkoutPlans';

const TIPO_LABEL: Record<string, string> = {
  LINEAL: 'Lineal', ONDULANTE: 'Ondulante', CONJUGADA: 'Conjugada', POR_BLOQUES: 'Por Bloques',
};

const ENFASIS_COLOR: Record<string, string> = {
  Hipertrofia: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  'Fuerza Base': 'text-[#FFB800] bg-[#FFB800]/10 border-[#FFB800]/20',
  Volumen: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  Peaking: 'text-[#FF4500] bg-[#FF4500]/10 border-[#FF4500]/20',
  Tapering: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
};

const ESTADO_COLOR: Record<string, string> = {
  DRAFT: 'text-yellow-400 border-yellow-400',
  ACTIVE: 'text-green-400 border-green-400',
  COMPLETED: 'text-gray-400 border-gray-400',
};

export default function PeriodizacionesPage() {
  const { planes: data, loading, publicar } = useWorkoutPlans();

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Periodizaciones</h1>
          <div className="flex gap-2">
            <Link href="/admin/periodizaciones/nueva-ia"
              className="px-4 py-2 bg-[#FF4500] hover:bg-[#e03d00] text-white rounded-xl font-semibold text-sm transition-colors">
              Generar con IA
            </Link>
            <Link href="/admin/periodizaciones/nueva"
              className="px-4 py-2 border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 rounded-xl font-semibold text-sm transition-colors">
              + Manual
            </Link>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-500">Cargando...</p>
        ) : data.length === 0 ? (
          <div className="text-center py-20 text-gray-600">
            <p className="text-lg mb-4">No hay periodizaciones aún</p>
            <Link href="/admin/periodizaciones/nueva" className="text-[#FF4500] hover:underline">
              Crea la primera →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {data.map((p) => {
              const bloqueActual = bloqueActualDe(p);
              const semanaActual = semanaActualDe(p);
              const enfasisColor = bloqueActual ? (ENFASIS_COLOR[bloqueActual.enfasis] ?? 'text-gray-400 bg-gray-800 border-gray-700') : null;
              return (
                <div key={p.id} className="bg-[#0f0f0f] border border-gray-800 rounded-xl p-5 flex flex-wrap sm:flex-nowrap items-start sm:items-center justify-between gap-4 hover:border-gray-700 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <h3 className="font-semibold text-base">{p.nombre}</h3>
                      <span className={`text-xs border rounded px-2 py-0.5 shrink-0 ${ESTADO_COLOR[p.estado]}`}>
                        {p.estado}
                      </span>
                      {bloqueActual && enfasisColor && (
                        <span className={`text-xs border rounded-full px-2.5 py-0.5 font-semibold shrink-0 ${enfasisColor}`}>
                          {bloqueActual.enfasis}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-gray-500">
                      <span className="font-medium text-gray-300">{p.athlete.user.nombre}</span>
                      <span className="text-gray-700">·</span>
                      <span>{TIPO_LABEL[p.tipo] ?? p.tipo}</span>
                      <span className="text-gray-700">·</span>
                      <span>{p.duracionSemanas} sem · {p._count.bloques} bloques</span>
                      {semanaActual !== null && (
                        <>
                          <span className="text-gray-700">·</span>
                          <span className="text-[#FFB800]">Sem. {semanaActual}</span>
                        </>
                      )}
                    </div>
                    {bloqueActual && (
                      <p className="text-xs text-gray-600 mt-1">{bloqueActual.nombre} · Sem. {bloqueActual.semanaInicio}–{bloqueActual.semanaFin}</p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Link
                      href={`/admin/periodizaciones/${p.id}`}
                      className="text-sm px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-xl transition-colors"
                    >
                      Abrir
                    </Link>
                    {p.estado === 'DRAFT' && (
                      <button
                        onClick={() => publicar(p.id)}
                        className="text-sm px-4 py-2 border border-green-800/60 text-green-400 hover:bg-green-900/20 font-semibold rounded-xl transition-colors"
                      >
                        Publicar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
