'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Atleta = { id: string; user: { nombre: string } };

type JobState = {
  jobId: string;
  athleteNombre: string;
  status: 'procesando' | 'completado' | 'error';
  resultado?: string;
};

export default function ReportesPage() {
  const router = useRouter();
  const [atletas, setAtletas] = useState<Atleta[]>([]);
  const [form, setForm] = useState({
    athlete_id: '',
    fecha_inicio: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    fecha_fin: new Date().toISOString().split('T')[0],
    tipo: 'mensual',
  });
  const [jobs, setJobs] = useState<JobState[]>([]);
  const [generando, setGenerando] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    fetch('/api/atletas', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        setAtletas(d.data ?? []);
        if (d.data?.[0]) setForm((f) => ({ ...f, athlete_id: d.data[0].id }));
      });
  }, [router]);

  const pollJob = useCallback((jobId: string) => {
    const token = localStorage.getItem('token')!;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/ai/reporte-status/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.status === 'completado' || data.status === 'error') {
        clearInterval(interval);
        setJobs((prev) => prev.map((j) =>
          j.jobId === jobId ? { ...j, status: data.status, resultado: data.resultado } : j
        ));
      }
    }, 3000);
  }, []);

  const handleGenerar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.athlete_id) return;
    setGenerando(true);

    const token = localStorage.getItem('token')!;
    const atleta = atletas.find((a) => a.id === form.athlete_id);

    try {
      const res = await fetch('/api/ai/generar-reporte', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          athlete_id: form.athlete_id,
          rango_fechas: { inicio: form.fecha_inicio, fin: form.fecha_fin },
          tipo: form.tipo,
        }),
      });
      const data = await res.json();

      const newJob: JobState = {
        jobId: data.job_id,
        athleteNombre: atleta?.user.nombre ?? 'Atleta',
        status: 'procesando',
      };
      setJobs((prev) => [newJob, ...prev]);
      pollJob(data.job_id);
    } finally {
      setGenerando(false);
    }
  };

  const handleDescargar = (resultado: string, nombre: string) => {
    const blob = new Blob([resultado], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-${nombre}-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-2">Reportes de Progreso</h1>
        <p className="text-gray-500 text-sm mb-8">Genera reportes narrativos con análisis de IA en formato Markdown</p>

        {/* Form */}
        <form onSubmit={handleGenerar} className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4 mb-8">
          <h2 className="font-semibold text-[#FFB800]">Nuevo reporte</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-400 block mb-1">Atleta</label>
              <select value={form.athlete_id} onChange={(e) => setForm({ ...form, athlete_id: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#FF4500]">
                {atletas.map((a) => <option key={a.id} value={a.id}>{a.user.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">Tipo</label>
              <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#FF4500]">
                <option value="mensual">Mensual</option>
                <option value="trimestral">Trimestral</option>
                <option value="personalizado">Personalizado</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-400 block mb-1">Desde</label>
              <input type="date" value={form.fecha_inicio} onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#FF4500]" />
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">Hasta</label>
              <input type="date" value={form.fecha_fin} onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#FF4500]" />
            </div>
          </div>

          <button type="submit" disabled={generando || !form.athlete_id}
            className="w-full bg-[#FF4500] hover:bg-[#e03d00] text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50">
            {generando ? 'Enviando...' : 'Generar reporte con IA'}
          </button>
        </form>

        {/* Jobs */}
        {jobs.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-semibold text-gray-400">Reportes generados</h2>
            {jobs.map((job) => (
              <div key={job.jobId} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{job.athleteNombre}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {job.status === 'procesando' && (
                        <>
                          <div className="w-3 h-3 rounded-full bg-yellow-400 animate-pulse" />
                          <span className="text-yellow-400 text-sm">Generando reporte...</span>
                        </>
                      )}
                      {job.status === 'completado' && (
                        <span className="text-green-400 text-sm">Reporte listo</span>
                      )}
                      {job.status === 'error' && (
                        <span className="text-red-400 text-sm">Error al generar</span>
                      )}
                    </div>
                  </div>

                  {job.status === 'completado' && job.resultado && (
                    <button onClick={() => handleDescargar(job.resultado!, job.athleteNombre)}
                      className="text-sm px-4 py-2 bg-[#FF4500] hover:bg-[#e03d00] text-white rounded-lg transition-colors">
                      Descargar .md
                    </button>
                  )}
                </div>

                {job.status === 'completado' && job.resultado && (
                  <div className="mt-4 bg-gray-950 rounded-lg p-4 max-h-64 overflow-y-auto">
                    <pre className="text-gray-300 text-xs whitespace-pre-wrap font-mono">{job.resultado}</pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
