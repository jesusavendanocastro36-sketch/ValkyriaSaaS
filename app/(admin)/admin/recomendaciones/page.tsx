'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Recomendacion = {
  id: string;
  tipo: string;
  descripcion: string;
  razonGenerada: string | null;
  estado: string;
  createdAt: string;
  parametrosSugeridos: Record<string, unknown> | null;
  athlete: { user: { nombre: string } };
};

type Atleta = { id: string; user: { nombre: string } };

const TIPO_LABEL: Record<string, string> = {
  AJUSTE_RPE: 'Ajuste RPE',
  CAMBIO_VOLUMEN: 'Cambio Volumen',
  CAMBIO_EJERCICIO: 'Cambio Ejercicio',
  RECUPERACION: 'Recuperación',
  MOVILIDAD: 'Movilidad',
  TECNICA: 'Técnica',
};

const URGENCIA_COLOR: Record<string, string> = {
  alta: 'text-red-400 border-red-400',
  media: 'text-yellow-400 border-yellow-400',
  baja: 'text-green-400 border-green-400',
};

export default function RecomendacionesPage() {
  const router = useRouter();
  const [recs, setRecs] = useState<Recomendacion[]>([]);
  const [atletas, setAtletas] = useState<Atleta[]>([]);
  const [atletaFiltro, setAtletaFiltro] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('PENDIENTE');
  const [loading, setLoading] = useState(true);
  const [generando, setGenerando] = useState('');
  const [expandida, setExpandida] = useState<string | null>(null);

  const fetchRecs = (token: string) => {
    const params = new URLSearchParams({ estado: estadoFiltro });
    if (atletaFiltro) params.set('athlete_id', atletaFiltro);
    fetch(`/api/recomendaciones?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setRecs(d.data ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }

    fetch('/api/atletas', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setAtletas(d.data ?? []));

    fetchRecs(token);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estadoFiltro, atletaFiltro]);

  const handleAccion = async (id: string, estado: 'ACEPTADA' | 'RECHAZADA') => {
    const token = localStorage.getItem('token')!;
    await fetch(`/api/recomendaciones/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ estado }),
    });
    setRecs((prev) => prev.filter((r) => r.id !== id));
  };

  const handleGenerar = async (athleteId: string) => {
    setGenerando(athleteId);
    const token = localStorage.getItem('token')!;
    await fetch('/api/ai/generar-recomendacion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ athlete_id: athleteId }),
    });
    fetchRecs(token);
    setGenerando('');
  };

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold">Recomendaciones IA</h1>
            <p className="text-gray-500 text-sm mt-1">Análisis automático de sesiones y ajustes sugeridos</p>
          </div>
          {atletas.length > 0 && (
            <div className="flex gap-2">
              {atletas.map((a) => (
                <button key={a.id} onClick={() => handleGenerar(a.id)} disabled={generando === a.id}
                  className="text-sm px-3 py-2 border border-[#FF4500] text-[#FF4500] rounded hover:bg-[#FF4500] hover:text-white transition-colors disabled:opacity-50">
                  {generando === a.id ? 'Analizando...' : `Analizar ${a.user.nombre}`}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Filtros */}
        <div className="flex gap-3 mb-6">
          <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none">
            <option value="PENDIENTE">Pendientes</option>
            <option value="ACEPTADA">Aceptadas</option>
            <option value="RECHAZADA">Rechazadas</option>
          </select>
          <select value={atletaFiltro} onChange={(e) => setAtletaFiltro(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none">
            <option value="">Todos los atletas</option>
            {atletas.map((a) => <option key={a.id} value={a.id}>{a.user.nombre}</option>)}
          </select>
        </div>

        {loading ? (
          <p className="text-gray-500">Cargando...</p>
        ) : recs.length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            <p className="text-lg mb-2">Sin recomendaciones {estadoFiltro.toLowerCase()}s</p>
            <p className="text-sm">Usa el botón &quot;Analizar&quot; para generar recomendaciones con IA.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recs.map((rec) => {
              const urgencia = (rec.parametrosSugeridos?.urgencia as string) ?? 'baja';
              return (
                <div key={rec.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                  <button onClick={() => setExpandida(expandida === rec.id ? null : rec.id)}
                    className="w-full px-5 py-4 flex items-start justify-between text-left">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-semibold">{rec.athlete.user.nombre}</span>
                        <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">
                          {TIPO_LABEL[rec.tipo] ?? rec.tipo}
                        </span>
                        <span className={`text-xs border rounded px-2 py-0.5 ${URGENCIA_COLOR[urgencia] ?? URGENCIA_COLOR.baja}`}>
                          {urgencia}
                        </span>
                      </div>
                      <p className="text-gray-300 text-sm">{rec.descripcion}</p>
                      <p className="text-gray-600 text-xs mt-1">
                        {new Date(rec.createdAt).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <span className="text-gray-600 ml-4 shrink-0">{expandida === rec.id ? '▲' : '▼'}</span>
                  </button>

                  {expandida === rec.id && (
                    <div className="px-5 pb-5 border-t border-gray-800 pt-4">
                      {rec.razonGenerada && (
                        <div className="mb-4">
                          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Análisis detallado</p>
                          <p className="text-gray-300 text-sm leading-relaxed">{rec.razonGenerada}</p>
                        </div>
                      )}

                      {Array.isArray(rec.parametrosSugeridos?.acciones) && (
                        <div className="mb-4">
                          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Acciones sugeridas</p>
                          <ul className="space-y-1">
                            {(rec.parametrosSugeridos.acciones as string[]).map((a, i) => (
                              <li key={i} className="text-sm text-gray-300 flex gap-2">
                                <span className="text-[#FF4500] shrink-0">→</span> {String(a)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {estadoFiltro === 'PENDIENTE' && (
                        <div className="flex gap-2 mt-4">
                          <button onClick={() => handleAccion(rec.id, 'ACEPTADA')}
                            className="flex-1 py-2 bg-green-700 hover:bg-green-600 text-white text-sm font-semibold rounded-lg transition-colors">
                            ✓ Aceptar
                          </button>
                          <button onClick={() => handleAccion(rec.id, 'RECHAZADA')}
                            className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-semibold rounded-lg transition-colors">
                            ✕ Rechazar
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
