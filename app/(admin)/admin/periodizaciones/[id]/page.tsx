'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import SesionCard from '@/app/components/periodizacion/SesionCard';

// Tabs secundarios: se cargan bajo demanda cuando el coach los abre
const tabFallback = () => <p className="text-gray-600 text-sm py-8 text-center">Cargando…</p>;
const SplitPanel = dynamic(() => import('@/app/components/periodizacion/SplitPanel'), { loading: tabFallback });
const CalendarioTab = dynamic(() => import('@/app/components/periodizacion/CalendarioTab'), { loading: tabFallback });
const VolumenSemanalTab = dynamic(() => import('@/app/components/periodizacion/VolumenSemanalTab'), { loading: tabFallback });
const IntentosSelector = dynamic(() => import('@/app/components/periodizacion/IntentosSelector'), { loading: tabFallback });
import {
  type Sesion, type Bloque, type Periodizacion, type PctEntry,
  type TaperingResult, type EfectividadBloque, type BasicoMovimiento, type FaseBasico,
  TIPO_LABEL, ESTADO_COLOR, DIA_MAP, DIAS, DEFAULT_PCT, BLANK_SESION,
} from '@/app/components/periodizacion/shared';
import { useUIStore } from '@/lib/store/ui-store';

export default function PeriodizacionDetallePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [plan, setPlan] = useState<Periodizacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [bloqueAbierto, setBloqueAbierto] = useState<string | null>(null);
  const [sesionAbierta, setSesionAbierta] = useState<string | null>(null);
  const [publicando, setPublicando] = useState(false);
  const [activeTab, setActiveTab] = useState<'bloques' | 'calendario' | 'progresion' | 'competencia' | 'efectividad' | 'volumen' | 'planificacion'>('bloques');
  const [tabBasicoPlan, setTabBasicoPlan] = useState<BasicoMovimiento>('SENTADILLA');
  const [fasesBasico, setFasesBasico] = useState<FaseBasico[]>([]);
  const [addFaseForm, setAddFaseForm] = useState({ bloque: 'HIPERTROFIA', semanaInicio: 1, semanaFin: 2, rpeMin: 7, rpeMax: 8, porcentajeRmMin: '', porcentajeRmMax: '', repsMin: '', repsMax: '', notas: '' });
  const [savingFase, setSavingFase] = useState(false);
  const [deletingFaseId, setDeletingFaseId] = useState<string | null>(null);

  // Session creation
  const [addSesionBloqueId, setAddSesionBloqueId] = useState<string | null>(null);
  const [sesionForm, setSesionForm] = useState({ ...BLANK_SESION });
  const [savingSesion, setSavingSesion] = useState(false);

  // Block edit / delete
  const [editBloqueId, setEditBloqueId] = useState<string | null>(null);
  const [bloqueForm, setBloqueForm] = useState({ nombre: '', semana_inicio: 1, semana_fin: 1, enfasis: '', intensidad_rpe_min: 7, intensidad_rpe_max: 8 });
  const [savingBloque, setSavingBloque] = useState(false);
  const [deletingBloqueId, setDeletingBloqueId] = useState<string | null>(null);

  // Block create / copy-paste / reorder
  const BLANK_BLOQUE = { nombre: '', semana_inicio: 1, semana_fin: 1, enfasis: 'Hipertrofia', intensidad_rpe_min: 7, intensidad_rpe_max: 8 };
  const [addBlockOpen, setAddBlockOpen] = useState(false);
  const [newBloqueForm, setNewBloqueForm] = useState({ ...BLANK_BLOQUE });
  const [savingNewBloque, setSavingNewBloque] = useState(false);
  const [copiedBloque, setCopiedBloque] = useState<{ id: string; nombre: string } | null>(null);
  const [pasting, setPasting] = useState(false);
  const [reorderingId, setReorderingId] = useState<string | null>(null);

  // Block effectiveness
  const [efectividad, setEfectividad] = useState<EfectividadBloque[] | null>(null);
  const [loadingEfectividad, setLoadingEfectividad] = useState(false);

  // Session completion tracking
  const [completadas, setCompletadas] = useState<Set<string>>(new Set());

  // Competition + tapering state
  const [fechaComp, setFechaComp] = useState('');
  const [savingFecha, setSavingFecha] = useState(false);
  const [generandoTapering, setGenerandoTapering] = useState(false);
  const [taperingResult, setTaperingResult] = useState<TaperingResult | null>(null);
  const [taperingError, setTaperingError] = useState('');

  // Progression builder state
  const [rms, setRms] = useState({ sq: 0, bp: 0, dl: 0 });
  const [savingRms, setSavingRms] = useState(false);
  const [pctConfig, setPctConfig] = useState<Record<string, PctEntry>>({});
  const [applyingPct, setApplyingPct] = useState(false);
  const [applyMsg, setApplyMsg] = useState('');

  // Week access control
  const [semanaMax, setSemanaMax] = useState<number | null>(null);
  const [savingAcceso, setSavingAcceso] = useState(false);

  // Lock week
  const [lockingWeek, setLockingWeek] = useState<string | null>(null); // `${bloqueId}-${semana}`

  // Split view
  const splitView = useUIStore(s => s.splitView);
  const setSplitView = useUIStore(s => s.setSplitView);
  const [splitBloqueId, setSplitBloqueId] = useState<string | null>(null);
  const [splitSemana, setSplitSemana] = useState<number>(1);

  const handleToggleSemana = async (sesiones: Sesion[]) => {
    const key = `${sesiones[0]?.id}`;
    setLockingWeek(key);
    const allLocked = sesiones.every(s => s.bloqueado);
    const newValue = !allLocked;
    await Promise.all(sesiones.map(s =>
      fetch(`/api/sesiones/${s.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ bloqueado: newValue }),
      })
    ));
    setLockingWeek(null);
    reload();
  };

  // Copy week
  const [copyingFrom, setCopyingFrom] = useState<{ bloqueId: string; semana: number } | null>(null);
  const [copyTarget, setCopyTarget] = useState<number>(1);
  const [copyLoading, setCopyLoading] = useState(false);
  const [copyMsg, setCopyMsg] = useState('');

  const handleCopiarSemana = async () => {
    if (!copyingFrom) return;
    if (copyTarget === copyingFrom.semana) { setCopyMsg('Elige una semana diferente'); return; }
    setCopyLoading(true);
    setCopyMsg('');
    try {
      const res = await fetch(`/api/periodizaciones/${id}/copiar-semana`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ bloqueId: copyingFrom.bloqueId, semanaOrigen: copyingFrom.semana, semanaDestino: copyTarget }),
      });
      const data = await res.json();
      if (!res.ok) { setCopyMsg(data.error ?? 'Error al copiar'); return; }
      setCopyMsg(`Copiada: ${data.sesionesCopiadas} sesión(es), ${data.ejerciciosCopiados} ejercicios`);
      setCopyingFrom(null);
      reload();
    } catch {
      setCopyMsg('Error al copiar');
    } finally {
      setCopyLoading(false);
    }
  };

  const handleSetAcceso = async (semana: number | null) => {
    setSavingAcceso(true);
    await Promise.all([
      fetch(`/api/periodizaciones/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ semanaMaxVisible: semana }),
      }),
      fetch(`/api/periodizaciones/${id}/sync-bloqueo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ semanaMax: semana }),
      }),
    ]);
    setSemanaMax(semana);
    setSavingAcceso(false);
    reload();
  };

  const getToken = () => localStorage.getItem('token') ?? '';

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push('/login'); return; }
    fetch(`/api/periodizaciones/${id}/completadas`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.completadas) setCompletadas(new Set(d.completadas.map((c: { sesionId: string }) => c.sesionId))); });
    fetch(`/api/periodizaciones/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d?.detail ?? d?.error ?? `Error ${r.status}`);
        return d;
      })
      .then(d => {
        if (!d?.bloques) { setFetchError('La periodización no tiene bloques.'); return; }
        setPlan(d);
        setSemanaMax(d.semanaMaxVisible ?? null);
        setFasesBasico(d.fasesBasico ?? []);
        if (d.bloques[0]) setBloqueAbierto(d.bloques[0].id);
        if (d.bloques[0]) {
          setSplitBloqueId(d.bloques[0].id);
          const sems = (Array.from(new Set(d.bloques[0].sesiones.map((s: { numeroSemana: number }) => s.numeroSemana))) as number[]).sort((a, b) => a - b);
          setSplitSemana((sems[1] ?? sems[0] ?? 1) as number);
        }
        if (d.fechaCompetencia) setFechaComp(d.fechaCompetencia.slice(0, 10));
        setRms({
          sq: d.athlete?.rmSquat ?? 0,
          bp: d.athlete?.rmBench ?? 0,
          dl: d.athlete?.rmDeadlift ?? 0,
        });
        const weeks = d.duracionSemanas ?? 5;
        const saved = d.progresionPct;
        const cfg: Record<string, PctEntry> = {};
        for (let w = 1; w <= weeks; w++) {
          cfg[String(w)] = saved?.[String(w)] ?? DEFAULT_PCT[w - 1] ?? { sq: 0, bp: 0, dl: 0 };
        }
        setPctConfig(cfg);
      })
      .catch(e => setFetchError(String(e.message ?? e)))
      .finally(() => setLoading(false));
  }, [id, router]);

  useEffect(() => {
    if (activeTab !== 'efectividad' || efectividad !== null) return;
    setLoadingEfectividad(true);
    fetch(`/api/periodizaciones/${id}/efectividad`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json())
      .then(d => setEfectividad(d.bloques ?? []))
      .finally(() => setLoadingEfectividad(false));
  }, [activeTab, id, efectividad]);

  const reload = useCallback(() => {
    fetch(`/api/periodizaciones/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token') ?? ''}` } })
      .then(r => r.json())
      .then(d => { if (d.bloques) setPlan(d); });
  }, [id]);

  // Bloque copiado (persistido para poder pegar entre periodizaciones distintas)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('valkyria_copied_bloque');
      if (raw) setCopiedBloque(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  const toggleSesion = useCallback(
    (sid: string) => setSesionAbierta(p => (p === sid ? null : sid)),
    []
  );

  const allSesionesFlat = useMemo(
    () => (plan?.bloques ?? []).flatMap(b => b.sesiones.map(s => ({ id: s.id, semana: s.numeroSemana, dia: s.diaSemana }))),
    [plan]
  );

  const handlePublicar = async () => {
    if (!plan || plan.estado !== 'DRAFT') return;
    setPublicando(true);
    const res = await fetch(`/api/periodizaciones/${id}/publicar`, {
      method: 'POST', headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (res.ok) setPlan(p => p ? { ...p, estado: 'ACTIVE' } : p);
    setPublicando(false);
  };

  const handleAddSesion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addSesionBloqueId) return;
    setSavingSesion(true);
    await fetch('/api/sesiones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ bloque_id: addSesionBloqueId, ...sesionForm, numero_semana: Number(sesionForm.numero_semana), orden_secuencia: Number(sesionForm.orden_secuencia) }),
    });
    setSavingSesion(false);
    setAddSesionBloqueId(null);
    setSesionForm({ ...BLANK_SESION });
    reload();
  };

  const handleSaveFechaComp = async () => {
    setSavingFecha(true);
    await fetch(`/api/periodizaciones/${id}/tapering`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ fechaCompetencia: fechaComp || null }),
    });
    setPlan(p => p ? { ...p, fechaCompetencia: fechaComp || null } : p);
    setSavingFecha(false);
  };

  const handleGenerarTapering = async () => {
    setGenerandoTapering(true);
    setTaperingError('');
    setTaperingResult(null);
    try {
      const res = await fetch(`/api/periodizaciones/${id}/tapering`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setTaperingError(data.error ?? 'Error generando tapering');
      } else {
        setTaperingResult(data);
        reload();
      }
    } catch {
      setTaperingError('Error de conexión');
    }
    setGenerandoTapering(false);
  };

  const handleSaveRms = async () => {
    if (!plan) return;
    setSavingRms(true);
    await fetch(`/api/atletas/${plan.athlete.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({
        rmSquat: rms.sq || null,
        rmBench: rms.bp || null,
        rmDeadlift: rms.dl || null,
      }),
    });
    setSavingRms(false);
  };

  const handleEditBloque = (bloque: Bloque) => {
    setEditBloqueId(bloque.id);
    setBloqueForm({
      nombre: bloque.nombre,
      semana_inicio: bloque.semanaInicio,
      semana_fin: bloque.semanaFin,
      enfasis: bloque.enfasis,
      intensidad_rpe_min: bloque.intensidadRpeMin,
      intensidad_rpe_max: bloque.intensidadRpeMax,
    });
  };

  const handleSaveBloque = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBloqueId) return;
    setSavingBloque(true);
    await fetch(`/api/bloques/${editBloqueId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(bloqueForm),
    });
    setSavingBloque(false);
    setEditBloqueId(null);
    reload();
  };

  const handleDeleteBloque = async (bloqueId: string) => {
    if (!confirm('¿Eliminar este bloque y todas sus sesiones?')) return;
    setDeletingBloqueId(bloqueId);
    await fetch(`/api/bloques/${bloqueId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    setDeletingBloqueId(null);
    reload();
  };

  // Siguiente numeroBloque disponible (va al final de la lista)
  const nextNumeroBloque = () =>
    Math.max(0, ...(plan?.bloques ?? []).map(b => b.numeroBloque)) + 1;

  const handleAddBloque = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingNewBloque(true);
    await fetch('/api/bloques', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({
        periodizacion_id: id,
        numero_bloque: nextNumeroBloque(),
        nombre: newBloqueForm.nombre,
        semana_inicio: newBloqueForm.semana_inicio,
        semana_fin: newBloqueForm.semana_fin,
        enfasis: newBloqueForm.enfasis,
        intensidad_rpe_min: newBloqueForm.intensidad_rpe_min,
        intensidad_rpe_max: newBloqueForm.intensidad_rpe_max,
      }),
    });
    setSavingNewBloque(false);
    setAddBlockOpen(false);
    setNewBloqueForm({ ...BLANK_BLOQUE });
    reload();
  };

  const handleCopyBloque = (bloque: Bloque) => {
    const payload = { id: bloque.id, nombre: bloque.nombre };
    setCopiedBloque(payload);
    try { localStorage.setItem('valkyria_copied_bloque', JSON.stringify(payload)); } catch { /* ignore */ }
  };

  const handlePasteBloque = async () => {
    if (!copiedBloque) return;
    setPasting(true);
    const res = await fetch(`/api/bloques/${copiedBloque.id}/duplicar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ periodizacion_id: id }),
    });
    setPasting(false);
    if (res.ok) reload();
    else alert('No se pudo pegar el bloque (¿el bloque copiado ya no existe?).');
  };

  // Mueve un bloque arriba (-1) o abajo (+1) intercambiando su numeroBloque con el vecino
  const handleMoveBloque = async (bloque: Bloque, dir: -1 | 1) => {
    const sorted = [...(plan?.bloques ?? [])].sort((a, b) => a.numeroBloque - b.numeroBloque);
    const idx = sorted.findIndex(b => b.id === bloque.id);
    const neighbor = sorted[idx + dir];
    if (!neighbor) return;
    setReorderingId(bloque.id);
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` };
    await Promise.all([
      fetch(`/api/bloques/${bloque.id}`,   { method: 'PUT', headers, body: JSON.stringify({ numero_bloque: neighbor.numeroBloque }) }),
      fetch(`/api/bloques/${neighbor.id}`, { method: 'PUT', headers, body: JSON.stringify({ numero_bloque: bloque.numeroBloque }) }),
    ]);
    setReorderingId(null);
    reload();
  };

  const handleApplyPct = async () => {
    setApplyingPct(true);
    setApplyMsg('');
    const res = await fetch(`/api/periodizaciones/${id}/progresion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ pct: pctConfig, save_config: true }),
    });
    const data = await res.json();
    setApplyingPct(false);
    setApplyMsg(`${data.updated} ejercicio${data.updated !== 1 ? 's' : ''} actualizado${data.updated !== 1 ? 's' : ''}`);
    reload();
    setTimeout(() => setApplyMsg(''), 4000);
  };

  const handleDescargar = () => {
    if (!plan) return;

    const TIPO_FULL: Record<string, string> = {
      LINEAL: 'Lineal', ONDULANTE: 'Ondulante (DUP)', CONJUGADA: 'Conjugada', POR_BLOQUES: 'Por Bloques',
    };
    const TIPO_COLOR: Record<string, string> = {
      COMPETITIVO: '#dc2626', VARIANTE: '#2563eb', AUXILIAR: '#ea580c',
      COMPENSATORIO: '#9333ea', MOVILIDAD: '#16a34a',
    };

    const fmt = (d: string) => new Date(d).toLocaleDateString('es', { day: '2-digit', month: 'long', year: 'numeric' });

    const rows = plan.bloques
      .sort((a, b) => a.numeroBloque - b.numeroBloque)
      .map(bloque => {
        const semanas = [...new Set(bloque.sesiones.map(s => s.numeroSemana))].sort((a, b) => a - b);
        const semanasHtml = semanas.map(sem => {
          const sesiones = bloque.sesiones
            .filter(s => s.numeroSemana === sem)
            .sort((a, b) => (a.ordenSecuencia ?? 0) - (b.ordenSecuencia ?? 0));

          const sesionesTr = sesiones.map(sesion => {
            const ejRows = sesion.ejercicios
              .sort((a, b) => a.orden - b.orden)
              .map(ej => {
                const color = TIPO_COLOR[ej.tipoEjercicio] ?? '#6b7280';
                const peso = ej.pesoProgramado ? `${ej.pesoProgramado} kg` : '—';
                const nota = ej.notasTecnicas ? `<div style="font-size:11px;color:#6b7280;margin-top:2px">${ej.notasTecnicas}</div>` : '';
                return `
                  <tr>
                    <td style="padding:6px 8px;border:1px solid #e5e7eb;vertical-align:top">
                      <span style="color:${color};font-weight:600;font-size:10px;border:1px solid ${color};border-radius:3px;padding:1px 5px;white-space:nowrap">${ej.tipoEjercicio}</span>
                    </td>
                    <td style="padding:6px 8px;border:1px solid #e5e7eb;vertical-align:top;font-size:12px;font-weight:500">${ej.ejercicioNombre}${nota}</td>
                    <td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:center;font-size:12px;font-weight:700">${ej.setsProgramados}×${ej.repsProgramadas}</td>
                    <td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:center;font-size:12px">RPE ${ej.rpeProgramado}</td>
                    <td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:center;font-size:12px">${peso}</td>
                    <td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:center;font-size:12px">${ej.restMinutos} min</td>
                  </tr>`;
              }).join('');

            return `
              <tr style="background:#f9fafb">
                <td colspan="6" style="padding:8px 10px;border:1px solid #d1d5db">
                  <strong style="font-size:12px;color:#1f2937">${sesion.diaSemana.toUpperCase()} — ${sesion.movimientoPrincipal}</strong>
                  ${sesion.enfocuoDia ? `<span style="color:#6b7280;font-size:11px;margin-left:8px">${sesion.enfocuoDia}</span>` : ''}
                </td>
              </tr>
              <tr>
                <td colspan="6" style="padding:0">
                  <table style="width:100%;border-collapse:collapse">
                    <thead>
                      <tr style="background:#f3f4f6">
                        <th style="padding:4px 8px;border:1px solid #e5e7eb;font-size:10px;color:#6b7280;text-align:left;width:90px">Tipo</th>
                        <th style="padding:4px 8px;border:1px solid #e5e7eb;font-size:10px;color:#6b7280;text-align:left">Ejercicio</th>
                        <th style="padding:4px 8px;border:1px solid #e5e7eb;font-size:10px;color:#6b7280;text-align:center;width:60px">Sets×Reps</th>
                        <th style="padding:4px 8px;border:1px solid #e5e7eb;font-size:10px;color:#6b7280;text-align:center;width:60px">RPE</th>
                        <th style="padding:4px 8px;border:1px solid #e5e7eb;font-size:10px;color:#6b7280;text-align:center;width:60px">Peso</th>
                        <th style="padding:4px 8px;border:1px solid #e5e7eb;font-size:10px;color:#6b7280;text-align:center;width:55px">Descanso</th>
                      </tr>
                    </thead>
                    <tbody>${ejRows}</tbody>
                  </table>
                </td>
              </tr>`;
          }).join('');

          return `
            <tr>
              <td colspan="6" style="padding:0">
                <div style="background:#eff6ff;padding:6px 12px;border-left:3px solid #3b82f6;margin:8px 0 2px">
                  <strong style="font-size:12px;color:#1e40af">SEMANA ${sem}</strong>
                </div>
                <table style="width:100%;border-collapse:collapse">
                  <tbody>${sesionesTr}</tbody>
                </table>
              </td>
            </tr>`;
        }).join('');

        return `
          <div style="margin-bottom:32px;page-break-inside:avoid">
            <div style="background:#1f2937;color:white;padding:12px 16px;border-radius:6px 6px 0 0;display:flex;justify-content:space-between;align-items:center">
              <div>
                <span style="font-size:16px;font-weight:700">Bloque ${bloque.numeroBloque}: ${bloque.nombre}</span>
                <span style="font-size:12px;color:#9ca3af;margin-left:12px">${bloque.enfasis}</span>
              </div>
              <div style="font-size:12px;color:#9ca3af">
                Sem ${bloque.semanaInicio}–${bloque.semanaFin} &nbsp;·&nbsp; RPE ${bloque.intensidadRpeMin}–${bloque.intensidadRpeMax}
              </div>
            </div>
            <table style="width:100%;border-collapse:collapse;border:1px solid #d1d5db;border-top:none">
              <tbody>${semanasHtml}</tbody>
            </table>
          </div>`;
      }).join('');

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>${plan.nombre} — Valkyria</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111; background: white; padding: 32px; }
    @media print {
      body { padding: 16px; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <!-- Print button -->
  <div class="no-print" style="text-align:right;margin-bottom:20px">
    <button onclick="window.print()" style="background:#FF4500;color:white;border:none;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer">
      🖨️ Imprimir / Guardar PDF
    </button>
  </div>

  <!-- Header -->
  <div style="border-bottom:3px solid #FF4500;padding-bottom:16px;margin-bottom:24px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <h1 style="font-size:24px;font-weight:800;color:#111">${plan.nombre}</h1>
        <p style="color:#6b7280;font-size:14px;margin-top:4px">Atleta: <strong style="color:#111">${plan.athlete.user.nombre}</strong></p>
        ${plan.objetivo ? `<p style="color:#6b7280;font-size:13px;margin-top:2px">${plan.objetivo}</p>` : ''}
      </div>
      <div style="text-align:right;font-size:13px;color:#6b7280">
        <p><strong>Valkyria</strong> — Plan de Entrenamiento</p>
        <p>Generado: ${new Date().toLocaleDateString('es', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
      </div>
    </div>
  </div>

  <!-- Meta plan -->
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px">
    ${[
      ['Tipo', TIPO_FULL[plan.tipo] ?? plan.tipo],
      ['Duración', `${plan.duracionSemanas} semanas`],
      ['Inicio', fmt(plan.fechaInicio)],
      ['Fin', fmt(plan.fechaFin)],
      plan.fechaCompetencia ? ['Competencia', fmt(plan.fechaCompetencia)] : null,
    ].filter((x): x is string[] => x !== null).map(([l, v]) => `
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:10px 14px">
        <p style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;font-weight:600">${l}</p>
        <p style="font-size:14px;font-weight:700;color:#111;margin-top:2px">${v}</p>
      </div>`).join('')}
  </div>

  <!-- Ficha del atleta -->
  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px 20px;margin-bottom:28px">
    <p style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;font-weight:700;margin-bottom:12px">Ficha del atleta</p>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:12px">
      ${[
        plan.athlete.edad ? ['Edad', `${plan.athlete.edad} años`] : null,
        plan.athlete.pesoActual ? ['Peso actual', `${plan.athlete.pesoActual} kg`] : null,
        plan.athlete.altura ? ['Altura', `${plan.athlete.altura} cm`] : null,
        plan.athlete.categoriaPeso ? ['Categoría', plan.athlete.categoriaPeso] : null,
        ['Experiencia', plan.athlete.experienciaPowerlifting],
        plan.athlete.rmSquat ? ['1RM Sentadilla', `${plan.athlete.rmSquat} kg`] : null,
        plan.athlete.rmBench ? ['1RM Banca', `${plan.athlete.rmBench} kg`] : null,
        plan.athlete.rmDeadlift ? ['1RM Jalón/DL', `${plan.athlete.rmDeadlift} kg`] : null,
      ].filter((x): x is string[] => x !== null).map(([l, v]) => `
        <div>
          <p style="font-size:10px;color:#9ca3af;font-weight:600;margin-bottom:2px">${l}</p>
          <p style="font-size:13px;font-weight:700;color:#111">${v}</p>
        </div>`).join('')}
    </div>
    ${plan.athlete.lesionesActuales?.length ? `
    <div style="margin-bottom:8px">
      <span style="font-size:10px;color:#9ca3af;font-weight:600">Lesiones/restricciones: </span>
      <span style="font-size:12px;color:#dc2626">${plan.athlete.lesionesActuales.join(', ')}</span>
    </div>` : ''}
    ${plan.athlete.objetivos?.length ? `
    <div>
      <span style="font-size:10px;color:#9ca3af;font-weight:600">Objetivos: </span>
      <span style="font-size:12px;color:#374151">${plan.athlete.objetivos.join(', ')}</span>
    </div>` : ''}
  </div>

  <!-- Bloques -->
  ${rows}
</body>
</html>`;

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
  };

  if (loading) return <div className="min-h-screen bg-[#080808] flex items-center justify-center text-gray-500">Cargando...</div>;
  if (!plan) return (
    <div className="min-h-screen bg-[#080808] flex flex-col items-center justify-center gap-3">
      <p className="text-red-400 text-lg font-semibold">No se pudo cargar la periodización</p>
      {fetchError && <p className="text-gray-400 text-sm max-w-md text-center">{fetchError}</p>}
      <Link href="/admin/periodizaciones" className="text-sm text-[#FF4500] hover:underline mt-2">← Volver a periodizaciones</Link>
    </div>
  );

  const totalSemanas = (plan.bloques ?? []).flatMap(b => b.sesiones.map(s => s.numeroSemana));
  const maxSemana = totalSemanas.length > 0 ? Math.max(...totalSemanas) : plan.duracionSemanas;

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <div className={splitView ? 'max-w-[1560px] mx-auto px-4 py-8' : 'max-w-5xl mx-auto px-6 py-8'}>
        <Link href="/admin/periodizaciones" className="inline-block text-sm text-gray-500 hover:text-white transition-colors mb-6">← Periodizaciones</Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">{plan.nombre}</h1>
              <span className={`text-xs font-semibold px-2 py-1 rounded ${ESTADO_COLOR[plan.estado]}`}>{plan.estado}</span>
            </div>
            <p className="text-gray-400 text-sm">Atleta: <span className="text-white">{plan.athlete.user.nombre}</span></p>
            <p className="text-gray-500 text-sm mt-1">{plan.objetivo}</p>
          </div>
          <div className="flex gap-2 shrink-0 flex-wrap">
            {plan.estado === 'DRAFT' && (
              <button onClick={handlePublicar} disabled={publicando || (plan.bloques?.length ?? 0) === 0}
                className="px-4 py-2 bg-green-700 hover:bg-green-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50">
                {publicando ? 'Publicando...' : 'Publicar plan'}
              </button>
            )}
            <button onClick={handleDescargar}
              className="px-4 py-2 border border-gray-600 text-gray-300 hover:border-white hover:text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2">
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Descargar
            </button>
            <Link href={`/admin/reportes?atleta=${plan.athlete.id}`}
              className="px-4 py-2 border border-[#FF4500] text-[#FF4500] hover:bg-[#FF4500] hover:text-white text-sm font-semibold rounded-lg transition-colors">
              Reporte IA
            </Link>
          </div>
        </div>

        {/* Meta cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <MetaCard label="Tipo" value={TIPO_LABEL[plan.tipo] ?? plan.tipo} />
          <MetaCard label="Duración" value={`${plan.duracionSemanas} semanas`} />
          <MetaCard label="Inicio" value={new Date(plan.fechaInicio).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })} />
          <MetaCard label="Fin" value={new Date(plan.fechaFin).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })} />
        </div>

        {/* Week access control */}
        {plan.estado === 'ACTIVE' && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 mb-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="shrink-0">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Acceso del atleta</p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {semanaMax ? `Ve hasta sem. ${semanaMax} — sem. ${semanaMax + 1}+ bloqueadas` : 'Sin límite manual (por tiempo)'}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 flex-1">
                {Array.from({ length: plan.duracionSemanas }, (_, i) => i + 1).map(s => (
                  <button
                    key={s}
                    disabled={savingAcceso}
                    onClick={() => handleSetAcceso(semanaMax === s ? null : s)}
                    className={`w-9 h-9 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 ${
                      semanaMax === s
                        ? 'bg-[#FF4500] text-white'
                        : s < (semanaMax ?? 999)
                        ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        : 'bg-gray-950 text-gray-600 hover:bg-gray-800 hover:text-gray-400'
                    }`}
                  >
                    {s}
                  </button>
                ))}
                {semanaMax !== null && (
                  <button
                    disabled={savingAcceso}
                    onClick={() => handleSetAcceso(null)}
                    className="px-3 h-9 rounded-lg text-xs font-semibold text-gray-500 border border-gray-800 hover:border-gray-600 hover:text-gray-300 transition-colors disabled:opacity-50"
                  >
                    Quitar límite
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-end mb-6 border-b border-gray-800 pb-0">
          <div className="flex gap-1 overflow-x-auto flex-1">
            {([
              { key: 'bloques',       label: 'Bloques' },
              { key: 'planificacion', label: '🗓 Planificación' },
              { key: 'calendario',    label: '📅 Calendario' },
              { key: 'progresion',    label: 'Progresión' },
              { key: 'competencia',   label: '🏆 Competencia' },
              { key: 'efectividad',   label: '📊 Efectividad' },
              { key: 'volumen',       label: '📈 Series' },
            ] as const).map(({ key, label }) => (
              <button key={key}
                onClick={() => setActiveTab(key)}
                className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg transition-colors border-b-2 -mb-px whitespace-nowrap ${
                  activeTab === key
                    ? 'text-white border-[#FF4500] bg-gray-900/50'
                    : 'text-gray-500 border-transparent hover:text-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {activeTab === 'bloques' && (
            <button
              onClick={() => setSplitView(!splitView)}
              className={`hidden xl:block shrink-0 px-3 py-2.5 -mb-px text-xs font-semibold rounded-t-lg border-b-2 transition-colors whitespace-nowrap ${
                splitView
                  ? 'text-[#FFB800] border-[#FFB800] bg-[#FFB800]/5'
                  : 'text-gray-600 border-transparent hover:text-gray-400'
              }`}
            >
              ⊞ Vista doble
            </button>
          )}
        </div>

        {/* ── Tab: Calendario ── */}
        {activeTab === 'calendario' && (
          <CalendarioTab plan={plan} completadas={completadas} maxSemana={maxSemana} />
        )}

        {/* ── Tab: Bloques ── */}
        {activeTab === 'bloques' && (
          (plan.bloques ?? []).length === 0 ? (
            <div className="text-center py-16 bg-gray-900 border border-gray-800 rounded-xl text-gray-600">
              <p className="text-lg mb-2">Sin bloques</p>
              <p className="text-sm">Crea la periodización con bloques desde Nueva Periodización.</p>
            </div>
          ) : (
            <div className={splitView ? 'grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-5 items-start' : ''}>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                  {(plan.bloques ?? []).length} bloques · {maxSemana} semanas
                </p>
                <div className="flex items-center gap-2">
                  {copiedBloque && (
                    <button
                      onClick={handlePasteBloque}
                      disabled={pasting}
                      title={`Pegar "${copiedBloque.nombre}" como nuevo bloque`}
                      className="text-xs px-3 py-1.5 rounded-lg border border-[#FFB800]/40 text-[#FFB800] hover:bg-[#FFB800]/10 transition-colors disabled:opacity-50"
                    >
                      {pasting ? 'Pegando…' : `📋 Pegar bloque`}
                    </button>
                  )}
                  <button
                    onClick={() => { setAddBlockOpen(o => !o); setNewBloqueForm({ ...BLANK_BLOQUE }); }}
                    className="text-xs px-3 py-1.5 rounded-lg bg-[#FF4500] hover:bg-[#e03d00] text-white font-bold transition-colors"
                  >
                    {addBlockOpen ? 'Cerrar' : '+ Agregar bloque'}
                  </button>
                </div>
              </div>

              {/* Inline create form */}
              {addBlockOpen && (
                <form onSubmit={handleAddBloque} className="bg-gray-900 border border-[#FF4500]/30 rounded-xl px-6 py-4 space-y-3">
                  <p className="text-xs text-[#FF4500] font-semibold uppercase tracking-wider">Nuevo bloque</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-xs text-gray-500 block mb-1">Nombre</label>
                      <input value={newBloqueForm.nombre} onChange={e => setNewBloqueForm(f => ({ ...f, nombre: e.target.value }))} required
                        placeholder="Ej: Bloque 5 — Acumulación"
                        className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF4500]" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Énfasis</label>
                      <select value={newBloqueForm.enfasis} onChange={e => setNewBloqueForm(f => ({ ...f, enfasis: e.target.value }))} required
                        className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF4500]">
                        {['Hipertrofia', 'Fuerza Base', 'Volumen', 'Peaking', 'Tapering', 'Descarga'].map(o => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Sem. inicio</label>
                      <input type="number" min={1} value={newBloqueForm.semana_inicio} onChange={e => setNewBloqueForm(f => ({ ...f, semana_inicio: Number(e.target.value) }))}
                        className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF4500]" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Sem. fin</label>
                      <input type="number" min={1} value={newBloqueForm.semana_fin} onChange={e => setNewBloqueForm(f => ({ ...f, semana_fin: Number(e.target.value) }))}
                        className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF4500]" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">RPE min</label>
                      <input type="number" min={6} max={10} step={0.5} value={newBloqueForm.intensidad_rpe_min} onChange={e => setNewBloqueForm(f => ({ ...f, intensidad_rpe_min: Number(e.target.value) }))}
                        className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF4500]" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">RPE max</label>
                      <input type="number" min={6} max={10} step={0.5} value={newBloqueForm.intensidad_rpe_max} onChange={e => setNewBloqueForm(f => ({ ...f, intensidad_rpe_max: Number(e.target.value) }))}
                        className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF4500]" />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button type="submit" disabled={savingNewBloque}
                      className="px-4 py-2 bg-[#FF4500] hover:bg-[#e03d00] text-white text-sm font-bold rounded-lg disabled:opacity-50 transition-colors">
                      {savingNewBloque ? 'Creando…' : 'Crear bloque'}
                    </button>
                    <button type="button" onClick={() => setAddBlockOpen(false)}
                      className="px-4 py-2 text-gray-400 hover:text-white text-sm rounded-lg transition-colors">
                      Cancelar
                    </button>
                  </div>
                </form>
              )}

              {[...(plan.bloques ?? [])].sort((a, b) => a.numeroBloque - b.numeroBloque).map((bloque, bloqueIdx, bloquesArr) => {
                const sesionasPorSemana = bloque.sesiones.reduce<Record<number, Sesion[]>>((acc, s) => {
                  if (!acc[s.numeroSemana]) acc[s.numeroSemana] = [];
                  acc[s.numeroSemana].push(s);
                  return acc;
                }, {});

                return (
                  <div key={bloque.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                    {/* Block header */}
                    <div className="w-full px-6 py-4 flex items-center justify-between">
                      <button
                        onClick={() => setBloqueAbierto(bloqueAbierto === bloque.id ? null : bloque.id)}
                        className="flex items-center gap-4 flex-1 text-left hover:opacity-80 transition-opacity"
                      >
                        <span className="w-8 h-8 rounded-full bg-[#FF4500]/20 flex items-center justify-center text-[#FF4500] font-bold text-sm shrink-0">
                          {bloque.numeroBloque}
                        </span>
                        <div>
                          <p className="font-semibold">{bloque.nombre}</p>
                          <p className="text-gray-500 text-sm">
                            Semanas {bloque.semanaInicio}–{bloque.semanaFin} · {bloque.enfasis} · RPE {bloque.intensidadRpeMin}–{bloque.intensidadRpeMax}
                          </p>
                        </div>
                      </button>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-gray-600 mr-1">{bloque.sesiones.length} sesiones</span>
                        <button
                          onClick={() => handleMoveBloque(bloque, -1)}
                          disabled={bloqueIdx === 0 || reorderingId === bloque.id}
                          className="p-1.5 text-gray-500 hover:text-white transition-colors disabled:opacity-20 disabled:hover:text-gray-500"
                          title="Subir bloque"
                        >↑</button>
                        <button
                          onClick={() => handleMoveBloque(bloque, 1)}
                          disabled={bloqueIdx === bloquesArr.length - 1 || reorderingId === bloque.id}
                          className="p-1.5 text-gray-500 hover:text-white transition-colors disabled:opacity-20 disabled:hover:text-gray-500"
                          title="Bajar bloque"
                        >↓</button>
                        <button
                          onClick={() => handleCopyBloque(bloque)}
                          className={`p-1.5 transition-colors ${copiedBloque?.id === bloque.id ? 'text-[#FFB800]' : 'text-gray-500 hover:text-[#FFB800]'}`}
                          title={copiedBloque?.id === bloque.id ? 'Bloque copiado' : 'Copiar bloque'}
                        >{copiedBloque?.id === bloque.id ? '✓' : '📋'}</button>
                        <button
                          onClick={() => handleEditBloque(bloque)}
                          className="p-1.5 text-gray-500 hover:text-[#FFB800] transition-colors"
                          title="Editar bloque"
                        >✏️</button>
                        <button
                          onClick={() => handleDeleteBloque(bloque.id)}
                          disabled={deletingBloqueId === bloque.id}
                          className="p-1.5 text-gray-500 hover:text-red-400 transition-colors disabled:opacity-40"
                          title="Eliminar bloque"
                        >{deletingBloqueId === bloque.id ? '...' : '🗑️'}</button>
                        <span className="text-gray-600 ml-1 cursor-pointer" onClick={() => setBloqueAbierto(bloqueAbierto === bloque.id ? null : bloque.id)}>
                          {bloqueAbierto === bloque.id ? '▲' : '▼'}
                        </span>
                      </div>
                    </div>

                    {/* Inline edit form */}
                    {editBloqueId === bloque.id && (
                      <form onSubmit={handleSaveBloque} className="border-t border-gray-700 bg-gray-800 px-6 py-4 space-y-3">
                        <p className="text-xs text-[#FFB800] font-semibold uppercase tracking-wider">Editar bloque</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          <div className="sm:col-span-2">
                            <label className="text-xs text-gray-500 block mb-1">Nombre</label>
                            <input value={bloqueForm.nombre} onChange={e => setBloqueForm(f => ({ ...f, nombre: e.target.value }))} required
                              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FFB800]" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Énfasis</label>
                            <select value={bloqueForm.enfasis} onChange={e => setBloqueForm(f => ({ ...f, enfasis: e.target.value }))} required
                              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FFB800]">
                              {['Hipertrofia', 'Fuerza Base', 'Volumen', 'Peaking', 'Tapering', 'Descarga'].map(e => (
                                <option key={e} value={e}>{e}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Sem. inicio</label>
                            <input type="number" min={1} value={bloqueForm.semana_inicio} onChange={e => setBloqueForm(f => ({ ...f, semana_inicio: Number(e.target.value) }))}
                              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FFB800]" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Sem. fin</label>
                            <input type="number" min={1} value={bloqueForm.semana_fin} onChange={e => setBloqueForm(f => ({ ...f, semana_fin: Number(e.target.value) }))}
                              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FFB800]" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">RPE min</label>
                            <input type="number" min={6} max={10} step={0.5} value={bloqueForm.intensidad_rpe_min} onChange={e => setBloqueForm(f => ({ ...f, intensidad_rpe_min: Number(e.target.value) }))}
                              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FFB800]" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">RPE max</label>
                            <input type="number" min={6} max={10} step={0.5} value={bloqueForm.intensidad_rpe_max} onChange={e => setBloqueForm(f => ({ ...f, intensidad_rpe_max: Number(e.target.value) }))}
                              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FFB800]" />
                          </div>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button type="submit" disabled={savingBloque}
                            className="px-4 py-2 bg-[#FFB800] hover:bg-[#e0a400] text-black text-sm font-bold rounded-lg disabled:opacity-50 transition-colors">
                            {savingBloque ? 'Guardando...' : 'Guardar cambios'}
                          </button>
                          <button type="button" onClick={() => setEditBloqueId(null)}
                            className="px-4 py-2 text-gray-400 hover:text-white text-sm rounded-lg transition-colors">
                            Cancelar
                          </button>
                        </div>
                      </form>
                    )}

                    {bloqueAbierto === bloque.id && (
                      <div className="border-t border-gray-800 px-6 py-5 space-y-6">
                        {Object.entries(sesionasPorSemana)
                          .sort(([a], [b]) => Number(a) - Number(b))
                          .map(([semana, sesiones]) => (
                            <div key={semana}>
                              <div className="flex items-center justify-between mb-3 gap-2">
                                <div className="flex items-center gap-2">
                                  <p className={`text-xs font-semibold uppercase tracking-wider ${sesiones.every(s => s.bloqueado) ? 'text-gray-600' : 'text-[#FFB800]'}`}>
                                    Semana {semana}
                                  </p>
                                  <button
                                    disabled={lockingWeek === sesiones[0]?.id}
                                    onClick={() => handleToggleSemana(sesiones)}
                                    title={sesiones.every(s => s.bloqueado) ? 'Desbloquear semana' : 'Bloquear semana'}
                                    className={`text-[11px] px-1.5 py-0.5 border rounded transition-colors disabled:opacity-40 ${
                                      sesiones.every(s => s.bloqueado)
                                        ? 'text-yellow-400 border-yellow-400/40 hover:text-yellow-300'
                                        : 'text-gray-600 border-gray-700 hover:text-yellow-400 hover:border-yellow-400/40'
                                    }`}
                                  >
                                    {lockingWeek === sesiones[0]?.id ? '...' : sesiones.every(s => s.bloqueado) ? '🔒' : '🔓'}
                                  </button>
                                </div>
                                {copyingFrom?.bloqueId === bloque.id && copyingFrom.semana === Number(semana) ? (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs text-gray-400">Copiar a semana:</span>
                                    <select
                                      value={copyTarget}
                                      onChange={e => setCopyTarget(Number(e.target.value))}
                                      className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-[#FF4500]"
                                    >
                                      {Array.from({ length: bloque.semanaFin - bloque.semanaInicio + 1 }, (_, i) => bloque.semanaInicio + i)
                                        .filter(s => s !== Number(semana))
                                        .map(s => <option key={s} value={s}>Semana {s}</option>)}
                                    </select>
                                    <button
                                      onClick={handleCopiarSemana}
                                      disabled={copyLoading}
                                      className="px-3 py-1 bg-[#FF4500] hover:bg-[#e03d00] text-white text-xs font-bold rounded transition-colors disabled:opacity-50"
                                    >
                                      {copyLoading ? '...' : 'Confirmar'}
                                    </button>
                                    <button
                                      onClick={() => { setCopyingFrom(null); setCopyMsg(''); }}
                                      className="px-2 py-1 text-xs text-gray-500 hover:text-white"
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => {
                                      const other = Array.from({ length: bloque.semanaFin - bloque.semanaInicio + 1 }, (_, i) => bloque.semanaInicio + i).find(s => s !== Number(semana)) ?? bloque.semanaInicio;
                                      setCopyTarget(other);
                                      setCopyMsg('');
                                      setCopyingFrom({ bloqueId: bloque.id, semana: Number(semana) });
                                    }}
                                    className="text-xs text-gray-600 hover:text-[#FFB800] transition-colors"
                                  >
                                    Copiar semana
                                  </button>
                                )}
                              </div>
                              {copyMsg && copyingFrom === null && (
                                <p className="text-xs text-green-400 mb-2">{copyMsg}</p>
                              )}
                              <div className="space-y-3">
                                {sesiones
                                  .sort((a, b) => {
                                    const da = DIAS.indexOf(a.diaSemana.toLowerCase());
                                    const db = DIAS.indexOf(b.diaSemana.toLowerCase());
                                    if (da !== db) return da - db;
                                    return (a.ordenSecuencia ?? 0) - (b.ordenSecuencia ?? 0);
                                  })
                                  .map((sesion) => (
                                    <SesionCard
                                      key={sesion.id}
                                      sesion={sesion}
                                      isOpen={sesionAbierta === sesion.id}
                                      onToggle={toggleSesion}
                                      onReload={reload}
                                      allSesiones={allSesionesFlat}
                                      completada={completadas.has(sesion.id)}
                                      bloqueRpeMin={bloque.intensidadRpeMin}
                                      bloqueRpeMax={bloque.intensidadRpeMax}
                                      bloqueSemanaInicio={bloque.semanaInicio}
                                      bloqueSemanaFin={bloque.semanaFin}
                                    />
                                  ))}
                              </div>
                            </div>
                          ))}

                        {addSesionBloqueId === bloque.id ? (
                          <form onSubmit={handleAddSesion} className="bg-gray-800 rounded-xl p-4 space-y-3 border border-[#FF4500]/30">
                            <p className="text-xs text-[#FF4500] font-semibold uppercase tracking-wider">Nueva sesión</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                              <div>
                                <label className="text-xs text-gray-500 block mb-1">Movimiento principal</label>
                                <input
                                  value={sesionForm.movimiento_principal}
                                  onChange={e => setSesionForm(f => ({ ...f, movimiento_principal: e.target.value }))}
                                  placeholder="Sentadilla, Banca, Muerto..."
                                  required
                                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF4500]"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-500 block mb-1">Enfoque del día</label>
                                <input
                                  value={sesionForm.enfocuo_dia}
                                  onChange={e => setSesionForm(f => ({ ...f, enfocuo_dia: e.target.value }))}
                                  placeholder="Max Effort, Volumen..."
                                  required
                                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF4500]"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-500 block mb-1">Día semana</label>
                                <select
                                  value={sesionForm.dia_semana}
                                  onChange={e => setSesionForm(f => ({ ...f, dia_semana: e.target.value }))}
                                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF4500]"
                                >
                                  {DIAS.map(d => <option key={d} value={d}>{DIA_MAP[d] ?? d}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="text-xs text-gray-500 block mb-1">N° semana</label>
                                <input type="number" min={bloque.semanaInicio} max={bloque.semanaFin}
                                  value={sesionForm.numero_semana}
                                  onChange={e => setSesionForm(f => ({ ...f, numero_semana: Number(e.target.value) }))}
                                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF4500]"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-500 block mb-1">Orden secuencia</label>
                                <input type="number" min={1}
                                  value={sesionForm.orden_secuencia}
                                  onChange={e => setSesionForm(f => ({ ...f, orden_secuencia: Number(e.target.value) }))}
                                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF4500]"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-500 block mb-1">Descripción (opt.)</label>
                                <input
                                  value={sesionForm.descripcion}
                                  onChange={e => setSesionForm(f => ({ ...f, descripcion: e.target.value }))}
                                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF4500]"
                                />
                              </div>
                            </div>
                            <div className="flex gap-2 pt-1">
                              <button type="submit" disabled={savingSesion}
                                className="px-4 py-2 bg-[#FF4500] hover:bg-[#e03d00] text-white text-sm font-bold rounded-lg disabled:opacity-50">
                                {savingSesion ? 'Guardando...' : 'Agregar sesión'}
                              </button>
                              <button type="button" onClick={() => setAddSesionBloqueId(null)}
                                className="px-4 py-2 text-sm text-gray-400 hover:text-white">
                                Cancelar
                              </button>
                            </div>
                          </form>
                        ) : (
                          <button
                            onClick={() => { setAddSesionBloqueId(bloque.id); setSesionForm({ ...BLANK_SESION, numero_semana: bloque.semanaInicio }); }}
                            className="text-sm text-gray-500 hover:text-[#FF4500] transition-colors border border-dashed border-gray-700 hover:border-[#FF4500]/40 rounded-lg px-4 py-2 w-full text-center"
                          >
                            + Agregar sesión al bloque
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
              {splitView && (
                <SplitPanel
                  bloques={plan.bloques}
                  splitBloqueId={splitBloqueId}
                  splitSemana={splitSemana}
                  onChangeBloqueId={setSplitBloqueId}
                  onChangeSemana={setSplitSemana}
                />
              )}
            </div>
          )
        )}

        {/* ── Tab: Competencia ── */}
        {activeTab === 'competencia' && (() => {
          const weeksUntilComp = plan.fechaCompetencia
            ? Math.max(0, Math.round((new Date(plan.fechaCompetencia).getTime() - Date.now()) / (7 * 24 * 60 * 60 * 1000)))
            : 0;
          return (
            <div className="space-y-6">
              {/* Competition date card */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <p className="text-xs text-[#FFB800] font-bold uppercase tracking-wider mb-1">Fecha de Competencia</p>
                <p className="text-xs text-gray-500 mb-5">
                  Configura la fecha objetivo — la IA calculará el tapering óptimo según el Método RV.
                </p>
                <div className="flex flex-wrap items-end gap-4">
                  <div className="flex-1 min-w-[180px] max-w-xs">
                    <label className="text-xs text-gray-500 block mb-1">Fecha</label>
                    <input type="date"
                      value={fechaComp}
                      onChange={e => setFechaComp(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF4500]"
                    />
                  </div>
                  <button onClick={handleSaveFechaComp} disabled={savingFecha || !fechaComp}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50">
                    {savingFecha ? 'Guardando...' : 'Guardar fecha'}
                  </button>
                </div>

                {plan.fechaCompetencia && (
                  <div className="mt-5 flex flex-wrap items-center gap-4">
                    <div className="bg-[#FF4500]/10 border border-[#FF4500]/20 rounded-xl px-5 py-3 text-center">
                      <p className="text-xs text-gray-500 mb-0.5">Semanas hasta competencia</p>
                      <p className={`text-3xl font-black ${weeksUntilComp <= 2 ? 'text-red-400' : weeksUntilComp <= 4 ? 'text-yellow-400' : 'text-[#FF4500]'}`}>
                        {weeksUntilComp}
                      </p>
                    </div>
                    <div className="text-sm text-gray-400">
                      <p className="font-semibold text-white">
                        {new Date(plan.fechaCompetencia).toLocaleDateString('es', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {weeksUntilComp >= 2
                          ? 'El tapering RV ideal comienza 2 semanas antes.'
                          : weeksUntilComp === 1
                          ? 'Última semana — tapering de reducción mínima.'
                          : 'La competencia ya pasó o es esta semana.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* AI Tapering generator */}
              {plan.fechaCompetencia && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <p className="text-sm font-semibold text-white mb-1">Tapering Automático con IA</p>
                  <p className="text-xs text-gray-500 mb-5">
                    La IA analiza el historial de fatiga del atleta y genera el bloque de tapering óptimo según el Método RV
                    (IDEAL · FATIGADO · INCANSABLE · PEOR). El bloque se crea directamente en la pestaña Bloques.
                  </p>

                  {taperingResult ? (
                    <div className="space-y-4">
                      <div className={`rounded-xl p-4 border ${
                        taperingResult.tipo_tapering === 'IDEAL' ? 'bg-green-900/20 border-green-700/30' :
                        taperingResult.tipo_tapering === 'FATIGADO' ? 'bg-yellow-900/20 border-yellow-700/30' :
                        taperingResult.tipo_tapering === 'INCANSABLE' ? 'bg-blue-900/20 border-blue-700/30' :
                        'bg-red-900/20 border-red-700/30'
                      }`}>
                        <div className="flex items-start gap-3">
                          <span className={`shrink-0 text-xs font-bold px-2 py-1 rounded-lg mt-0.5 ${
                            taperingResult.tipo_tapering === 'IDEAL' ? 'bg-green-700 text-white' :
                            taperingResult.tipo_tapering === 'FATIGADO' ? 'bg-yellow-600 text-black' :
                            taperingResult.tipo_tapering === 'INCANSABLE' ? 'bg-blue-600 text-white' :
                            'bg-red-700 text-white'
                          }`}>
                            {taperingResult.tipo_tapering}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-white mb-1">{taperingResult.razon_tipo}</p>
                            <p className="text-xs text-gray-400 leading-relaxed">{taperingResult.recomendacion_general}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="bg-gray-800 rounded-lg px-4 py-2 text-center">
                          <p className="text-xs text-gray-500 mb-0.5">Semanas generadas</p>
                          <p className="text-xl font-bold text-white">{taperingResult.semanas_tapering}</p>
                        </div>
                        <div className="bg-gray-800 rounded-lg px-4 py-2 text-center">
                          <p className="text-xs text-gray-500 mb-0.5">Sesiones creadas</p>
                          <p className="text-xl font-bold text-white">{taperingResult.sesiones_creadas}</p>
                        </div>
                        <div className="flex-1 flex justify-end gap-2">
                          <button onClick={() => setTaperingResult(null)}
                            className="px-4 py-2 border border-gray-700 text-gray-400 hover:text-white text-sm rounded-lg transition-colors">
                            Generar otro
                          </button>
                          <button onClick={() => { setActiveTab('bloques'); setTaperingResult(null); }}
                            className="px-4 py-2 bg-[#FF4500] hover:bg-[#e03d00] text-white text-sm font-bold rounded-lg transition-colors">
                            Ver bloque →
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button onClick={handleGenerarTapering} disabled={generandoTapering}
                      className="px-5 py-3 bg-[#FF4500] hover:bg-[#e03d00] text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-60 flex items-center gap-2">
                      {generandoTapering ? (
                        <>
                          <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Analizando con IA...
                        </>
                      ) : (
                        '⚡ Generar Tapering con IA'
                      )}
                    </button>
                  )}

                  {taperingError && (
                    <p className="text-red-400 text-sm mt-3">{taperingError}</p>
                  )}
                </div>
              )}

              {/* Tapering types reference */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {([
                  { tipo: 'IDEAL', color: 'green', desc: 'Llegó a MRV sin fatiga excesiva. −60% volumen, mantener intensidad.' },
                  { tipo: 'FATIGADO', color: 'yellow', desc: 'RPE promedio > 8.5 en 2 semanas. Descarga progresiva −70%.' },
                  { tipo: 'INCANSABLE', color: 'blue', desc: 'RPE siempre bajo el programado. −40% volumen, subir intensidad.' },
                  { tipo: 'PEOR', color: 'red', desc: 'Señales severas de sobrentrenamiento. Descarga total + peaking mínimo.' },
                ] as const).map(({ tipo, color, desc }) => (
                  <div key={tipo} className="bg-gray-900 border border-gray-800 rounded-lg p-3">
                    <p className={`text-xs font-bold mb-1.5 ${
                      color === 'green' ? 'text-green-400' :
                      color === 'yellow' ? 'text-yellow-400' :
                      color === 'blue' ? 'text-blue-400' : 'text-red-400'
                    }`}>{tipo}</p>
                    <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>

              {/* Selector de intentos */}
              <IntentosSelector
                rmSq={plan.athlete.rmSquat}
                rmBp={plan.athlete.rmBench}
                rmDl={plan.athlete.rmDeadlift}
              />
            </div>
          );
        })()}

        {/* ── Tab: Efectividad ── */}
        {activeTab === 'efectividad' && (
          <div className="space-y-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
              Efectividad por bloque — comparativa RM inicio vs fin
            </p>

            {loadingEfectividad ? (
              <p className="text-gray-500 py-10 text-center">Calculando efectividad...</p>
            ) : !efectividad || efectividad.length === 0 ? (
              <div className="text-center py-16 bg-gray-900 border border-gray-800 rounded-xl text-gray-600">
                <p>Sin datos de seguimiento para este plan todavía.</p>
              </div>
            ) : (
              efectividad.map((bloque) => (
                <div key={bloque.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                    <div>
                      <p className="font-semibold text-white">{bloque.nombre}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Sem. {bloque.semanaInicio}–{bloque.semanaFin} · {bloque.enfasis}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <StatPill label="Sesiones" value={String(bloque.stats.sesiones)} />
                      <StatPill label="Tonelaje" value={`${(bloque.stats.tonelaje / 1000).toFixed(1)} t`} />
                      {bloque.stats.rpe_promedio !== null && (
                        <StatPill label="RPE prom." value={String(bloque.stats.rpe_promedio)} />
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {(['sq', 'bp', 'dl'] as const).map((lift) => {
                      const inicio = bloque.stats.rm_inicio[lift];
                      const fin = bloque.stats.rm_fin[lift];
                      const delta = bloque.stats.mejora[lift];
                      const label = lift === 'sq' ? 'Sentadilla' : lift === 'bp' ? 'Banca' : 'Muerto';
                      return (
                        <div key={lift} className="bg-gray-800 rounded-xl p-3">
                          <p className="text-xs text-gray-500 uppercase font-semibold mb-2">{label}</p>
                          {inicio === null && fin === null ? (
                            <p className="text-xs text-gray-700">Sin datos</p>
                          ) : (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500">Inicio</span>
                                <span className="text-sm font-mono text-gray-300">{inicio !== null ? `${inicio} kg` : '—'}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500">Fin</span>
                                <span className="text-sm font-mono text-white font-bold">{fin !== null ? `${fin} kg` : '—'}</span>
                              </div>
                              {delta !== null && (
                                <div className={`flex items-center justify-between rounded-lg px-2 py-1 mt-1 ${delta > 0 ? 'bg-green-900/30' : delta < 0 ? 'bg-red-900/30' : 'bg-gray-700/30'}`}>
                                  <span className="text-xs text-gray-500">Δ 1RM</span>
                                  <span className={`text-sm font-bold ${delta > 0 ? 'text-green-400' : delta < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                                    {delta > 0 ? '▲' : delta < 0 ? '▼' : '='} {Math.abs(delta)} kg
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Tab: Progresión ── */}
        {activeTab === 'progresion' && (
          <div className="space-y-6">
            {/* 1RM section */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">1RM del Atleta — {plan.athlete.user.nombre}</p>
              <p className="text-xs text-gray-600 mb-4">Estos valores se usan para calcular el peso en kg de cada semana</p>
              <div className="grid grid-cols-3 gap-4 mb-4">
                {(['sq', 'bp', 'dl'] as const).map(lift => (
                  <div key={lift}>
                    <label className="text-xs text-gray-500 block mb-1">
                      {lift === 'sq' ? 'Sentadilla' : lift === 'bp' ? 'Banca' : 'Muerto'}
                    </label>
                    <div className="flex items-center gap-2">
                      <input type="number" min={0} step={2.5}
                        value={rms[lift] || ''}
                        onChange={e => setRms(r => ({ ...r, [lift]: Number(e.target.value) }))}
                        placeholder="0"
                        className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF4500]"
                      />
                      <span className="text-xs text-gray-500 shrink-0">kg</span>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={handleSaveRms} disabled={savingRms}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50">
                {savingRms ? 'Guardando...' : 'Guardar RMs'}
              </button>
            </div>

            {/* Progression table */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-800 flex flex-wrap justify-between items-center gap-3">
                <div>
                  <p className="text-sm font-semibold">Progresión semanal</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Ingresa el % de RM por semana — el kg se calcula automáticamente y se aplica a los ejercicios COMPETITIVO
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {applyMsg && (
                    <span className="text-xs text-green-400 font-semibold">{applyMsg}</span>
                  )}
                  <button onClick={handleApplyPct} disabled={applyingPct}
                    className="px-4 py-2 bg-[#FF4500] hover:bg-[#e03d00] text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50">
                    {applyingPct ? 'Aplicando...' : 'Aplicar pesos a sesiones'}
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#0d0d0d]">
                      <th className="px-4 py-3 text-left text-gray-500 text-xs font-semibold border border-gray-800 w-20">Sem.</th>
                      {(['sq', 'bp', 'dl'] as const).map(lift => (
                        <th key={lift} className="px-4 py-3 text-center text-[#FFB800] text-xs font-semibold border border-gray-800 min-w-[160px]">
                          {lift === 'sq' ? 'Sentadilla' : lift === 'bp' ? 'Banca' : 'Muerto'}{' '}
                          {rms[lift] ? <span className="text-gray-500 font-normal">({rms[lift]} kg)</span> : <span className="text-gray-700 font-normal">(sin 1RM)</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: plan.duracionSemanas }, (_, i) => i + 1).map(semana => {
                      const cfg: PctEntry = pctConfig[String(semana)] ?? { sq: 0, bp: 0, dl: 0 };
                      return (
                        <tr key={semana} className="border-b border-gray-800 hover:bg-gray-800/20">
                          <td className="px-4 py-3 border border-gray-800">
                            <span className="text-xs text-[#FFB800] font-bold">S{semana}</span>
                          </td>
                          {(['sq', 'bp', 'dl'] as const).map(lift => {
                            const rm = rms[lift];
                            const pct = cfg[lift];
                            const kg = rm && pct ? Math.round(rm * pct / 100 / 2.5) * 2.5 : null;
                            return (
                              <td key={lift} className="px-4 py-2 border border-gray-800">
                                <div className="flex items-center gap-2">
                                  <input type="number" min={0} max={110} step={1}
                                    value={pct || ''}
                                    onChange={e => setPctConfig(c => ({
                                      ...c,
                                      [String(semana)]: { ...cfg, [lift]: Number(e.target.value) },
                                    }))}
                                    placeholder="—"
                                    className="w-14 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-[#FF4500] text-center"
                                  />
                                  <span className="text-xs text-gray-600">%</span>
                                  {kg !== null ? (
                                    <span className="text-xs font-mono text-[#FF4500] font-bold">→ {kg} kg</span>
                                  ) : (
                                    <span className="text-xs text-gray-700">→ —</span>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="px-5 py-3 border-t border-gray-800 bg-[#0d0d0d]">
                <p className="text-xs text-gray-600">
                  Solo se actualizan ejercicios de tipo <span className="text-[#FF4500]">COMPETITIVO</span> que contengan
                  &quot;sentadilla&quot;, &quot;banca&quot; o &quot;muerto/sumo&quot; en el nombre. La configuración se guarda automáticamente.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: Series semanales ── */}
        {activeTab === 'volumen' && <VolumenSemanalTab plan={plan} />}

        {/* ── Tab: Planificación por básico ── */}
        {activeTab === 'planificacion' && (() => {
          const BASICO_TABS_PLAN: { key: BasicoMovimiento; label: string; color: string }[] = [
            { key: 'SENTADILLA',  label: 'Sentadilla',  color: 'text-blue-400' },
            { key: 'PRESS_BANCA', label: 'Press Banca', color: 'text-green-400' },
            { key: 'PESO_MUERTO', label: 'Peso Muerto', color: 'text-orange-400' },
          ];
          const BLOQUE_RV_LABEL: Record<string, string> = {
            HIPERTROFIA: 'Hipertrofia', FUERZA_BASE: 'Fuerza Base', VOLUMEN: 'Volumen',
            PEAKING: 'Peaking', TAPERING: 'Tapering', DESCARGA: 'Descarga',
          };
          const BLOQUE_RV_COLOR: Record<string, string> = {
            HIPERTROFIA: 'bg-blue-500/20 text-blue-300', FUERZA_BASE: 'bg-yellow-500/20 text-yellow-300',
            VOLUMEN: 'bg-orange-500/20 text-orange-300', PEAKING: 'bg-red-500/20 text-red-300',
            TAPERING: 'bg-purple-500/20 text-purple-300', DESCARGA: 'bg-gray-500/20 text-gray-400',
          };
          const BLOQUE_DEFAULTS_PLAN: Record<string, { rpeMin: number; rpeMax: number; pctMin: number; pctMax: number; repsMin: number; repsMax: number }> = {
            HIPERTROFIA: { rpeMin: 7,   rpeMax: 8,   pctMin: 65, pctMax: 75, repsMin: 8, repsMax: 12 },
            FUERZA_BASE: { rpeMin: 7.5, rpeMax: 8.5, pctMin: 75, pctMax: 85, repsMin: 4, repsMax: 6  },
            VOLUMEN:     { rpeMin: 7,   rpeMax: 8.5, pctMin: 70, pctMax: 80, repsMin: 5, repsMax: 8  },
            PEAKING:     { rpeMin: 8.5, rpeMax: 9.5, pctMin: 85, pctMax: 95, repsMin: 1, repsMax: 3  },
            TAPERING:    { rpeMin: 7,   rpeMax: 8,   pctMin: 75, pctMax: 85, repsMin: 2, repsMax: 4  },
            DESCARGA:    { rpeMin: 5,   rpeMax: 7,   pctMin: 50, pctMax: 65, repsMin: 5, repsMax: 8  },
          };
          const totalSemanas = plan.duracionSemanas;
          const fasesActivas = fasesBasico.filter(f => f.basico === tabBasicoPlan);

          const handleAddFase = async (e: React.FormEvent) => {
            e.preventDefault();
            setSavingFase(true);
            const res = await fetch(`/api/periodizaciones/${id}/fases`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
              body: JSON.stringify({
                basico: tabBasicoPlan,
                bloque: addFaseForm.bloque,
                semanaInicio: Number(addFaseForm.semanaInicio),
                semanaFin: Number(addFaseForm.semanaFin),
                rpeMin: Number(addFaseForm.rpeMin),
                rpeMax: Number(addFaseForm.rpeMax),
                porcentajeRmMin: addFaseForm.porcentajeRmMin !== '' ? Number(addFaseForm.porcentajeRmMin) : null,
                porcentajeRmMax: addFaseForm.porcentajeRmMax !== '' ? Number(addFaseForm.porcentajeRmMax) : null,
                repsMin: addFaseForm.repsMin !== '' ? Number(addFaseForm.repsMin) : null,
                repsMax: addFaseForm.repsMax !== '' ? Number(addFaseForm.repsMax) : null,
                notas: addFaseForm.notas || null,
              }),
            });
            if (res.ok) {
              const nueva = await res.json();
              setFasesBasico(prev => [...prev, nueva]);
              setAddFaseForm(f => ({ ...f, semanaInicio: Number(f.semanaFin) + 1, semanaFin: Number(f.semanaFin) + 2 }));
            }
            setSavingFase(false);
          };

          const handleDeleteFase = async (faseId: string) => {
            if (!confirm('¿Eliminar esta fase?')) return;
            setDeletingFaseId(faseId);
            await fetch(`/api/periodizaciones/${id}/fases/${faseId}`, {
              method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` },
            });
            setFasesBasico(prev => prev.filter(f => f.id !== faseId));
            setDeletingFaseId(null);
          };

          return (
            <div className="space-y-6">
              {/* Gantt visual */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-[#FFB800] mb-4">Visión general del ciclo</h3>
                <div className="space-y-3">
                  {BASICO_TABS_PLAN.map(tab => {
                    const fasesDeLift = fasesBasico.filter(f => f.basico === tab.key).sort((a, b) => a.semanaInicio - b.semanaInicio);
                    return (
                      <div key={tab.key} className="flex items-center gap-3">
                        <span className={`text-xs font-bold w-24 shrink-0 text-right ${tab.color}`}>{tab.label}</span>
                        <div className="flex-1 h-8 bg-gray-800 rounded-lg relative overflow-hidden">
                          {fasesDeLift.map(f => {
                            const left = ((f.semanaInicio - 1) / totalSemanas) * 100;
                            const width = ((f.semanaFin - f.semanaInicio + 1) / totalSemanas) * 100;
                            const colorCls = BLOQUE_RV_COLOR[f.bloque] ?? 'bg-gray-600/40 text-gray-400';
                            return (
                              <div
                                key={f.id}
                                className={`absolute top-0 bottom-0 flex items-center justify-center text-[10px] font-bold rounded ${colorCls} border border-white/5`}
                                style={{ left: `${left}%`, width: `${width}%` }}
                                title={`${BLOQUE_RV_LABEL[f.bloque]} · S${f.semanaInicio}–${f.semanaFin} · RPE ${f.rpeMin}–${f.rpeMax}`}
                              >
                                <span className="truncate px-1">{BLOQUE_RV_LABEL[f.bloque]}</span>
                              </div>
                            );
                          })}
                          {fasesDeLift.length === 0 && (
                            <span className="absolute inset-0 flex items-center justify-center text-xs text-gray-700">sin fases</span>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-700 w-12 shrink-0">S1–S{totalSemanas}</span>
                      </div>
                    );
                  })}
                </div>
                {/* Week ruler */}
                <div className="flex ml-[108px] mr-12 mt-2">
                  {Array.from({ length: totalSemanas }, (_, i) => (
                    <div key={i} className="flex-1 text-center text-[9px] text-gray-700">{i + 1}</div>
                  ))}
                </div>
              </div>

              {/* Per-lift detail + CRUD */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                {/* Lift tabs */}
                <div className="flex gap-1 mb-5 bg-gray-950 rounded-lg p-1">
                  {BASICO_TABS_PLAN.map(tab => (
                    <button key={tab.key} type="button" onClick={() => setTabBasicoPlan(tab.key)}
                      className={`flex-1 py-2 px-3 rounded-md text-sm font-semibold transition-colors ${
                        tabBasicoPlan === tab.key ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'
                      }`}>
                      <span className={tabBasicoPlan === tab.key ? tab.color : ''}>{tab.label}</span>
                    </button>
                  ))}
                </div>

                {/* Fases list */}
                {fasesActivas.length === 0 ? (
                  <p className="text-sm text-gray-600 text-center py-4">Sin fases para este básico.</p>
                ) : (
                  <div className="space-y-2 mb-5">
                    {fasesActivas.sort((a, b) => a.semanaInicio - b.semanaInicio).map(f => (
                      <div key={f.id} className="bg-gray-800 rounded-lg px-4 py-3 flex items-center gap-4 flex-wrap">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${BLOQUE_RV_COLOR[f.bloque] ?? 'bg-gray-700 text-gray-300'}`}>
                          {BLOQUE_RV_LABEL[f.bloque] ?? f.bloque}
                        </span>
                        <span className="text-xs text-gray-400">S{f.semanaInicio}–{f.semanaFin}</span>
                        <span className="text-xs text-gray-400">RPE {f.rpeMin}–{f.rpeMax}</span>
                        {f.porcentajeRmMin != null && <span className="text-xs text-gray-400">{f.porcentajeRmMin}–{f.porcentajeRmMax}% RM</span>}
                        {f.repsMin != null && <span className="text-xs text-gray-400">{f.repsMin}–{f.repsMax} reps</span>}
                        {f.notas && <span className="text-xs text-gray-600 italic">{f.notas}</span>}
                        <button onClick={() => handleDeleteFase(f.id)} disabled={deletingFaseId === f.id}
                          className="ml-auto text-xs text-red-500 hover:text-red-400 disabled:opacity-40 shrink-0">
                          {deletingFaseId === f.id ? '...' : 'Eliminar'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add fase form */}
                <form onSubmit={handleAddFase} className="bg-gray-800/60 rounded-xl p-4 space-y-3 border border-dashed border-gray-700">
                  <p className="text-xs text-[#FFB800] font-semibold uppercase tracking-wider">+ Agregar fase</p>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Bloque RV</label>
                      <select value={addFaseForm.bloque}
                        onChange={e => {
                          const d = BLOQUE_DEFAULTS_PLAN[e.target.value];
                          setAddFaseForm(f => ({ ...f, bloque: e.target.value, rpeMin: d?.rpeMin ?? f.rpeMin, rpeMax: d?.rpeMax ?? f.rpeMax, porcentajeRmMin: String(d?.pctMin ?? f.porcentajeRmMin), porcentajeRmMax: String(d?.pctMax ?? f.porcentajeRmMax), repsMin: String(d?.repsMin ?? f.repsMin), repsMax: String(d?.repsMax ?? f.repsMax) }));
                        }}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#FFB800]">
                        {Object.keys(BLOQUE_RV_LABEL).map(b => <option key={b} value={b}>{BLOQUE_RV_LABEL[b]}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Sem. inicio</label>
                      <input type="number" min={1} value={addFaseForm.semanaInicio}
                        onChange={e => setAddFaseForm(f => ({ ...f, semanaInicio: Number(e.target.value) }))}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#FFB800]" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Sem. fin</label>
                      <input type="number" min={1} value={addFaseForm.semanaFin}
                        onChange={e => setAddFaseForm(f => ({ ...f, semanaFin: Number(e.target.value) }))}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#FFB800]" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">RPE min – max</label>
                      <div className="flex gap-1.5">
                        <input type="number" min={5} max={10} step={0.5} value={addFaseForm.rpeMin}
                          onChange={e => setAddFaseForm(f => ({ ...f, rpeMin: Number(e.target.value) }))}
                          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-[#FFB800]" />
                        <input type="number" min={5} max={10} step={0.5} value={addFaseForm.rpeMax}
                          onChange={e => setAddFaseForm(f => ({ ...f, rpeMax: Number(e.target.value) }))}
                          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-[#FFB800]" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">%RM min – max</label>
                      <div className="flex gap-1.5">
                        <input type="number" min={0} max={110} value={addFaseForm.porcentajeRmMin}
                          onChange={e => setAddFaseForm(f => ({ ...f, porcentajeRmMin: e.target.value }))}
                          placeholder="%" className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-[#FFB800]" />
                        <input type="number" min={0} max={110} value={addFaseForm.porcentajeRmMax}
                          onChange={e => setAddFaseForm(f => ({ ...f, porcentajeRmMax: e.target.value }))}
                          placeholder="%" className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-[#FFB800]" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Reps min – max</label>
                      <div className="flex gap-1.5">
                        <input type="number" min={1} value={addFaseForm.repsMin}
                          onChange={e => setAddFaseForm(f => ({ ...f, repsMin: e.target.value }))}
                          placeholder="min" className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-[#FFB800]" />
                        <input type="number" min={1} value={addFaseForm.repsMax}
                          onChange={e => setAddFaseForm(f => ({ ...f, repsMax: e.target.value }))}
                          placeholder="max" className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-[#FFB800]" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Notas</label>
                    <input value={addFaseForm.notas} onChange={e => setAddFaseForm(f => ({ ...f, notas: e.target.value }))}
                      placeholder="Instrucciones especiales..."
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#FFB800]" />
                  </div>

                  <button type="submit" disabled={savingFase}
                    className="px-4 py-2 bg-[#FFB800] hover:bg-[#e6a600] text-black font-bold text-sm rounded-lg transition-colors disabled:opacity-50">
                    {savingFase ? 'Guardando...' : 'Agregar fase'}
                  </button>
                </form>
              </div>
            </div>
          );
        })()}

      </div>
    </div>
  );
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3">
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="font-semibold text-white">{value}</p>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-800 rounded-lg px-3 py-1.5 text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-bold text-white">{value}</p>
    </div>
  );
}

