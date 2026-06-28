'use client';

import { useState, useEffect, useRef } from 'react';

type Result = {
  id: string;
  fuente: 'rv' | 'biblioteca';
  nombre: string;
  altNombre: string | null;
  tipo: string;
  movimiento: string | null;
  rank: string | null;
  videoUrl: string | null;
  cargaRef: string | null;
  notas: string | null;
};

type Props = {
  onSelect: (r: Result) => void;
  placeholder?: string;
};

const MOV_LABEL: Record<string, string> = { sq: 'SQ', bp: 'BP', dl: 'DL', comp: 'Comp' };
const RANK_COLOR: Record<string, string> = {
  S: 'text-[#FF4500]', A: 'text-[#FFB800]', B: 'text-gray-400',
};

export default function ExercisePicker({ onSelect, placeholder = 'Buscar ejercicio RV o biblioteca...' }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newCategoria, setNewCategoria] = useState('AUXILIAR');
  const [savingNew, setSavingNew] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (!query.trim()) { setResults([]); setOpen(false); return; }

    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token') ?? '';
        const res = await fetch(`/api/ejercicios/buscar?q=${encodeURIComponent(query)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setResults(data.results ?? []);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (r: Result) => {
    onSelect(r);
    setQuery('');
    setResults([]);
    setOpen(false);
    setCreating(false);
  };

  const handleCreateNew = async () => {
    setSavingNew(true);
    try {
      const token = localStorage.getItem('token') ?? '';
      const res = await fetch('/api/ejercicios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ nombre: query.trim(), categoria: newCategoria }),
      });
      if (!res.ok) return;
      const data = await res.json();
      handleSelect({
        id: data.id,
        fuente: 'biblioteca',
        nombre: data.nombre,
        altNombre: null,
        tipo: data.categoria,
        movimiento: null,
        rank: null,
        videoUrl: data.videoUrl ?? null,
        cargaRef: null,
        notas: data.descripcion ?? null,
      });
    } finally {
      setSavingNew(false);
      setCreating(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF4500] pr-8"
        />
        {loading && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">···</span>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto">
          {/* RV results */}
          {results.filter(r => r.fuente === 'rv').length > 0 && (
            <>
              <p className="px-3 py-1.5 text-[10px] text-gray-600 uppercase tracking-wider font-semibold bg-gray-950 border-b border-gray-800">
                Método RV
              </p>
              {results.filter(r => r.fuente === 'rv').map(r => (
                <button
                  key={r.id}
                  onMouseDown={() => handleSelect(r)}
                  className="w-full px-3 py-2.5 text-left hover:bg-gray-800 transition-colors border-b border-gray-800/50 flex items-start gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white truncate">{r.nombre}</span>
                      {r.rank && <span className={`text-xs font-bold ${RANK_COLOR[r.rank] ?? 'text-gray-400'}`}>{r.rank}</span>}
                      {r.movimiento && <span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">{MOV_LABEL[r.movimiento] ?? r.movimiento}</span>}
                    </div>
                    {r.altNombre && <p className="text-xs text-gray-500 truncate">{r.altNombre}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {r.videoUrl && <span className="text-green-400 text-xs" title="Tiene video">▶</span>}
                    <span className="text-[10px] text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded">{r.tipo.charAt(0) + r.tipo.slice(1).toLowerCase()}</span>
                  </div>
                </button>
              ))}
            </>
          )}

          {/* Biblioteca results */}
          {results.filter(r => r.fuente === 'biblioteca').length > 0 && (
            <>
              <p className="px-3 py-1.5 text-[10px] text-gray-600 uppercase tracking-wider font-semibold bg-gray-950 border-b border-gray-800">
                Tu biblioteca
              </p>
              {results.filter(r => r.fuente === 'biblioteca').map(r => (
                <button
                  key={r.id}
                  onMouseDown={() => handleSelect(r)}
                  className="w-full px-3 py-2.5 text-left hover:bg-gray-800 transition-colors border-b border-gray-800/50 flex items-start gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-white">{r.nombre}</span>
                    {r.notas && <p className="text-xs text-gray-500 truncate mt-0.5">{r.notas}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {r.videoUrl && <span className="text-green-400 text-xs" title="Tiene video">▶</span>}
                    <span className="text-[10px] text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded">{r.tipo.charAt(0) + r.tipo.slice(1).toLowerCase()}</span>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      )}

      {open && results.length === 0 && !loading && query.trim() && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden animate-pop-in">
          <p className="px-3 py-2.5 text-xs text-gray-500">
            Sin resultados para <span className="text-white">&quot;{query}&quot;</span>
          </p>
          <div className="border-t border-gray-800 px-3 pb-3 pt-2.5 space-y-2">
            {!creating ? (
              <button
                onMouseDown={e => { e.preventDefault(); setCreating(true); }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 hover:bg-[#FF4500]/10 border border-gray-700 hover:border-[#FF4500]/40 text-left transition-all duration-150 group"
              >
                <span className="text-[#FF4500] text-base font-bold group-hover:scale-110 transition-transform">+</span>
                <div>
                  <p className="text-xs font-semibold text-white">Crear &quot;{query.trim()}&quot;</p>
                  <p className="text-[10px] text-gray-500">Agregar a tu biblioteca</p>
                </div>
              </button>
            ) : (
              <div className="space-y-2 animate-pop-in">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Nuevo ejercicio</p>
                <p className="text-xs text-white font-semibold truncate">{query.trim()}</p>
                <div>
                  <label className="text-[10px] text-gray-500 block mb-1">Categoría</label>
                  <select
                    value={newCategoria}
                    onChange={e => setNewCategoria(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#FF4500]"
                  >
                    <option value="COMPETITIVO">Competitivo</option>
                    <option value="VARIANTE">Variante</option>
                    <option value="AUXILIAR">Auxiliar</option>
                    <option value="COMPENSATORIO">Compensatorio</option>
                    <option value="MOVILIDAD">Movilidad</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onMouseDown={e => { e.preventDefault(); handleCreateNew(); }}
                    disabled={savingNew}
                    className="flex-1 px-3 py-1.5 bg-[#FF4500] hover:bg-[#e03d00] text-white text-xs font-bold rounded transition-colors disabled:opacity-50"
                  >
                    {savingNew ? 'Creando...' : 'Crear y agregar'}
                  </button>
                  <button
                    onMouseDown={e => { e.preventDefault(); setCreating(false); }}
                    className="px-3 py-1.5 text-gray-400 hover:text-white text-xs transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
