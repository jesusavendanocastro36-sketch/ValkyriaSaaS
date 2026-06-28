'use client';

import React, { useState } from 'react';
import ExercisePicker from '@/app/components/ExercisePicker';
import {
  type Sesion, type Ejercicio, type SeguimientoSet,
  DIA_MAP, DIAS, TIPOS_EJ, BLANK_EJ,
  tipoColor, grupoColor, calcRpeForWeek, getRirLabel, getPesoSugerido,
} from './shared';

// ── Session card with Excel-style exercise table ─────────────────────────────

const BLANK_EDIT = {
  ejercicio_nombre: '', tipo_ejercicio: 'COMPETITIVO', orden_grupo: '',
  carga_ref: '', rir_label: '', sets_programados: 3, reps_programadas: 5,
  rpe_programado: 7.5, peso_programado: '', peso_rm: '', factor_variante: '1', rest_minutos: 3, notas_tecnicas: '', video_url: '',
};

function SesionCard({
  sesion, isOpen, onToggle,
  onReload, allSesiones, completada,
  bloqueRpeMin, bloqueRpeMax, bloqueSemanaInicio, bloqueSemanaFin,
}: {
  sesion: Sesion;
  isOpen: boolean;
  onToggle: (sesionId: string) => void;
  onReload: () => void;
  allSesiones: { id: string; semana: number; dia: string }[];
  completada: boolean;
  bloqueRpeMin: number;
  bloqueRpeMax: number;
  bloqueSemanaInicio: number;
  bloqueSemanaFin: number;
}) {
  const [editingEjId, setEditingEjId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<typeof BLANK_EDIT>({ ...BLANK_EDIT });
  const [savingEdit, setSavingEdit] = useState(false);
  const [saveEditError, setSaveEditError] = useState<string | null>(null);
  const [showCopyMenu, setShowCopyMenu] = useState(false);
  const [copying, setCopying] = useState(false);
  const [movingEjId, setMovingEjId] = useState<string | null>(null);
  const [inlinePeso, setInlinePeso] = useState<Record<string, string>>({});
  // Session header editing
  const [isEditingSesion, setIsEditingSesion] = useState(false);
  const [sesionEditForm, setSesionEditForm] = useState({
    dia_semana: sesion.diaSemana,
    movimiento_principal: sesion.movimientoPrincipal,
    enfocuo_dia: sesion.enfocuoDia,
    numero_semana: sesion.numeroSemana,
    descripcion: sesion.descripcion ?? '',
  });
  const [savingSesion, setSavingSesion] = useState(false);
  const [shiftingDay, setShiftingDay] = useState(false);
  const [dayPickerOpen, setDayPickerOpen] = useState(false);

  // Add-exercise form lives inside the card so typing doesn't re-render the whole page
  const [isAdding, setIsAdding] = useState(false);
  const [ejForm, setEjForm] = useState({ ...BLANK_EJ });
  const [savingEj, setSavingEj] = useState(false);

  const handleAddEjercicio = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEj(true);
    await fetch('/api/ejercicios-sesion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') ?? ''}` },
      body: JSON.stringify({
        sesion_id: sesion.id,
        ejercicio_nombre: ejForm.ejercicio_nombre,
        tipo_ejercicio: ejForm.tipo_ejercicio,
        orden_grupo: ejForm.orden_grupo || undefined,
        carga_ref: ejForm.carga_ref || undefined,
        rir_label: ejForm.rir_label || undefined,
        sets_programados: Number(ejForm.sets_programados),
        reps_programadas: Number(ejForm.reps_programadas),
        rpe_programado: Number(ejForm.rpe_programado),
        peso_programado: ejForm.peso_programado ? Number(ejForm.peso_programado) : undefined,
        rest_minutos: Number(ejForm.rest_minutos),
        notas_tecnicas: ejForm.notas_tecnicas || undefined,
        video_url: ejForm.video_url || undefined,
        orden: sesion.ejercicios.length + 1,
      }),
    });
    setSavingEj(false);
    setIsAdding(false);
    setEjForm({ ...BLANK_EJ });
    onReload();
  };

  const ejercicios = [...sesion.ejercicios].sort((a, b) => a.orden - b.orden);
  const autoRpe = calcRpeForWeek(sesion.numeroSemana, bloqueSemanaInicio, bloqueSemanaFin, bloqueRpeMin, bloqueRpeMax);

  const handleSwapOrden = async (ejA: Ejercicio, ejB: Ejercicio) => {
    setMovingEjId(ejA.id);
    const token = localStorage.getItem('token') ?? '';
    await fetch(`/api/ejercicios-sesion/${ejA.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ orden: ejB.orden }),
    });
    await fetch(`/api/ejercicios-sesion/${ejB.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ orden: ejA.orden }),
    });
    setMovingEjId(null);
    onReload();
  };

  const startEdit = (ej: Ejercicio) => {
    setEditForm({
      ejercicio_nombre: ej.ejercicioNombre,
      tipo_ejercicio: ej.tipoEjercicio,
      orden_grupo: ej.ordenGrupo ?? '',
      carga_ref: ej.cargaRef ?? '',
      rir_label: ej.rirLabel ?? '',
      sets_programados: ej.setsProgramados,
      reps_programadas: ej.repsProgramadas,
      rpe_programado: ej.rpeProgramado,
      peso_programado: ej.pesoProgramado != null ? String(ej.pesoProgramado) : '',
      peso_rm: '',
      factor_variante: '1',
      rest_minutos: ej.restMinutos,
      notas_tecnicas: ej.notasTecnicas ?? '',
      video_url: ej.videoUrl ?? '',
    });
    setEditingEjId(ej.id);
  };

  const handleSaveEdit = async () => {
    if (!editingEjId) return;
    setSavingEdit(true);
    setSaveEditError(null);
    try {
      const body: Record<string, unknown> = {
        tipo_ejercicio: editForm.tipo_ejercicio,
        orden_grupo: editForm.orden_grupo || null,
        carga_ref: editForm.carga_ref || null,
        rir_label: editForm.rir_label || null,
        sets_programados: editForm.sets_programados,
        reps_programadas: editForm.reps_programadas,
        rpe_programado: editForm.rpe_programado,
        peso_programado: editForm.peso_programado ? Number(editForm.peso_programado) : null,
        rest_minutos: editForm.rest_minutos,
        notas_tecnicas: editForm.notas_tecnicas || null,
        video_url: editForm.video_url || null,
      };
      if (editForm.ejercicio_nombre) body.ejercicio_nombre = editForm.ejercicio_nombre;

      const res = await fetch(`/api/ejercicios-sesion/${editingEjId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') ?? ''}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setSaveEditError(err.detail ?? err.error ?? `Error ${res.status}`);
        return;
      }
      setEditingEjId(null);
      setSaveEditError(null);
      onReload();
    } catch (e) {
      setSaveEditError(String(e));
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteEj = async (ejId: string) => {
    if (!confirm('¿Eliminar este ejercicio?')) return;
    await fetch(`/api/ejercicios-sesion/${ejId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${localStorage.getItem('token') ?? ''}` },
    });
    onReload();
  };

  const handleSavePesoInline = async (ejId: string) => {
    const val = inlinePeso[ejId];
    if (val === undefined) return;
    await fetch(`/api/ejercicios-sesion/${ejId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') ?? ''}` },
      body: JSON.stringify({ peso_programado: val ? Number(val) : null }),
    });
    onReload();
  };

  const handleCopy = async (targetId: string) => {
    if (!confirm('¿Copiar todos los ejercicios de esta sesión? Se reemplazarán los ejercicios existentes en la sesión destino.')) return;
    setShowCopyMenu(false);
    setCopying(true);
    try {
      await fetch(`/api/sesiones/${sesion.id}/copiar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') ?? ''}` },
        body: JSON.stringify({ targetSesionId: targetId }),
      });
      onReload();
    } finally {
      setCopying(false);
    }
  };

  const inputCls = 'w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-[#FF4500]';

  const otherSesiones = allSesiones.filter(s => s.id !== sesion.id);

  const handleSaveSesion = async () => {
    setSavingSesion(true);
    const token = localStorage.getItem('token') ?? '';
    await fetch(`/api/sesiones/${sesion.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        dia_semana: sesionEditForm.dia_semana,
        movimiento_principal: sesionEditForm.movimiento_principal,
        enfocuo_dia: sesionEditForm.enfocuo_dia,
        numero_semana: Number(sesionEditForm.numero_semana),
        descripcion: sesionEditForm.descripcion || null,
      }),
    });
    setSavingSesion(false);
    setIsEditingSesion(false);
    onReload();
  };

  const handleShiftDay = async (newDay: string) => {
    if (newDay === sesion.diaSemana.toLowerCase()) { setDayPickerOpen(false); return; }
    setDayPickerOpen(false);
    setShiftingDay(true);
    await fetch(`/api/sesiones/${sesion.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') ?? ''}` },
      body: JSON.stringify({ dia_semana: newDay }),
    });
    setShiftingDay(false);
    onReload();
  };

  return (
    <div className={`border rounded-xl overflow-hidden transition-[border-color] duration-300 ${shiftingDay ? 'border-[#FF4500]/60 animate-day-glow' : 'border-gray-700'}`}>
      {isEditingSesion ? (
        <div className="px-4 py-3 bg-gray-800 border-b border-gray-700 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-500 block mb-1">Día</label>
              <select value={sesionEditForm.dia_semana}
                onChange={e => setSesionEditForm(f => ({ ...f, dia_semana: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#FF4500]">
                {DIAS.map(d => <option key={d} value={d}>{DIA_MAP[d] ?? d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 block mb-1">Semana</label>
              <input type="number" min={1} value={sesionEditForm.numero_semana}
                onChange={e => setSesionEditForm(f => ({ ...f, numero_semana: Number(e.target.value) }))}
                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#FF4500]" />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-gray-500 block mb-1">Movimiento principal</label>
            <input value={sesionEditForm.movimiento_principal}
              onChange={e => setSesionEditForm(f => ({ ...f, movimiento_principal: e.target.value }))}
              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#FF4500]" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 block mb-1">Enfoque del día</label>
            <input value={sesionEditForm.enfocuo_dia}
              onChange={e => setSesionEditForm(f => ({ ...f, enfocuo_dia: e.target.value }))}
              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#FF4500]" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 block mb-1">Descripción (opcional)</label>
            <input value={sesionEditForm.descripcion}
              onChange={e => setSesionEditForm(f => ({ ...f, descripcion: e.target.value }))}
              placeholder="Notas de la sesión..."
              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#FF4500]" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSaveSesion} disabled={savingSesion}
              className="px-3 py-1.5 bg-[#FF4500] hover:bg-[#e03d00] text-white text-xs font-bold rounded transition-colors disabled:opacity-50">
              {savingSesion ? 'Guardando...' : 'Guardar'}
            </button>
            <button onClick={() => setIsEditingSesion(false)}
              className="px-3 py-1.5 text-gray-400 hover:text-white text-xs transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      ) : null}

      <div className={`w-full px-4 py-3 flex items-center justify-between transition-colors ${sesion.bloqueado ? 'bg-gray-900/80 hover:bg-gray-900' : 'bg-gray-800/50 hover:bg-gray-800'}`}>
        <button onClick={() => onToggle(sesion.id)} className="flex-1 text-left min-w-0 flex items-center gap-2">
          {sesion.bloqueado
            ? <span className="text-gray-600 text-xs shrink-0" title="Bloqueado para el atleta">🔒</span>
            : <span className={`w-2 h-2 rounded-full shrink-0 ${completada ? 'bg-green-500' : 'bg-gray-700'}`} title={completada ? 'Sesión completada' : 'Pendiente'} />
          }
          <div>
            <p className={`font-semibold text-sm ${sesion.bloqueado ? 'text-gray-500' : ''}`}>
              {DIA_MAP[sesion.diaSemana.toLowerCase()] ?? sesion.diaSemana} — {sesion.movimientoPrincipal}
              {sesion.bloqueado && <span className="ml-2 text-[10px] font-normal text-gray-600">bloqueado</span>}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{sesion.enfocuoDia}</p>
          </div>
        </button>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <button
            onClick={async () => {
              const token = localStorage.getItem('token') ?? '';
              await fetch(`/api/sesiones/${sesion.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ bloqueado: !sesion.bloqueado }),
              });
              onReload();
            }}
            title={sesion.bloqueado ? 'Desbloquear sesión' : 'Bloquear sesión'}
            className={`text-[10px] px-2 py-1 border rounded transition-colors ${
              sesion.bloqueado
                ? 'text-yellow-400 border-yellow-400/40 hover:text-yellow-300'
                : 'text-gray-500 border-gray-700 hover:text-yellow-400 hover:border-yellow-400/40'
            }`}
          >
            {sesion.bloqueado ? '🔒' : '🔓'}
          </button>
          <button
            onClick={() => { setSesionEditForm({ dia_semana: sesion.diaSemana, movimiento_principal: sesion.movimientoPrincipal, enfocuo_dia: sesion.enfocuoDia, numero_semana: sesion.numeroSemana, descripcion: sesion.descripcion ?? '' }); setIsEditingSesion(v => !v); }}
            title="Editar sesión"
            className="text-[10px] text-gray-500 hover:text-[#FF4500] px-2 py-1 border border-gray-700 hover:border-[#FF4500]/40 rounded transition-colors"
          >
            ✏️
          </button>
          <div className="relative">
            <button
              onClick={() => setDayPickerOpen(v => !v)}
              disabled={shiftingDay}
              title="Mover a otro día"
              className={`text-[10px] px-2 py-1 border rounded transition-all duration-200 flex items-center gap-1 ${
                shiftingDay
                  ? 'text-[#FF4500] border-[#FF4500]/40 animate-pulse cursor-wait'
                  : dayPickerOpen
                    ? 'text-white border-[#FF4500]/60 bg-gray-800'
                    : 'text-gray-400 border-gray-700 hover:text-white hover:border-gray-500'
              }`}
            >
              <span>{shiftingDay ? '↻' : '⇄'}</span>
              <span>{DIA_MAP[sesion.diaSemana.toLowerCase()] ?? sesion.diaSemana}</span>
            </button>
            {dayPickerOpen && (
              <div
                className="absolute right-0 top-full mt-1.5 z-50 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-2.5 animate-pop-in"
                onMouseLeave={() => setDayPickerOpen(false)}
              >
                <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-2 px-0.5 font-semibold">Mover sesión al día</p>
                <div className="flex gap-1">
                  {DIAS.map(d => {
                    const isCurrent = d === sesion.diaSemana.toLowerCase();
                    return (
                      <button
                        key={d}
                        onMouseDown={() => handleShiftDay(d)}
                        className={`px-2 py-1.5 rounded-lg text-[10px] font-semibold transition-all duration-150 whitespace-nowrap ${
                          isCurrent
                            ? 'bg-[#FF4500] text-white shadow-md shadow-[#FF4500]/30 cursor-default'
                            : 'text-gray-400 hover:bg-gray-700 hover:text-white hover:scale-105'
                        }`}
                      >
                        {DIA_MAP[d] ?? d}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <div className="relative">
            <button
              onClick={() => setShowCopyMenu(v => !v)}
              title="Copiar sesión a otra semana"
              className="text-[10px] text-gray-500 hover:text-[#FFB800] px-2 py-1 border border-gray-700 hover:border-[#FFB800]/40 rounded transition-colors"
            >
              {copying ? '...' : 'Copiar →'}
            </button>
            {showCopyMenu && otherSesiones.length > 0 && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl min-w-[180px] overflow-hidden">
                <p className="px-3 py-1.5 text-[10px] text-gray-600 uppercase tracking-wider font-semibold bg-gray-950 border-b border-gray-800">
                  Copiar ejercicios a...
                </p>
                {otherSesiones.map(s => (
                  <button
                    key={s.id}
                    onMouseDown={() => handleCopy(s.id)}
                    className="w-full px-3 py-2 text-left text-xs text-white hover:bg-gray-800 transition-colors border-b border-gray-800/50"
                  >
                    S{s.semana} — {DIA_MAP[s.dia.toLowerCase()] ?? s.dia}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => onToggle(sesion.id)} className="text-xs text-gray-600 flex items-center gap-1">
            <span className="text-gray-600">{sesion.ejercicios.length} ej.</span>
            <span>{isOpen ? '▲' : '▼'}</span>
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="bg-[#111] px-4 py-4">
          {sesion.descripcion && (
            <p className="text-xs text-gray-500 mb-3 italic">{sesion.descripcion}</p>
          )}

          {ejercicios.length > 0 && (
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-[#0d0d0d]">
                    <th className="px-2 py-2 text-left text-[#FFB800] font-semibold border border-gray-800 whitespace-nowrap">Orden</th>
                    <th className="px-2 py-2 text-left text-[#FFB800] font-semibold border border-gray-800">Ejercicio</th>
                    <th className="px-2 py-2 text-center text-[#FFB800] font-semibold border border-gray-800 whitespace-nowrap">Tipo</th>
                    <th className="px-2 py-2 text-center text-gray-500 font-semibold border border-gray-800 whitespace-nowrap">Carga ref.</th>
                    <th className="px-2 py-2 text-center text-[#FF4500] font-semibold border border-gray-800 whitespace-nowrap">Peso (kg)</th>
                    <th className="px-2 py-2 text-center text-gray-500 font-semibold border border-gray-800 whitespace-nowrap">Series×Reps</th>
                    <th className="px-2 py-2 text-center text-gray-500 font-semibold border border-gray-800 whitespace-nowrap">RIR</th>
                    <th className="px-2 py-2 text-center text-gray-500 font-semibold border border-gray-800 whitespace-nowrap">RPE</th>
                    <th className="px-2 py-2 text-left text-gray-500 font-semibold border border-gray-800">Notas técnicas</th>
                    <th className="px-2 py-2 text-center text-gray-500 font-semibold border border-gray-800"></th>
                  </tr>
                </thead>
                <tbody>
                  {ejercicios.map((ej, idx) => (
                    <React.Fragment key={ej.id}>
                      <tr className={`border-b border-gray-800 transition-colors ${editingEjId === ej.id ? 'bg-gray-800' : 'bg-gray-900 hover:bg-gray-800/60'}`}>
                        <td className="px-2 py-2 border border-gray-800">
                          <div className="flex flex-col items-center gap-0.5">
                            <button
                              onClick={() => idx > 0 && handleSwapOrden(ej, ejercicios[idx - 1])}
                              disabled={idx === 0 || movingEjId === ej.id}
                              className="text-[10px] text-gray-700 hover:text-[#FFB800] disabled:opacity-20 disabled:cursor-default leading-none transition-colors"
                              title="Subir"
                            >▲</button>
                            <span className={`font-mono text-[11px] ${movingEjId === ej.id ? 'text-[#FFB800]' : grupoColor(ej.ordenGrupo)}`}>
                              {ej.ordenGrupo ?? ej.orden}
                            </span>
                            <button
                              onClick={() => idx < ejercicios.length - 1 && handleSwapOrden(ej, ejercicios[idx + 1])}
                              disabled={idx === ejercicios.length - 1 || movingEjId === ej.id}
                              className="text-[10px] text-gray-700 hover:text-[#FFB800] disabled:opacity-20 disabled:cursor-default leading-none transition-colors"
                              title="Bajar"
                            >▼</button>
                          </div>
                        </td>
                        <td className="px-2 py-2 border border-gray-800 font-semibold text-white">{ej.ejercicioNombre}</td>
                        <td className="px-2 py-2 border border-gray-800 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-xs ${tipoColor(ej.tipoEjercicio)}`}>
                            {ej.tipoEjercicio.charAt(0) + ej.tipoEjercicio.slice(1).toLowerCase()}
                          </span>
                        </td>
                        <td className="px-2 py-2 border border-gray-800 text-center text-gray-400 whitespace-nowrap">
                          {ej.cargaRef ?? <span className="text-gray-700">—</span>}
                        </td>
                        <td className="px-2 py-2 border border-gray-800 text-center">
                          <input
                            type="number"
                            step={2.5}
                            min={0}
                            value={inlinePeso[ej.id] ?? (ej.pesoProgramado != null ? String(ej.pesoProgramado) : '')}
                            onChange={e => setInlinePeso(p => ({ ...p, [ej.id]: e.target.value }))}
                            onBlur={() => handleSavePesoInline(ej.id)}
                            onKeyDown={e => e.key === 'Enter' && handleSavePesoInline(ej.id)}
                            placeholder="— kg"
                            className="w-20 bg-transparent border border-transparent hover:border-gray-700 focus:border-[#FF4500] rounded px-2 py-0.5 text-[#FF4500] font-mono font-bold text-xs text-center focus:outline-none focus:bg-gray-800"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-800 text-center font-mono text-[#FF4500] font-bold whitespace-nowrap">
                          {ej.setsProgramados}×{ej.repsProgramadas}
                        </td>
                        <td className="px-2 py-2 border border-gray-800 text-center text-[#FFB800] whitespace-nowrap">
                          {ej.rirLabel ?? '—'}
                        </td>
                        <td className="px-2 py-2 border border-gray-800 text-center text-[#FF4500] whitespace-nowrap">
                          {ej.rpeProgramado}
                        </td>
                        <td className="px-2 py-2 border border-gray-800 text-gray-400 whitespace-normal break-words min-w-[180px]">
                          {ej.notasTecnicas ?? <span className="text-gray-700">—</span>}
                        </td>
                        <td className="px-2 py-2 border border-gray-800 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => editingEjId === ej.id ? setEditingEjId(null) : startEdit(ej)}
                              title="Editar"
                              className="p-1 text-gray-500 hover:text-[#FFB800] transition-colors"
                            >✏️</button>
                            <button
                              onClick={() => handleDeleteEj(ej.id)}
                              title="Eliminar"
                              className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                            >🗑️</button>
                          </div>
                        </td>
                      </tr>

                      {ej.seguimiento && ej.seguimiento.length > 0 && (
                        <tr key={`real-${ej.id}`} className="bg-green-500/5">
                          <td colSpan={10} className="px-3 py-2 border border-gray-800 border-t-0">
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                              <span className="text-[10px] font-bold text-green-400 uppercase tracking-wider shrink-0">▸ Ejecutado</span>
                              {ej.seguimiento.map((s: SeguimientoSet) => {
                                const ok = s.completado;
                                const rpeDiff = +(s.rpeReportado - ej.rpeProgramado).toFixed(1);
                                const rpeColor = rpeDiff > 1 ? 'text-red-400' : rpeDiff < -1 ? 'text-blue-400' : 'text-green-400';
                                return (
                                  <span key={s.numeroSet} className="text-[10px] text-gray-400 flex items-center gap-1.5 whitespace-nowrap">
                                    <span className={`font-mono font-bold ${ok ? 'text-gray-300' : 'text-red-400'}`}>S{s.numeroSet}</span>
                                    <span className="text-[#FF4500] font-bold">{s.pesoUsado}kg</span>
                                    <span>×{s.repsRealizadas}</span>
                                    <span className={`font-semibold ${rpeColor}`}>RPE{s.rpeReportado}</span>
                                    {!ok && <span className="text-red-400 text-[9px]">(no completado)</span>}
                                    {s.notasAtleta && <span className="text-gray-600 italic">"{s.notasAtleta}"</span>}
                                    {s.numeroSet < ej.seguimiento.length && <span className="text-gray-700">·</span>}
                                  </span>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      )}

                      {editingEjId === ej.id && (
                        <tr key={`edit-${ej.id}`} className="bg-gray-800/80">
                          <td colSpan={10} className="px-4 py-4 border border-[#FF4500]/30">
                            <p className="text-xs text-[#FFB800] font-semibold uppercase tracking-wider mb-3">Editando: {ej.ejercicioNombre}</p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                              <div className="col-span-2">
                                <label className="text-xs text-gray-500 block mb-1">Buscar ejercicio</label>
                                <ExercisePicker
                                  placeholder="Buscar en RV o biblioteca..."
                                  onSelect={r => setEditForm(f => ({
                                    ...f,
                                    ejercicio_nombre: r.nombre,
                                    tipo_ejercicio: r.tipo,
                                    carga_ref: r.cargaRef ?? f.carga_ref,
                                    notas_tecnicas: r.notas ?? f.notas_tecnicas,
                                    video_url: r.videoUrl ?? f.video_url,
                                  }))}
                                />
                                <input value={editForm.ejercicio_nombre} onChange={e => setEditForm(f => ({ ...f, ejercicio_nombre: e.target.value }))} placeholder="Nombre (edita si es necesario)" className={`${inputCls} mt-1.5`} />
                              </div>
                              <div>
                                <label className="text-xs text-gray-500 block mb-1">Tipo</label>
                                <select value={editForm.tipo_ejercicio} onChange={e => setEditForm(f => ({ ...f, tipo_ejercicio: e.target.value }))} className={inputCls}>
                                  {TIPOS_EJ.map(t => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="text-xs text-gray-500 block mb-1">Orden grupo</label>
                                <input value={editForm.orden_grupo} onChange={e => setEditForm(f => ({ ...f, orden_grupo: e.target.value }))} placeholder="A1, B2..." className={inputCls} />
                              </div>
                            </div>

                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-3">
                              <div>
                                <label className="text-xs text-gray-500 block mb-1">Series</label>
                                <input type="number" min={1} max={20} value={editForm.sets_programados} onChange={e => setEditForm(f => ({ ...f, sets_programados: Number(e.target.value) }))} className={inputCls} />
                              </div>
                              <div>
                                <label className="text-xs text-gray-500 block mb-1">Reps</label>
                                <input type="number" min={1} max={50} value={editForm.reps_programadas} onChange={e => setEditForm(f => ({ ...f, reps_programadas: Number(e.target.value) }))} className={inputCls} />
                              </div>
                              <div>
                                <label className="text-xs text-gray-500 block mb-1">RPE</label>
                                <select
                                  value={editForm.rpe_programado}
                                  onChange={e => {
                                    const rpe = Number(e.target.value);
                                    setEditForm(f => ({ ...f, rpe_programado: rpe, rir_label: getRirLabel(rpe) }));
                                  }}
                                  className={inputCls}
                                >
                                  {[6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map(r => (
                                    <option key={r} value={r}>{r}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="text-xs text-gray-500 block mb-1">RIR (auto)</label>
                                <input
                                  readOnly
                                  value={editForm.rir_label}
                                  className={`${inputCls} bg-gray-800 text-green-400 cursor-default`}
                                  placeholder="—"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-500 block mb-1">RM ejercicio (kg)</label>
                                <input
                                  type="number" min={0} step={2.5}
                                  value={editForm.peso_rm}
                                  onChange={e => setEditForm(f => ({ ...f, peso_rm: e.target.value }))}
                                  placeholder="ej: 70"
                                  className={inputCls}
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-500 block mb-1">Peso (kg)</label>
                                <input type="number" min={0} step={2.5} value={editForm.peso_programado} onChange={e => setEditForm(f => ({ ...f, peso_programado: e.target.value }))} placeholder="—" className={inputCls} />
                              </div>
                            </div>

                            {/* Factor variante + sugerencia */}
                            <div className="mb-3 bg-gray-900/60 border border-gray-700/50 rounded-xl p-3">
                              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">📐 Calculadora de peso</p>
                              <div className="grid grid-cols-2 gap-3 mb-2">
                                <div>
                                  <label className="text-[10px] text-gray-500 block mb-1">Factor variante</label>
                                  <input
                                    type="number" min={0.5} max={1} step={0.01}
                                    value={editForm.factor_variante}
                                    onChange={e => setEditForm(f => ({ ...f, factor_variante: e.target.value }))}
                                    placeholder="1.00"
                                    className={inputCls}
                                  />
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {[['1.00','Principal'],['0.95','≈Var'],['0.92','Pausa'],['0.90','Grip'],['0.85','Aux']].map(([v, label]) => (
                                      <button key={v} type="button" onClick={() => setEditForm(f => ({ ...f, factor_variante: v }))}
                                        className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${editForm.factor_variante === v ? 'bg-[#FF4500]/20 border-[#FF4500]/50 text-[#FF4500]' : 'border-gray-700 text-gray-500 hover:text-gray-300'}`}>
                                        {label}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  {(() => {
                                    const rm = Number(editForm.peso_rm);
                                    const factor = Number(editForm.factor_variante) || 1;
                                    const sug = rm > 0 ? getPesoSugerido(rm, factor, editForm.rpe_programado, editForm.reps_programadas) : null;
                                    if (!sug) return <p className="text-[10px] text-gray-600 mt-4">Ingresa el RM del ejercicio para ver la sugerencia</p>;
                                    return (
                                      <div>
                                        <p className="text-[10px] text-gray-500 mb-1">RM efectivo</p>
                                        <p className="text-sm font-bold text-white">{sug.rmEfectivo} kg <span className="text-gray-600 font-normal text-[10px]">({rm} × {factor})</span></p>
                                        <p className="text-[10px] text-gray-500 mt-2 mb-1">Peso sugerido ({sug.pct}%)</p>
                                        <div className="flex items-center gap-2">
                                          <p className="text-base font-black text-[#FFB800]">{sug.peso} kg</p>
                                          <button type="button" onClick={() => setEditForm(f => ({ ...f, peso_programado: String(sug.peso) }))}
                                            className="text-[10px] bg-[#FF4500] text-white px-2 py-0.5 rounded font-bold hover:bg-[#e03d00]">Usar →</button>
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>
                            </div>
                            <div className="mb-3">
                              <label className="text-xs text-gray-500 block mb-1">Carga / ref.</label>
                              <input value={editForm.carga_ref} onChange={e => setEditForm(f => ({ ...f, carga_ref: e.target.value }))} placeholder="78% SQ, ver prog..." className={inputCls} />
                            </div>

                            <div className="mb-3">
                              <label className="text-xs text-gray-500 block mb-1">URL video (opt.)</label>
                              <input value={editForm.video_url} onChange={e => setEditForm(f => ({ ...f, video_url: e.target.value }))} placeholder="https://..." className={inputCls} />
                            </div>

                            <div className="mb-3">
                              <label className="text-xs text-gray-500 block mb-1">Notas técnicas</label>
                              <textarea
                                value={editForm.notas_tecnicas}
                                onChange={e => setEditForm(f => ({ ...f, notas_tecnicas: e.target.value }))}
                                rows={3}
                                placeholder="Cues de técnica, indicaciones de ejecución..."
                                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-xs focus:outline-none focus:border-[#FF4500] resize-y"
                              />
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <button onClick={handleSaveEdit} disabled={savingEdit}
                                className="px-4 py-1.5 bg-[#FFB800] hover:bg-[#e6a600] text-black text-xs font-bold rounded-lg disabled:opacity-50">
                                {savingEdit ? 'Guardando...' : 'Guardar cambios'}
                              </button>
                              <button onClick={() => { setEditingEjId(null); setSaveEditError(null); }}
                                className="px-4 py-1.5 text-xs text-gray-400 hover:text-white">
                                Cancelar
                              </button>
                              {saveEditError && (
                                <span className="text-xs text-red-400 font-medium">⚠ {saveEditError}</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {isAdding ? (
            <form onSubmit={handleAddEjercicio} className="bg-gray-800 rounded-xl p-4 space-y-3 border border-[#FF4500]/30">
              <div className="flex items-center justify-between">
                <p className="text-xs text-[#FF4500] font-semibold uppercase tracking-wider">Nuevo ejercicio</p>
                <span className="text-[10px] text-[#FFB800] bg-[#FFB800]/10 px-2 py-0.5 rounded-full">
                  Sem {sesion.numeroSemana} → RPE sugerido: {autoRpe} ({getRirLabel(autoRpe)})
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 block mb-1">Buscar ejercicio</label>
                  <ExercisePicker
                    placeholder="Buscar en RV o biblioteca..."
                    onSelect={r => setEjForm(f => ({
                      ...f,
                      ejercicio_nombre: r.nombre,
                      tipo_ejercicio: r.tipo,
                      carga_ref: r.cargaRef ?? f.carga_ref,
                      notas_tecnicas: r.notas ?? f.notas_tecnicas,
                      video_url: r.videoUrl ?? '',
                    }))}
                  />
                  <input
                    value={ejForm.ejercicio_nombre}
                    onChange={e => setEjForm(f => ({ ...f, ejercicio_nombre: e.target.value }))}
                    placeholder="Nombre (requerido)"
                    required
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF4500] mt-1.5"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Tipo</label>
                  <select
                    value={ejForm.tipo_ejercicio}
                    onChange={e => setEjForm(f => ({ ...f, tipo_ejercicio: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF4500]"
                  >
                    {TIPOS_EJ.map(t => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Orden grupo</label>
                  <input
                    value={ejForm.orden_grupo}
                    onChange={e => setEjForm(f => ({ ...f, orden_grupo: e.target.value }))}
                    placeholder="A1, A2, B1..."
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF4500]"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Carga / ref.</label>
                  <input
                    value={ejForm.carga_ref}
                    onChange={e => setEjForm(f => ({ ...f, carga_ref: e.target.value }))}
                    placeholder="78% SQ, ver prog..."
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF4500]"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Descanso (min)</label>
                  <input type="number" min={0} max={10} step={0.5}
                    value={ejForm.rest_minutos}
                    onChange={e => setEjForm(f => ({ ...f, rest_minutos: Number(e.target.value) }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF4500]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Series</label>
                  <input type="number" min={1} max={20}
                    value={ejForm.sets_programados}
                    onChange={e => setEjForm(f => ({ ...f, sets_programados: Number(e.target.value) }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF4500]"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Reps</label>
                  <input type="number" min={1} max={50}
                    value={ejForm.reps_programadas}
                    onChange={e => setEjForm(f => ({ ...f, reps_programadas: Number(e.target.value) }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF4500]"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">RPE</label>
                  <select
                    value={ejForm.rpe_programado}
                    onChange={e => {
                      const rpe = Number(e.target.value);
                      setEjForm(f => ({ ...f, rpe_programado: rpe, rir_label: getRirLabel(rpe) }));
                    }}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF4500]"
                  >
                    {[6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">RIR (auto)</label>
                  <input
                    readOnly
                    value={ejForm.rir_label}
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-green-400 text-sm cursor-default"
                    placeholder="—"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">RM ejercicio (kg)</label>
                  <input
                    type="number" min={0} step={2.5}
                    value={ejForm.peso_rm}
                    onChange={e => setEjForm(f => ({ ...f, peso_rm: e.target.value }))}
                    placeholder="ej: 70"
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF4500]"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Peso (kg, opt.)</label>
                  <input type="number" min={0} step={2.5}
                    value={ejForm.peso_programado}
                    onChange={e => setEjForm(f => ({ ...f, peso_programado: e.target.value }))}
                    placeholder="—"
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF4500]"
                  />
                </div>
              </div>

              {/* Factor variante + sugerencia */}
              <div className="bg-gray-900/60 border border-gray-700/50 rounded-xl p-3">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">📐 Calculadora de peso</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Factor variante</label>
                    <input
                      type="number" min={0.5} max={1} step={0.01}
                      value={ejForm.factor_variante}
                      onChange={e => setEjForm(f => ({ ...f, factor_variante: e.target.value }))}
                      placeholder="1.00"
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF4500]"
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {[['1.00','Principal'],['0.95','≈Var'],['0.92','Pausa'],['0.90','Grip'],['0.85','Aux']].map(([v, label]) => (
                        <button key={v} type="button" onClick={() => setEjForm(f => ({ ...f, factor_variante: v }))}
                          className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${ejForm.factor_variante === v ? 'bg-[#FF4500]/20 border-[#FF4500]/50 text-[#FF4500]' : 'border-gray-700 text-gray-500 hover:text-gray-300'}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    {(() => {
                      const rm = Number(ejForm.peso_rm);
                      const factor = Number(ejForm.factor_variante) || 1;
                      const sug = rm > 0 ? getPesoSugerido(rm, factor, ejForm.rpe_programado, ejForm.reps_programadas) : null;
                      if (!sug) return <p className="text-[10px] text-gray-600 mt-4">Ingresa el RM del ejercicio para ver la sugerencia</p>;
                      return (
                        <div>
                          <p className="text-[10px] text-gray-500 mb-1">RM efectivo</p>
                          <p className="text-sm font-bold text-white">{sug.rmEfectivo} kg <span className="text-gray-600 font-normal text-[10px]">({rm} × {factor})</span></p>
                          <p className="text-[10px] text-gray-500 mt-2 mb-1">Peso sugerido ({sug.pct}%)</p>
                          <div className="flex items-center gap-2">
                            <p className="text-base font-black text-[#FFB800]">{sug.peso} kg</p>
                            <button type="button" onClick={() => setEjForm(f => ({ ...f, peso_programado: String(sug.peso) }))}
                              className="text-[10px] bg-[#FF4500] text-white px-2 py-0.5 rounded font-bold hover:bg-[#e03d00]">Usar →</button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">URL video (opt.)</label>
                <input
                  value={ejForm.video_url}
                  onChange={e => setEjForm(f => ({ ...f, video_url: e.target.value }))}
                  placeholder="https://..."
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF4500]"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">Notas técnicas (opt.)</label>
                <textarea
                  value={ejForm.notas_tecnicas}
                  onChange={e => setEjForm(f => ({ ...f, notas_tecnicas: e.target.value }))}
                  rows={2}
                  placeholder="Cues de técnica, advertencias..."
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF4500] resize-y"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={savingEj}
                  className="px-4 py-2 bg-[#FF4500] hover:bg-[#e03d00] text-white text-sm font-bold rounded-lg disabled:opacity-50">
                  {savingEj ? 'Guardando...' : 'Agregar ejercicio'}
                </button>
                <button type="button" onClick={() => setIsAdding(false)}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white">
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => { setIsAdding(true); setEjForm({ ...BLANK_EJ, rpe_programado: autoRpe, rir_label: getRirLabel(autoRpe) }); }}
              className="text-xs text-gray-500 hover:text-[#FF4500] transition-colors border border-dashed border-gray-700 hover:border-[#FF4500]/40 rounded-lg px-4 py-2 w-full text-center"
            >
              + Agregar ejercicio
            </button>
          )}
        </div>
      )}
    </div>
  );
}


export default React.memo(SesionCard);
