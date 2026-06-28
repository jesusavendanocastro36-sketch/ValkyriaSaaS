'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type FatigaEstado = 'VERDE' | 'AMARILLA' | 'ROJA';

type AtletaResumen = {
  id: string;
  nombre: string;
  activo: boolean;
  estadoFatiga: FatigaEstado;
  rpe7dias: number;
  ultimaSesion: string | null;
  sesionesEstaSemana: number;
  bloqueActual: { nombre: string; enfasis: string } | null;
};

type Recomendacion = {
  id: string;
  athleteNombre: string;
  tipo: string;
  descripcion: string;
};

type ActividadEntry = {
  athleteNombre: string;
  athleteId: string;
  fecha: string;
  rpePromedio: number;
  sets: number;
};

type DashboardData = {
  stats: {
    atletasActivos: number;
    sesionesEstaSemana: number;
    tonelajeSemana: number;
    alertasFatiga: number;
    periodizacionesActivas: number;
    recomendacionesPendientes: number;
  };
  atletas: AtletaResumen[];
  recomendacionesPendientes: Recomendacion[];
  actividadReciente: ActividadEntry[];
};

const TIPO_LABEL: Record<string, string> = {
  AJUSTE_RPE: 'Ajuste RPE',
  CAMBIO_VOLUMEN: 'Vol.',
  CAMBIO_EJERCICIO: 'Ejercicio',
  RECUPERACION: 'Recuperación',
  MOVILIDAD: 'Movilidad',
  TECNICA: 'Técnica',
};

const FATIGA_CFG = {
  VERDE:    { ring: 'ring-green-500/40',  dot: 'bg-green-400',  text: 'text-green-400',  label: 'Óptimo',      bg: 'bg-green-500/10' },
  AMARILLA: { ring: 'ring-yellow-500/40', dot: 'bg-yellow-400', text: 'text-yellow-400', label: 'Precaución',  bg: 'bg-yellow-500/10' },
  ROJA:     { ring: 'ring-red-500/40',    dot: 'bg-red-400',    text: 'text-red-400',    label: 'Alto riesgo', bg: 'bg-red-500/10' },
};

const ENFASIS_COLOR: Record<string, { bg: string; text: string }> = {
  Hipertrofia:   { bg: 'bg-purple-500/20', text: 'text-purple-300' },
  'Fuerza Base': { bg: 'bg-blue-500/20',   text: 'text-blue-300' },
  Volumen:       { bg: 'bg-cyan-500/20',    text: 'text-cyan-300' },
  Peaking:       { bg: 'bg-[#FF4500]/20',  text: 'text-[#FF4500]' },
  Tapering:      { bg: 'bg-gray-500/20',   text: 'text-gray-400' },
};

const STATS_CFG = [
  { key: 'atletasActivos',            label: 'Atletas activos',  sub: (v: number, d: DashboardData) => `${d.stats.periodizacionesActivas} con plan` },
  { key: 'sesionesEstaSemana',        label: 'Sesiones / sem.',  sub: () => 'días entrenados' },
  { key: 'tonelajeSemana',            label: 'Tonelaje',         sub: () => 'kg totales', fmt: (v: number) => `${(v/1000).toFixed(1)}t` },
  { key: 'alertasFatiga',             label: 'Alertas fatiga',   sub: () => 'RPE > 8.5', alert: true, href: '/admin/atletas' },
  { key: 'recomendacionesPendientes', label: 'Recomendaciones',  sub: () => 'pendientes', href: '/admin/recomendaciones' },
  { key: 'periodizacionesActivas',    label: 'Planes activos',   sub: () => 'en curso', href: '/admin/periodizaciones' },
];

function relDate(iso: string | null): string {
  if (!iso) return 'Sin sesiones';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  if (diff < 7) return `Hace ${diff}d`;
  return new Date(iso).toLocaleDateString('es', { day: '2-digit', month: 'short' });
}

function fmtFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es', { weekday: 'short', day: '2-digit', month: 'short' });
}

function SessionDots({ count }: { count: number }) {
  return (
    <div className="flex gap-1 items-center">
      {[1, 2, 3, 4].map(i => (
        <span
          key={i}
          className={`w-1.5 h-1.5 rounded-full ${i <= count ? 'bg-[#FF4500]' : 'bg-gray-700'}`}
        />
      ))}
    </div>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [nombre, setNombre] = useState('');
  const [loading, setLoading] = useState(true);

  const [cupos, setCupos] = useState<number | null>(null);
  const [cuposEdit, setCuposEdit] = useState('');
  const [savingCupos, setSavingCupos] = useState(false);
  const [cuposMsg, setCuposMsg] = useState('');

  const [precio, setPrecio] = useState<number | null>(null);
  const [precioEdit, setPrecioEdit] = useState('');
  const [savingPrecio, setSavingPrecio] = useState(false);
  const [precioMsg, setPrecioMsg] = useState('');

  useEffect(() => {
    const rol = localStorage.getItem('rol');
    if (rol !== 'ADMIN') { router.push('/login'); return; }
    setNombre(localStorage.getItem('nombre') ?? 'Coach');

    const token = localStorage.getItem('token');
    fetch('/api/admin/dashboard', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));

    fetch('/api/admin/cupos', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.cupos !== undefined) { setCupos(d.cupos); setCuposEdit(String(d.cupos)); } });

    fetch('/api/admin/precio', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.precio !== undefined) { setPrecio(d.precio); setPrecioEdit(String(d.precio)); } });
  }, [router]);

  const handleSavePrecio = async () => {
    const val = parseFloat(precioEdit);
    if (isNaN(val) || val < 0) return;
    setSavingPrecio(true);
    setPrecioMsg('');
    const token = localStorage.getItem('token');
    const res = await fetch('/api/admin/precio', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ precio: val }),
    });
    if (res.ok) { setPrecio(val); setPrecioMsg('Guardado'); setTimeout(() => setPrecioMsg(''), 2500); }
    else setPrecioMsg('Error al guardar');
    setSavingPrecio(false);
  };

  const handleSaveCupos = async () => {
    const val = parseInt(cuposEdit);
    if (isNaN(val) || val < 0) return;
    setSavingCupos(true);
    setCuposMsg('');
    const token = localStorage.getItem('token');
    const res = await fetch('/api/admin/cupos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ cupos: val }),
    });
    if (res.ok) { setCupos(val); setCuposMsg('Guardado'); setTimeout(() => setCuposMsg(''), 2500); }
    else setCuposMsg('Error al guardar');
    setSavingCupos(false);
  };

  const hora = new Date().getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="text-gray-500 text-sm mb-1">{saludo},</p>
            <h1 className="text-3xl font-bold tracking-tight">{nombre}</h1>
          </div>
          <Link
            href="/admin/periodizaciones/nueva-ia"
            className="px-4 py-2.5 bg-[#FF4500] hover:bg-[#e03d00] text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Nuevo plan IA
          </Link>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          {STATS_CFG.map(cfg => {
            const raw = data?.stats[cfg.key as keyof typeof data.stats] ?? 0;
            const display = loading ? '—' : cfg.fmt ? cfg.fmt(raw) : String(raw);
            const isAlert = cfg.alert && raw > 0;
            const inner = (
              <div className={`rounded-xl px-4 py-4 border h-full transition-all ${
                isAlert
                  ? 'bg-red-900/20 border-red-700/40'
                  : cfg.href
                  ? 'bg-[#0f0f0f] border-gray-800 hover:border-gray-700 hover:bg-[#141414]'
                  : 'bg-[#0f0f0f] border-gray-800'
              }`}>
                <p className={`text-2xl font-bold tabular-nums ${isAlert ? 'text-red-400' : 'text-[#FF4500]'}`}>
                  {display}
                </p>
                <p className="text-xs text-gray-500 mt-1.5 leading-tight">{cfg.label}</p>
              </div>
            );
            return cfg.href
              ? <Link key={cfg.key} href={cfg.href}>{inner}</Link>
              : <div key={cfg.key}>{inner}</div>;
          })}
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Left — 2/3 */}
          <div className="lg:col-span-2 space-y-5">

            {/* Athletes */}
            <section className="bg-[#0f0f0f] border border-gray-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-800/60 flex justify-between items-center">
                <div>
                  <p className="font-semibold text-sm">Estado de atletas</p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {!loading && data ? `${data.atletas.filter(a => a.activo).length} activos` : ''}
                  </p>
                </div>
                <Link href="/admin/atletas" className="text-xs text-gray-600 hover:text-white transition-colors px-3 py-1.5 bg-gray-800/50 hover:bg-gray-800 rounded-lg">
                  Ver todos →
                </Link>
              </div>

              {loading ? (
                <div className="px-5 py-10 text-gray-700 text-sm text-center">Cargando...</div>
              ) : !data?.atletas.length ? (
                <div className="px-5 py-10 text-gray-700 text-sm text-center">Sin atletas registrados</div>
              ) : (
                <div className="divide-y divide-gray-800/40">
                  {data.atletas.map(a => {
                    const f = FATIGA_CFG[a.estadoFatiga];
                    const enfCfg = a.bloqueActual ? (ENFASIS_COLOR[a.bloqueActual.enfasis] ?? ENFASIS_COLOR['Tapering']) : null;
                    return (
                      <div key={a.id} className="px-5 py-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors group">

                        {/* Avatar with fatigue ring */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ring-2 ${f.ring} ${
                          a.activo ? 'bg-[#FF4500]/15 text-[#FF4500]' : 'bg-gray-800/60 text-gray-600'
                        }`}>
                          {a.nombre[0].toUpperCase()}
                        </div>

                        {/* Main info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm">{a.nombre}</p>
                            {enfCfg && a.bloqueActual && (
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${enfCfg.bg} ${enfCfg.text}`}>
                                {a.bloqueActual.enfasis}
                              </span>
                            )}
                            {!a.activo && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-500">Inactivo</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1.5">
                            <p className="text-xs text-gray-600">{relDate(a.ultimaSesion)}</p>
                            <SessionDots count={a.sesionesEstaSemana} />
                            <p className="text-[10px] text-gray-700">{a.sesionesEstaSemana}/4 sem.</p>
                          </div>
                        </div>

                        {/* RPE + action */}
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            {a.rpe7dias > 0 ? (
                              <>
                                <p className={`text-sm font-bold tabular-nums ${f.text}`}>
                                  {a.rpe7dias}
                                </p>
                                <p className="text-[10px] text-gray-600">RPE 7d</p>
                              </>
                            ) : (
                              <p className="text-xs text-gray-700">Sin datos</p>
                            )}
                          </div>
                          <Link
                            href={`/admin/atletas/${a.id}/progreso`}
                            className="text-xs px-3 py-1.5 bg-gray-800/60 hover:bg-gray-700 text-gray-500 hover:text-white rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          >
                            Ver
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Recent activity */}
            <section className="bg-[#0f0f0f] border border-gray-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-800/60">
                <p className="font-semibold text-sm">Actividad reciente</p>
                <p className="text-xs text-gray-600 mt-0.5">Últimas sesiones completadas</p>
              </div>

              {loading ? (
                <div className="px-5 py-10 text-gray-700 text-sm text-center">Cargando...</div>
              ) : !data?.actividadReciente.length ? (
                <div className="px-5 py-10 text-gray-700 text-sm text-center">
                  Sin actividad en los últimos 14 días
                </div>
              ) : (
                <div className="divide-y divide-gray-800/40">
                  {data.actividadReciente.map((entry, i) => {
                    const rpe = entry.rpePromedio;
                    const rpeColor = rpe >= 8.8 ? 'text-red-400' : rpe >= 8.5 ? 'text-yellow-400' : 'text-green-400';
                    const rpeBg   = rpe >= 8.8 ? 'bg-red-500/10' : rpe >= 8.5 ? 'bg-yellow-500/10' : 'bg-green-500/10';
                    return (
                      <div key={i} className="px-5 py-3.5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#FF4500]/10 flex items-center justify-center text-[#FF4500] font-bold text-xs shrink-0">
                            {entry.athleteNombre[0]}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{entry.athleteNombre}</p>
                            <p className="text-xs text-gray-600">{fmtFecha(entry.fecha)} · {entry.sets} sets</p>
                          </div>
                        </div>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${rpeBg} ${rpeColor} tabular-nums`}>
                          RPE {rpe}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* Right column */}
          <div className="space-y-5">

            {/* Pending recommendations */}
            <section className="bg-[#0f0f0f] border border-gray-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-800/60 flex justify-between items-center">
                <div>
                  <p className="font-semibold text-sm">Recomendaciones IA</p>
                  {!loading && !!data?.stats.recomendacionesPendientes && (
                    <p className="text-xs text-[#FF4500] mt-0.5">{data.stats.recomendacionesPendientes} pendientes</p>
                  )}
                </div>
                <Link href="/admin/recomendaciones" className="text-xs text-gray-600 hover:text-white transition-colors">
                  Ver todas →
                </Link>
              </div>

              {loading ? (
                <div className="px-5 py-8 text-gray-700 text-sm text-center">Cargando...</div>
              ) : !data?.recomendacionesPendientes.length ? (
                <div className="px-5 py-7 text-center">
                  <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-2">
                    <span className="text-green-400 text-sm">✓</span>
                  </div>
                  <p className="text-green-400 text-sm font-semibold">Al día</p>
                  <p className="text-gray-700 text-xs mt-1">Sin pendientes</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-800/40">
                  {data.recomendacionesPendientes.map(r => (
                    <div key={r.id} className="px-5 py-3.5">
                      <div className="flex items-center gap-2 mb-1.5">
                        <p className="text-sm font-semibold">{r.athleteNombre}</p>
                        <span className="text-[10px] bg-[#FF4500]/10 text-[#FF4500] px-1.5 py-0.5 rounded-full font-medium">
                          {TIPO_LABEL[r.tipo] ?? r.tipo}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{r.descripcion}</p>
                    </div>
                  ))}
                  <div className="px-5 py-3">
                    <Link href="/admin/recomendaciones"
                      className="text-xs text-[#FF4500] hover:text-[#FFB800] transition-colors font-semibold">
                      Revisar y aprobar →
                    </Link>
                  </div>
                </div>
              )}
            </section>

            {/* Quick access */}
            <section className="bg-[#0f0f0f] border border-gray-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-800/60">
                <p className="font-semibold text-sm">Acceso rápido</p>
              </div>
              <div className="p-3 space-y-1.5">
                {[
                  { label: 'Generar plan con IA',   href: '/admin/periodizaciones/nueva-ia', accent: true },
                  { label: 'Plan manual',           href: '/admin/periodizaciones/nueva' },
                  { label: 'Biblioteca ejercicios', href: '/admin/ejercicios' },
                  { label: 'Mensajes atletas',      href: '/admin/mensajes' },
                  { label: 'Informes',              href: '/admin/reportes' },
                ].map(l => (
                  <Link key={l.label} href={l.href}
                    className={`flex items-center px-3 py-2.5 rounded-xl transition-colors group ${
                      l.accent
                        ? 'bg-[#FF4500]/10 hover:bg-[#FF4500]/20'
                        : 'hover:bg-gray-800/60'
                    }`}>
                    <span className={`text-xs font-medium ${l.accent ? 'text-[#FF4500]' : 'text-gray-500 group-hover:text-white'} transition-colors`}>
                      {l.label}
                    </span>
                  </Link>
                ))}
              </div>
            </section>

            {/* Configuración de página */}
            <section className="bg-[#0f0f0f] border border-gray-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-800/60">
                <p className="font-semibold text-sm">Página oficial</p>
                <p className="text-[11px] text-gray-600 mt-0.5">Cupos y precio visibles para nuevos atletas</p>
              </div>
              <div className="p-5 space-y-4">
                {/* Cupos */}
                <div>
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Cupos disponibles</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      value={cuposEdit}
                      onChange={e => setCuposEdit(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSaveCupos()}
                      placeholder={cupos !== null ? String(cupos) : '0'}
                      className="w-24 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-[#FF4500]"
                    />
                    <button
                      onClick={handleSaveCupos}
                      disabled={savingCupos}
                      className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors"
                    >
                      {savingCupos ? '...' : 'Guardar'}
                    </button>
                    {cuposMsg && (
                      <span className={`text-xs font-medium ${cuposMsg === 'Guardado' ? 'text-green-400' : 'text-red-400'}`}>
                        {cuposMsg}
                      </span>
                    )}
                  </div>
                </div>

                {/* Precio */}
                <div>
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Precio mensual</p>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 gap-1 focus-within:border-[#FF4500] transition-colors w-24">
                      <span className="text-xs text-gray-500">S/</span>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={precioEdit}
                        onChange={e => setPrecioEdit(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSavePrecio()}
                        className="w-full bg-transparent text-white text-sm font-mono focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={handleSavePrecio}
                      disabled={savingPrecio}
                      className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors"
                    >
                      {savingPrecio ? '...' : 'Guardar'}
                    </button>
                    {precioMsg && (
                      <span className={`text-xs font-medium ${precioMsg === 'Guardado' ? 'text-green-400' : 'text-red-400'}`}>
                        {precioMsg}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}
