'use client';

import { useState, useEffect, useRef } from 'react';

type Athlete = {
  id: string;
  nombre: string;
  categoriaPeso: string;
  experienciaPowerlifting: string;
};

type Opcion = {
  opcion: string;
  descripcion: string;
  justificacion_rv: string;
  pros: string[];
  contras: string[];
  cuando_elegir: string;
};

type ConsultaResult = {
  pregunta_interpretada: string;
  perfil_atleta_relevante: string;
  bloque_actual: string;
  posicion_volumen: string;
  diagnostico: string;
  opciones: Opcion[];
  recomendacion_principal: string;
  proximos_pasos: string[];
  conceptos_rv_aplicados: string[];
};

type HistorialEntry = {
  pregunta: string;
  atletaNombre: string | null;
  resultado: ConsultaResult;
  timestamp: string;
};

const BLOQUE_COLOR: Record<string, string> = {
  'Hipertrofia': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'Fuerza Base': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  'Volumen': 'bg-green-500/20 text-green-300 border-green-500/30',
  'Peaking': 'bg-red-500/20 text-red-300 border-red-500/30',
  'Tapering': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
};

const VOLUMEN_COLOR: Record<string, string> = {
  'MV': 'text-gray-400',
  'MEV': 'text-blue-400',
  'MAV': 'text-green-400',
  'MRV': 'text-orange-400',
  'sobre MRV': 'text-red-400',
};

export default function ConsultarIAPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<string>('');
  const [pregunta, setPregunta] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<ConsultaResult | null>(null);
  const [historial, setHistorial] = useState<HistorialEntry[]>([]);
  const [historialIdx, setHistorialIdx] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const SUGERENCIAS = [
    '¿Qué bloque debería seguir después de este?',
    '¿Cómo ajusto la carga si el atleta reporta RPE más alto de lo programado?',
    '¿Qué variantes recomendarías para atacar el punto débil en la salida del squat?',
    '¿El atleta está listo para pasar a Peaking?',
    '¿Cómo estructuro las semanas de descarga para este bloque?',
    '¿Debería aumentar la frecuencia de entrenamiento del deadlift?',
  ];

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/atletas', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setAthletes(Array.isArray(data) ? data : []))
      .catch(() => setAthletes([]));
  }, []);

  async function handleConsultar() {
    if (!pregunta.trim()) return;
    setLoading(true);
    setError(null);
    setResultado(null);

    try {
      const token = localStorage.getItem('token');
      const body: Record<string, string> = { pregunta };
      if (selectedAthlete) body.athlete_id = selectedAthlete;

      const res = await fetch('/api/ai/consultar-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error ?? 'Error desconocido');
        return;
      }

      const data: ConsultaResult = await res.json();
      setResultado(data);

      const atletaNombre = athletes.find(a => a.id === selectedAthlete)?.nombre ?? null;
      const entry: HistorialEntry = {
        pregunta,
        atletaNombre,
        resultado: data,
        timestamp: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
      };
      setHistorial(prev => [entry, ...prev]);
      setHistorialIdx(0);
    } catch {
      setError('Error al conectar con la IA');
    } finally {
      setLoading(false);
    }
  }

  function cargarHistorial(idx: number) {
    setHistorialIdx(idx);
    setResultado(historial[idx].resultado);
    setPregunta(historial[idx].pregunta);
    setSelectedAthlete(
      athletes.find(a => a.nombre === historial[idx].atletaNombre)?.id ?? ''
    );
  }

  const bloqueLabel = resultado?.bloque_actual ?? '';
  const bloqueClass = BLOQUE_COLOR[bloqueLabel] ?? 'bg-gray-500/20 text-gray-300 border-gray-500/30';
  const volumenClass = VOLUMEN_COLOR[resultado?.posicion_volumen ?? ''] ?? 'text-gray-400';

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Consultar Coach IA</h1>
          <p className="text-gray-400 mt-1">
            Pregunta lo que necesites sobre un atleta — razona con el <span className="text-[#FFB800]">Método RV</span>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Input panel */}
          <div className="lg:col-span-1 space-y-4">
            {/* Athlete selector */}
            <div className="bg-[#111] rounded-xl border border-white/10 p-4">
              <label className="block text-sm text-gray-400 mb-2">Atleta (opcional)</label>
              <select
                value={selectedAthlete}
                onChange={e => setSelectedAthlete(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF4500]"
              >
                <option value="">Consulta general (sin atleta)</option>
                {athletes.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.nombre} · {a.categoriaPeso} · {a.experienciaPowerlifting}
                  </option>
                ))}
              </select>
            </div>

            {/* Question input */}
            <div className="bg-[#111] rounded-xl border border-white/10 p-4">
              <label className="block text-sm text-gray-400 mb-2">Tu pregunta</label>
              <textarea
                ref={textareaRef}
                value={pregunta}
                onChange={e => setPregunta(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleConsultar();
                }}
                placeholder="Ej: ¿Qué ajuste recomendarías si el atleta lleva 3 sesiones reportando RPE más alto de lo programado?"
                rows={5}
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm resize-none focus:outline-none focus:border-[#FF4500] placeholder-gray-600"
              />
              <p className="text-xs text-gray-600 mt-1">Cmd+Enter para enviar</p>
            </div>

            <button
              onClick={handleConsultar}
              disabled={loading || !pregunta.trim()}
              className="w-full py-3 rounded-lg font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: loading || !pregunta.trim() ? '#333' : 'linear-gradient(135deg, #FF4500, #FF6B00)' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full inline-block" />
                  Consultando...
                </span>
              ) : (
                'Consultar Método RV'
              )}
            </button>

            {/* Suggested questions */}
            <div className="bg-[#111] rounded-xl border border-white/10 p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Preguntas frecuentes</p>
              <div className="space-y-2">
                {SUGERENCIAS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => { setPregunta(s); textareaRef.current?.focus(); }}
                    className="w-full text-left text-xs text-gray-400 hover:text-white hover:bg-white/5 px-2 py-1.5 rounded transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* History */}
            {historial.length > 0 && (
              <div className="bg-[#111] rounded-xl border border-white/10 p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Historial</p>
                <div className="space-y-2">
                  {historial.map((entry, i) => (
                    <button
                      key={i}
                      onClick={() => cargarHistorial(i)}
                      className={`w-full text-left px-2 py-2 rounded transition-colors ${historialIdx === i ? 'bg-[#FF4500]/10 border border-[#FF4500]/30' : 'hover:bg-white/5'}`}
                    >
                      <p className="text-xs text-white truncate">{entry.pregunta}</p>
                      <p className="text-xs text-gray-500">{entry.atletaNombre ?? 'General'} · {entry.timestamp}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Result panel */}
          <div className="lg:col-span-2">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
                {error}
              </div>
            )}

            {!resultado && !loading && !error && (
              <div className="flex flex-col items-center justify-center h-64 text-gray-600">
                <div className="text-5xl mb-4">🏋️</div>
                <p className="text-lg">Escribe una pregunta para comenzar</p>
                <p className="text-sm mt-1">La IA razonará con el Método RV</p>
              </div>
            )}

            {loading && (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <div className="w-8 h-8 border-2 border-[#FF4500] border-t-transparent rounded-full animate-spin mb-4" />
                <p>Analizando con el Método RV...</p>
              </div>
            )}

            {resultado && !loading && (
              <div className="space-y-4">
                {/* Meta badges */}
                <div className="flex flex-wrap gap-2 items-center">
                  {bloqueLabel && bloqueLabel !== 'Sin información' && (
                    <span className={`text-xs font-medium px-3 py-1 rounded-full border ${bloqueClass}`}>
                      Bloque: {bloqueLabel}
                    </span>
                  )}
                  {resultado.posicion_volumen && resultado.posicion_volumen !== 'Sin datos' && (
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full bg-white/5 border border-white/10 ${volumenClass}`}>
                      Volumen: {resultado.posicion_volumen}
                    </span>
                  )}
                  {resultado.conceptos_rv_aplicados.map((c, i) => (
                    <span key={i} className="text-xs px-2 py-1 rounded-full bg-[#FFB800]/10 text-[#FFB800] border border-[#FFB800]/20">
                      {c}
                    </span>
                  ))}
                </div>

                {/* Interpreted question */}
                {resultado.pregunta_interpretada && (
                  <div className="bg-[#111] rounded-xl border border-white/10 p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Pregunta interpretada</p>
                    <p className="text-sm text-gray-300 italic">"{resultado.pregunta_interpretada}"</p>
                  </div>
                )}

                {/* Diagnosis */}
                <div className="bg-[#111] rounded-xl border border-white/10 p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Diagnóstico</p>
                  <p className="text-white text-sm leading-relaxed">{resultado.diagnostico}</p>
                  {resultado.perfil_atleta_relevante && (
                    <p className="text-gray-500 text-xs mt-2 border-t border-white/5 pt-2">{resultado.perfil_atleta_relevante}</p>
                  )}
                </div>

                {/* Options */}
                {resultado.opciones.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Opciones</p>
                    {resultado.opciones.map((op, i) => (
                      <div
                        key={i}
                        className={`bg-[#111] rounded-xl border p-4 ${
                          resultado.recomendacion_principal.toLowerCase().includes(op.opcion.toLowerCase().slice(0, 10))
                            ? 'border-[#FF4500]/40 bg-[#FF4500]/5'
                            : 'border-white/10'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="text-white font-semibold text-sm">{op.opcion}</h3>
                          {resultado.recomendacion_principal.toLowerCase().includes(op.opcion.toLowerCase().slice(0, 10)) && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-[#FF4500] text-white shrink-0">Recomendada</span>
                          )}
                        </div>
                        <p className="text-gray-300 text-sm mb-3">{op.descripcion}</p>
                        <div className="bg-[#FFB800]/5 border border-[#FFB800]/20 rounded-lg px-3 py-2 mb-3">
                          <p className="text-xs text-[#FFB800] font-medium mb-1">Justificación Método RV</p>
                          <p className="text-xs text-gray-300">{op.justificacion_rv}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-green-400 font-medium mb-1">Pros</p>
                            <ul className="space-y-1">
                              {op.pros.map((p, j) => (
                                <li key={j} className="text-xs text-gray-300 flex gap-1">
                                  <span className="text-green-500 shrink-0">+</span>{p}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-xs text-red-400 font-medium mb-1">Contras</p>
                            <ul className="space-y-1">
                              {op.contras.map((c, j) => (
                                <li key={j} className="text-xs text-gray-300 flex gap-1">
                                  <span className="text-red-500 shrink-0">−</span>{c}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        {op.cuando_elegir && (
                          <p className="text-xs text-gray-500 mt-2 border-t border-white/5 pt-2">
                            <span className="text-gray-400">Cuándo elegir: </span>{op.cuando_elegir}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Main recommendation */}
                <div className="bg-[#FF4500]/10 border border-[#FF4500]/30 rounded-xl p-4">
                  <p className="text-xs text-[#FF4500] uppercase tracking-wider font-medium mb-2">Recomendación Principal</p>
                  <p className="text-white text-sm leading-relaxed">{resultado.recomendacion_principal}</p>
                </div>

                {/* Next steps */}
                {resultado.proximos_pasos.length > 0 && (
                  <div className="bg-[#111] rounded-xl border border-white/10 p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Próximos Pasos</p>
                    <ol className="space-y-2">
                      {resultado.proximos_pasos.map((paso, i) => (
                        <li key={i} className="flex gap-3 text-sm text-gray-300">
                          <span className="w-5 h-5 rounded-full bg-[#FF4500]/20 text-[#FF4500] text-xs flex items-center justify-center shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          {paso}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
