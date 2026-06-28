'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// ── Types ────────────────────────────────────────────────────────────────────

type SubVariante = {
  id: string;
  nombre: string;
  descripcion: string | null;
  cuesTecnicos: string[];
  notasSeguridad: string | null;
  videoUrl: string | null;
  gruposMusculares: string[];
};

type Variante = {
  id: string;
  nombre: string;
  categoria: string;
  gruposMusculares: string[];
  descripcion: string | null;
  cuesTecnicos: string[];
  notasSeguridad: string | null;
  videoUrl: string | null;
  equipamientoReq: string[];
  createdAt: string;
  variantes: SubVariante[];
};

type EjercicioBase = {
  id: string;
  nombre: string;
  categoria: string;
  gruposMusculares: string[];
  descripcion: string | null;
  cuesTecnicos: string[];
  notasSeguridad: string | null;
  videoUrl: string | null;
  equipamientoReq: string[];
  createdAt: string;
  variantes: Variante[];
};

// ── Constants ────────────────────────────────────────────────────────────────

const CATEGORIAS = ['COMPETITIVO', 'VARIANTE', 'AUXILIAR', 'COMPENSATORIO', 'MOVILIDAD'] as const;
const CAT_LABEL: Record<string, string> = {
  COMPETITIVO: 'Competitivo', VARIANTE: 'Variante', AUXILIAR: 'Auxiliar',
  COMPENSATORIO: 'Compensatorio', MOVILIDAD: 'Movilidad',
};
const CAT_COLOR: Record<string, string> = {
  COMPETITIVO: 'text-[#FF4500] bg-[#FF4500]/10 border-[#FF4500]/30',
  VARIANTE: 'text-[#FFB800] bg-[#FFB800]/10 border-[#FFB800]/30',
  AUXILIAR: 'text-orange-300 bg-orange-400/10 border-orange-400/30',
  COMPENSATORIO: 'text-purple-300 bg-purple-400/10 border-purple-400/30',
  MOVILIDAD: 'text-green-400 bg-green-400/10 border-green-400/30',
};

const EMPTY_FORM = {
  nombre: '', categoria: 'AUXILIAR' as string,
  gruposMusculares: '', musculosSecundarios: '', descripcion: '',
  cuesTecnicos: '', notasSeguridad: '', videoUrl: '', equipamientoReq: '',
};

const EMPTY_VAR_FORM = { nombre: '', gruposMusculares: '', descripcion: '', cuesTecnicos: '', videoUrl: '' };

// ── Page ─────────────────────────────────────────────────────────────────────

export default function EjerciciosPage() {
  const router = useRouter();
  const [ejercicios, setEjercicios] = useState<EjercicioBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [guardando, setGuardando] = useState(false);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [mostrarFormVariante, setMostrarFormVariante] = useState<string | null>(null);
  const [formVariante, setFormVariante] = useState(EMPTY_VAR_FORM);
  const [guardandoVariante, setGuardandoVariante] = useState(false);
  const [setupMsg, setSetupMsg] = useState('');
  const [runningSetup, setRunningSetup] = useState(false);
  const [editingBibVideo, setEditingBibVideo] = useState<string | null>(null);
  const [bibVideoEdit, setBibVideoEdit] = useState('');
  const [rvFaltantes, setRvFaltantes] = useState<number | null>(null);
  const [importando, setImportando] = useState(false);
  const [importMsg, setImportMsg] = useState('');

  const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem('token') : '');

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push('/login'); return; }
  }, [router]);

  const fetchMia = (categoria?: string) => {
    setLoading(true);
    const token = getToken()!;
    const params = new URLSearchParams();
    if (categoria) params.set('categoria', categoria);
    fetch(`/api/ejercicios?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setEjercicios(d.data ?? []))
      .finally(() => setLoading(false));
  };

  const fetchRvFaltantes = () => {
    const token = getToken()!;
    fetch('/api/admin/importar-rv', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setRvFaltantes(d.faltantes ?? 0));
  };

  useEffect(() => {
    fetchMia(categoriaFiltro || undefined);
    fetchRvFaltantes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoriaFiltro]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    const token = getToken()!;
    const payload = {
      nombre: form.nombre, categoria: form.categoria,
      gruposMusculares: form.gruposMusculares.split(',').map(s => s.trim()).filter(Boolean),
      musculosSecundarios: form.musculosSecundarios.split(',').map(s => s.trim()).filter(Boolean),
      descripcion: form.descripcion || undefined,
      cuesTecnicos: form.cuesTecnicos.split('\n').map(s => s.trim()).filter(Boolean),
      notasSeguridad: form.notasSeguridad || undefined,
      videoUrl: form.videoUrl || undefined,
      equipamientoReq: form.equipamientoReq.split(',').map(s => s.trim()).filter(Boolean),
    };
    const res = await fetch('/api/ejercicios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    if (res.ok) { setForm(EMPTY_FORM); setMostrarForm(false); fetchMia(categoriaFiltro || undefined); }
    setGuardando(false);
  };

  const handleGuardarVariante = async (e: React.FormEvent, parentId: string) => {
    e.preventDefault();
    setGuardandoVariante(true);
    const token = getToken()!;
    const payload = {
      nombre: formVariante.nombre,
      categoria: 'VARIANTE',
      parentId,
      gruposMusculares: formVariante.gruposMusculares.split(',').map(s => s.trim()).filter(Boolean),
      descripcion: formVariante.descripcion || undefined,
      cuesTecnicos: formVariante.cuesTecnicos.split('\n').map(s => s.trim()).filter(Boolean),
      videoUrl: formVariante.videoUrl || undefined,
      equipamientoReq: [],
    };
    const res = await fetch('/api/ejercicios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setFormVariante(EMPTY_VAR_FORM);
      setMostrarFormVariante(null);
      fetchMia(categoriaFiltro || undefined);
    }
    setGuardandoVariante(false);
  };

  const handleSetup = async () => {
    setRunningSetup(true);
    setSetupMsg('Sincronizando...');
    const token = getToken()!;
    const res = await fetch('/api/admin/setup-biblioteca', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (res.ok) {
      setSetupMsg(`✓ ${data.message}`);
      fetchMia(categoriaFiltro || undefined);
      fetchRvFaltantes();
    } else {
      setSetupMsg(`Error: ${data.error}`);
    }
    setRunningSetup(false);
  };

  const handleSaveBibVideo = async (id: string) => {
    const token = getToken()!;
    await fetch(`/api/ejercicios/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ videoUrl: bibVideoEdit }),
    });
    setEditingBibVideo(null);
    fetchMia(categoriaFiltro || undefined);
  };

  const handleEliminar = async (id: string) => {
    const token = getToken()!;
    await fetch(`/api/ejercicios/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    fetchMia(categoriaFiltro || undefined);
  };

  const handleImportarRV = async () => {
    setImportando(true);
    setImportMsg('');
    const token = getToken()!;
    const res = await fetch('/api/admin/importar-rv', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (res.ok) {
      setImportMsg(`✓ ${data.message}`);
      setRvFaltantes(0);
      fetchMia(categoriaFiltro || undefined);
    } else {
      setImportMsg(`Error: ${data.error}`);
    }
    setImportando(false);
  };

  const filtrados = ejercicios.filter(e =>
    busqueda === '' ||
    e.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    e.gruposMusculares.some(g => g.toLowerCase().includes(busqueda.toLowerCase())) ||
    e.variantes.some(v => v.nombre.toLowerCase().includes(busqueda.toLowerCase()))
  );

  const totalEjercicios = filtrados.length;
  const totalVariantes = filtrados.reduce((acc, e) => acc + e.variantes.length, 0);

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">Biblioteca de Ejercicios</h1>
            <p className="text-gray-500 text-sm">
              <span className="text-white font-semibold">{totalEjercicios}</span> movimientos base ·{' '}
              <span className="text-white font-semibold">{totalVariantes}</span> variantes
            </p>
          </div>
          <button
            onClick={() => { setMostrarForm(!mostrarForm); setMostrarFormVariante(null); }}
            className="px-4 py-2 bg-[#FF4500] hover:bg-[#e03d00] text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {mostrarForm ? 'Cancelar' : '+ Nuevo movimiento base'}
          </button>
        </div>

        {/* Form — nuevo movimiento base */}
        {mostrarForm && (
          <form onSubmit={handleGuardar} className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6 space-y-4">
            <h2 className="font-semibold text-[#FFB800]">Nuevo movimiento base</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Nombre *</label>
                <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
                  required placeholder="ej. Sentadilla Trasera"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF4500]" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Categoría *</label>
                <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF4500]">
                  {CATEGORIAS.map(c => <option key={c} value={c}>{CAT_LABEL[c]}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">
                  Músculos primarios <span className="text-gray-600">(serie completa · coma)</span>
                </label>
                <input value={form.gruposMusculares} onChange={e => setForm({ ...form, gruposMusculares: e.target.value })}
                  placeholder="ej. cuádriceps, glúteos"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF4500]" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">
                  Músculos secundarios <span className="text-gray-600">(media serie · coma)</span>
                </label>
                <input value={form.musculosSecundarios} onChange={e => setForm({ ...form, musculosSecundarios: e.target.value })}
                  placeholder="ej. tríceps, hombros"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF4500]" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Equipamiento (coma)</label>
              <input value={form.equipamientoReq} onChange={e => setForm({ ...form, equipamientoReq: e.target.value })}
                placeholder="ej. barra olímpica, rack"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF4500]" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Descripción</label>
              <input value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })}
                placeholder="Descripción breve del ejercicio"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF4500]" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Cues técnicos (uno por línea)</label>
              <textarea value={form.cuesTecnicos} onChange={e => setForm({ ...form, cuesTecnicos: e.target.value })}
                rows={3} placeholder={"Pecho arriba\nRodillas hacia afuera\nBreaking paralelo"}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF4500] resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Notas de seguridad</label>
                <input value={form.notasSeguridad} onChange={e => setForm({ ...form, notasSeguridad: e.target.value })}
                  placeholder="ej. No colapsar rodillas al subir"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF4500]" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">URL de video</label>
                <input value={form.videoUrl} onChange={e => setForm({ ...form, videoUrl: e.target.value })}
                  placeholder="https://youtube.com/..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF4500]" />
              </div>
            </div>
            <button type="submit" disabled={guardando || !form.nombre}
              className="w-full bg-[#FF4500] hover:bg-[#e03d00] text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50">
              {guardando ? 'Guardando...' : 'Guardar movimiento base'}
            </button>
          </form>
        )}

        {/* Setup banner — shown when library is empty */}
        {ejercicios.length === 0 && !loading && (
          <div className="bg-[#FFB800]/5 border border-[#FFB800]/20 rounded-xl p-4 mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-[#FFB800] uppercase tracking-wider mb-0.5">Biblioteca vacía</p>
              <p className="text-xs text-gray-500">Sincroniza el catálogo completo de ejercicios (Big 3 + variantes + auxiliares).</p>
            </div>
            <button
              onClick={handleSetup}
              disabled={runningSetup}
              className="shrink-0 px-4 py-2 bg-[#FFB800] hover:bg-[#e6a600] text-black text-xs font-bold rounded-lg disabled:opacity-50 transition-colors"
            >
              {runningSetup ? 'Sincronizando...' : 'Sincronizar ejercicios'}
            </button>
          </div>
        )}
        {setupMsg && (
          <p className={`text-xs mb-4 font-medium ${setupMsg.startsWith('✓') ? 'text-green-400' : 'text-red-400'}`}>
            {setupMsg}
          </p>
        )}

        {/* RV import banner */}
        {rvFaltantes !== null && rvFaltantes > 0 && (
          <div className="bg-blue-900/10 border border-blue-700/20 rounded-xl p-4 mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-0.5">
                {rvFaltantes} ejercicios del Método RV pendientes
              </p>
              <p className="text-xs text-gray-500">
                Importa los ejercicios RV faltantes directo a tu biblioteca.
              </p>
            </div>
            <button
              onClick={handleImportarRV}
              disabled={importando}
              className="shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg disabled:opacity-50 transition-colors"
            >
              {importando ? 'Importando...' : 'Importar →'}
            </button>
          </div>
        )}
        {importMsg && (
          <p className={`text-xs mb-4 font-medium ${importMsg.startsWith('✓') ? 'text-green-400' : 'text-red-400'}`}>
            {importMsg}
          </p>
        )}

        {/* Filters */}
        <div className="flex gap-3 mb-5">
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, músculo o variante..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF4500]" />
          <select value={categoriaFiltro} onChange={e => setCategoriaFiltro(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none">
            <option value="">Todas las categorías</option>
            {CATEGORIAS.map(c => <option key={c} value={c}>{CAT_LABEL[c]}</option>)}
          </select>
        </div>

        {/* List */}
        {loading ? (
          <p className="text-gray-500">Cargando...</p>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            <p className="text-lg mb-2">Sin ejercicios</p>
            <p className="text-sm">Agrega movimientos base y sus variantes.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtrados.map((ej) => {
              const isOpen = expandido === ej.id;
              return (
                <div key={ej.id} className={`border rounded-xl overflow-hidden bg-gray-900 transition-all ${
                  isOpen ? 'border-gray-600' : 'border-gray-800'
                }`}>
                  {/* Parent header */}
                  <div className="w-full px-5 py-4 flex items-center justify-between">
                    <button
                      onClick={() => setExpandido(isOpen ? null : ej.id)}
                      className="flex items-center gap-3 flex-1 text-left"
                    >
                      <span className={`text-xs font-semibold px-2 py-1 rounded border shrink-0 ${CAT_COLOR[ej.categoria] ?? ''}`}>
                        {CAT_LABEL[ej.categoria] ?? ej.categoria}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-white">{ej.nombre}</p>
                        {ej.gruposMusculares.length > 0 && (
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {ej.gruposMusculares.slice(0, 4).join(', ')}
                          </p>
                        )}
                      </div>
                    </button>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      {ej.variantes.length > 0 && (
                        <span className="text-xs text-gray-600 hidden sm:inline">
                          {ej.variantes.length} {ej.variantes.length === 1 ? 'variante' : 'variantes'}
                          {ej.variantes.some(v => v.variantes.length > 0) && (
                            ` · ${ej.variantes.reduce((a, v) => a + v.variantes.length, 0)} sub`
                          )}
                          {' · 1 principal'}
                        </span>
                      )}
                      {ej.videoUrl && (
                        <a href={ej.videoUrl} target="_blank" rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="text-xs text-blue-400 hover:text-blue-300 hidden sm:inline">
                          Video ↗
                        </a>
                      )}
                      <button
                        onClick={() => setExpandido(isOpen ? null : ej.id)}
                        className="text-gray-600 text-xs hover:text-gray-300">
                        {isOpen ? '▲' : '▼'}
                      </button>
                    </div>
                  </div>

                  {/* Expanded content */}
                  {isOpen && (
                    <div className="border-t border-gray-800">
                      {/* Parent details */}
                      {(ej.descripcion || ej.cuesTecnicos.length > 0 || ej.equipamientoReq.length > 0 || ej.notasSeguridad) && (
                        <div className="px-5 py-4 space-y-3 border-b border-gray-800/60">
                          {ej.descripcion && <p className="text-gray-400 text-sm">{ej.descripcion}</p>}
                          <div className="flex flex-wrap gap-4 text-sm">
                            {ej.equipamientoReq.length > 0 && (
                              <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Equipamiento</p>
                                <div className="flex flex-wrap gap-1">
                                  {ej.equipamientoReq.map((eq, i) => (
                                    <span key={i} className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded">{eq}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {ej.gruposMusculares.length > 0 && (
                              <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Músculos</p>
                                <div className="flex flex-wrap gap-1">
                                  {ej.gruposMusculares.map((g, i) => (
                                    <span key={i} className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded">{g}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          {ej.cuesTecnicos.length > 0 && (
                            <div>
                              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Cues técnicos</p>
                              <div className="flex flex-wrap gap-x-4 gap-y-1">
                                {ej.cuesTecnicos.map((c, i) => (
                                  <span key={i} className="text-xs text-gray-300 flex gap-1">
                                    <span className="text-[#FFB800]">→</span>{c}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {ej.notasSeguridad && (
                            <div className="bg-yellow-900/20 border border-yellow-800/30 rounded-lg px-3 py-2">
                              <p className="text-xs text-yellow-500 font-semibold uppercase tracking-wider mb-0.5">Seguridad</p>
                              <p className="text-xs text-yellow-300">{ej.notasSeguridad}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Variantes section */}
                      <div className="px-5 py-4">
                        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
                          Ejercicios ({1 + ej.variantes.length})
                        </p>

                        <div className="space-y-1 mb-4">
                          {/* Principal */}
                          <div className="bg-[#FF4500]/5 border border-[#FF4500]/25 rounded-lg overflow-hidden">
                            <div className="px-3 py-2 flex items-center gap-2">
                              <span className="text-[#FF4500] text-xs shrink-0">★</span>
                              <span className="text-sm text-white font-semibold flex-1">{ej.nombre}</span>
                              <span className="text-[9px] font-bold uppercase tracking-widest text-[#FF4500] bg-[#FF4500]/10 border border-[#FF4500]/20 px-1.5 py-0.5 rounded shrink-0">
                                Principal
                              </span>
                            </div>
                            <div className="border-t border-[#FF4500]/15 px-3 py-1.5 flex items-center gap-2">
                              <span className="text-[10px] text-gray-500 shrink-0">Video:</span>
                              {editingBibVideo === ej.id ? (
                                <>
                                  <input
                                    value={bibVideoEdit}
                                    onChange={e => setBibVideoEdit(e.target.value)}
                                    placeholder="https://youtube.com/..."
                                    className="flex-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-[#FF4500]"
                                  />
                                  <button onClick={() => handleSaveBibVideo(ej.id)} className="text-xs text-[#FFB800] hover:text-white px-2 py-1">Guardar</button>
                                  <button onClick={() => setEditingBibVideo(null)} className="text-xs text-gray-500 hover:text-white px-1">×</button>
                                </>
                              ) : (
                                <>
                                  {ej.videoUrl ? (
                                    <a href={ej.videoUrl} target="_blank" rel="noopener noreferrer" className="text-green-400 text-xs hover:text-green-300 truncate flex-1">▶ {ej.videoUrl}</a>
                                  ) : (
                                    <span className="text-xs text-gray-700 flex-1 italic">Sin video</span>
                                  )}
                                  <button onClick={() => { setEditingBibVideo(ej.id); setBibVideoEdit(ej.videoUrl ?? ''); }} className="text-xs text-gray-500 hover:text-[#FFB800]">✏️</button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Variantes */}
                          {ej.variantes.map(v => (
                            <VarianteRow
                              key={v.id}
                              variante={v}
                              onDelete={handleEliminar}
                              onVideoSave={handleSaveBibVideo}
                              editingBibVideo={editingBibVideo}
                              setEditingBibVideo={setEditingBibVideo}
                              bibVideoEdit={bibVideoEdit}
                              setBibVideoEdit={setBibVideoEdit}
                              getToken={getToken}
                              onRefresh={() => fetchMia(categoriaFiltro || undefined)}
                            />
                          ))}

                          {ej.variantes.length === 0 && (
                            <p className="text-xs text-gray-600 pt-1">Sin variantes aún. Agrega la primera abajo.</p>
                          )}
                        </div>

                        {/* Inline variant form */}
                        {mostrarFormVariante === ej.id ? (
                          <form
                            onSubmit={e => handleGuardarVariante(e, ej.id)}
                            className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3 mb-2"
                          >
                            <p className="text-xs font-semibold text-[#FFB800] uppercase tracking-wider">Nueva variante de {ej.nombre}</p>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs text-gray-400 block mb-1">Nombre *</label>
                                <input
                                  value={formVariante.nombre}
                                  onChange={e => setFormVariante({ ...formVariante, nombre: e.target.value })}
                                  required placeholder="ej. Sentadilla con pausa"
                                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF4500]"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-400 block mb-1">Músculos (coma)</label>
                                <input
                                  value={formVariante.gruposMusculares}
                                  onChange={e => setFormVariante({ ...formVariante, gruposMusculares: e.target.value })}
                                  placeholder="igual que base o diferente"
                                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF4500]"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-xs text-gray-400 block mb-1">Descripción / diferencia con la base</label>
                              <input
                                value={formVariante.descripcion}
                                onChange={e => setFormVariante({ ...formVariante, descripcion: e.target.value })}
                                placeholder="ej. Pausa de 2-3ct en el hoyo"
                                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF4500]"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-400 block mb-1">Cues adicionales (uno por línea)</label>
                              <textarea
                                value={formVariante.cuesTecnicos}
                                onChange={e => setFormVariante({ ...formVariante, cuesTecnicos: e.target.value })}
                                rows={2}
                                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF4500] resize-none"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-400 block mb-1">URL de video</label>
                              <input
                                value={formVariante.videoUrl}
                                onChange={e => setFormVariante({ ...formVariante, videoUrl: e.target.value })}
                                placeholder="https://youtube.com/..."
                                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF4500]"
                              />
                            </div>
                            <div className="flex gap-2 pt-1">
                              <button type="submit" disabled={guardandoVariante || !formVariante.nombre}
                                className="flex-1 bg-[#FF4500] hover:bg-[#e03d00] text-white text-sm font-semibold py-2 rounded-lg disabled:opacity-50 transition-colors">
                                {guardandoVariante ? 'Guardando...' : 'Guardar variante'}
                              </button>
                              <button type="button" onClick={() => { setMostrarFormVariante(null); setFormVariante(EMPTY_VAR_FORM); }}
                                className="px-4 py-2 text-gray-400 hover:text-white text-sm transition-colors">
                                Cancelar
                              </button>
                            </div>
                          </form>
                        ) : (
                          <button
                            onClick={() => { setMostrarFormVariante(ej.id); setFormVariante(EMPTY_VAR_FORM); }}
                            className="text-xs text-[#FFB800] hover:text-[#FFB800]/70 font-semibold transition-colors flex items-center gap-1"
                          >
                            + Agregar variante
                          </button>
                        )}
                      </div>

                      {/* Delete parent */}
                      <div className="px-5 pb-4 flex justify-end border-t border-gray-800/40 pt-3">
                        <button
                          onClick={() => handleEliminar(ej.id)}
                          className="text-xs text-red-500/60 hover:text-red-400 transition-colors"
                        >
                          Eliminar movimiento y todas sus variantes
                        </button>
                      </div>
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

// ── Sub-components ────────────────────────────────────────────────────────────

function VarianteRow({
  variante, onDelete, onVideoSave, editingBibVideo, setEditingBibVideo, bibVideoEdit, setBibVideoEdit, getToken, onRefresh,
}: {
  variante: Variante;
  onDelete: (id: string) => void;
  onVideoSave: (id: string) => void;
  editingBibVideo: string | null;
  setEditingBibVideo: (id: string | null) => void;
  bibVideoEdit: string;
  setBibVideoEdit: (v: string) => void;
  getToken: () => string | null;
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [mostrarSubForm, setMostrarSubForm] = useState(false);
  const [subForm, setSubForm] = useState({ nombre: '', descripcion: '', videoUrl: '' });
  const [guardandoSub, setGuardandoSub] = useState(false);

  const handleGuardarSub = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardandoSub(true);
    const token = getToken()!;
    const res = await fetch('/api/ejercicios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        nombre: subForm.nombre,
        categoria: 'VARIANTE',
        parentId: variante.id,
        gruposMusculares: variante.gruposMusculares,
        descripcion: subForm.descripcion || undefined,
        cuesTecnicos: [],
        videoUrl: subForm.videoUrl || undefined,
        equipamientoReq: [],
      }),
    });
    if (res.ok) {
      setSubForm({ nombre: '', descripcion: '', videoUrl: '' });
      setMostrarSubForm(false);
      onRefresh();
    }
    setGuardandoSub(false);
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2">
        <button onClick={() => setOpen(!open)} className="flex items-center gap-2 flex-1 text-left">
          <span className="text-[#FFB800] text-xs shrink-0">→</span>
          <span className="text-sm text-gray-200">{variante.nombre}</span>
          {variante.variantes.length > 0 && (
            <span className="text-[10px] text-gray-600 bg-gray-700/50 px-1.5 py-0.5 rounded hidden sm:inline">
              {variante.variantes.length} sub
            </span>
          )}
          {variante.gruposMusculares.length > 0 && variante.variantes.length === 0 && (
            <span className="text-xs text-gray-600 hidden sm:inline truncate">
              {variante.gruposMusculares.slice(0, 2).join(', ')}
            </span>
          )}
        </button>
        <div className="flex items-center gap-2 shrink-0">
          {variante.videoUrl && !open && (
            <a href={variante.videoUrl} target="_blank" rel="noopener noreferrer" className="text-green-400 text-xs" title="Ver video">▶</a>
          )}
          <button onClick={() => setOpen(!open)} className="text-xs text-gray-600 hover:text-gray-400">
            {open ? '▲' : '▼'}
          </button>
          <button onClick={() => onDelete(variante.id)} className="text-xs text-red-500/50 hover:text-red-400 px-1">×</button>
        </div>
      </div>

      {open && (
        <div className="border-t border-gray-700/50 px-3 py-2 space-y-2">
          {variante.descripcion && <p className="text-xs text-gray-400">{variante.descripcion}</p>}
          {variante.cuesTecnicos.length > 0 && (
            <div className="flex flex-wrap gap-x-3 gap-y-0.5">
              {variante.cuesTecnicos.map((c, i) => (
                <span key={i} className="text-xs text-gray-400">→ {c}</span>
              ))}
            </div>
          )}
          {variante.notasSeguridad && (
            <p className="text-xs text-yellow-400/80 bg-yellow-900/10 border border-yellow-800/20 rounded px-2 py-1">
              ⚠ {variante.notasSeguridad}
            </p>
          )}

          {/* Video inline */}
          <div className="flex items-center gap-2 pt-1 border-t border-gray-700/40">
            <span className="text-[10px] text-gray-500 shrink-0">Video:</span>
            {editingBibVideo === variante.id ? (
              <>
                <input
                  value={bibVideoEdit}
                  onChange={e => setBibVideoEdit(e.target.value)}
                  placeholder="https://youtube.com/..."
                  className="flex-1 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-[#FF4500]"
                />
                <button onClick={() => onVideoSave(variante.id)} className="text-xs text-[#FFB800] hover:text-white px-2 py-1">Guardar</button>
                <button onClick={() => setEditingBibVideo(null)} className="text-xs text-gray-500 hover:text-white px-1">×</button>
              </>
            ) : (
              <>
                {variante.videoUrl ? (
                  <a href={variante.videoUrl} target="_blank" rel="noopener noreferrer" className="text-green-400 text-xs hover:text-green-300 truncate flex-1">▶ {variante.videoUrl}</a>
                ) : (
                  <span className="text-xs text-gray-700 flex-1 italic">Sin video</span>
                )}
                <button onClick={() => { setEditingBibVideo(variante.id); setBibVideoEdit(variante.videoUrl ?? ''); }} className="text-xs text-gray-500 hover:text-[#FFB800]">✏️</button>
              </>
            )}
          </div>

          {/* Sub-variantes */}
          <div className="border-t border-gray-700/40 pt-2 space-y-1">
            {variante.variantes.length > 0 && (
              <>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold mb-1">Sub-variantes</p>
                {variante.variantes.map(sv => (
                  <div key={sv.id} className="bg-gray-900/60 border border-gray-700/30 rounded px-3 py-2 flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-[10px] shrink-0">↳</span>
                        <span className="text-xs text-gray-300">{sv.nombre}</span>
                      </div>
                      {sv.descripcion && <p className="text-[11px] text-gray-600 mt-0.5 ml-4">{sv.descripcion}</p>}
                      {sv.videoUrl && (
                        <a href={sv.videoUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-green-500/70 hover:text-green-400 ml-4 block mt-0.5">▶ Video</a>
                      )}
                    </div>
                    <button onClick={() => onDelete(sv.id)} className="text-[10px] text-red-500/40 hover:text-red-400 shrink-0">×</button>
                  </div>
                ))}
              </>
            )}

            {mostrarSubForm ? (
              <form onSubmit={handleGuardarSub} className="bg-gray-900 border border-gray-700/50 rounded-lg p-3 space-y-2 mt-1">
                <p className="text-[10px] font-semibold text-[#FFB800] uppercase tracking-wider">Sub-variante de {variante.nombre}</p>
                <input
                  value={subForm.nombre}
                  onChange={e => setSubForm({ ...subForm, nombre: e.target.value })}
                  required
                  placeholder="ej. Spoto Press con Larsen"
                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#FF4500]"
                />
                <input
                  value={subForm.descripcion}
                  onChange={e => setSubForm({ ...subForm, descripcion: e.target.value })}
                  placeholder="Descripción / diferencia"
                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#FF4500]"
                />
                <input
                  value={subForm.videoUrl}
                  onChange={e => setSubForm({ ...subForm, videoUrl: e.target.value })}
                  placeholder="URL de video (opcional)"
                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#FF4500]"
                />
                <div className="flex gap-2">
                  <button type="submit" disabled={guardandoSub || !subForm.nombre}
                    className="flex-1 bg-[#FF4500] hover:bg-[#e03d00] text-white text-xs font-semibold py-1.5 rounded disabled:opacity-50 transition-colors">
                    {guardandoSub ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button type="button" onClick={() => { setMostrarSubForm(false); setSubForm({ nombre: '', descripcion: '', videoUrl: '' }); }}
                    className="px-3 py-1.5 text-gray-500 hover:text-white text-xs transition-colors">
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setMostrarSubForm(true)}
                className="text-[11px] text-gray-600 hover:text-[#FFB800] font-medium transition-colors flex items-center gap-1 mt-1"
              >
                + Sub-variante
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
