'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './useAuth';

export type BloqueResumen = {
  semanaInicio: number;
  semanaFin: number;
  nombre: string;
  enfasis: string;
};

export type PlanResumen = {
  id: string;
  nombre: string;
  tipo: string;
  estado: string;
  objetivo: string;
  fechaInicio: string;
  fechaFin: string;
  duracionSemanas: number;
  athlete: { user: { nombre: string } };
  _count: { bloques: number };
  bloques: BloqueResumen[];
};

/** Semana en curso de un plan ACTIVE según su fecha de inicio (1-based). */
export function semanaActualDe(p: PlanResumen): number | null {
  if (p.estado !== 'ACTIVE') return null;
  return Math.max(1, Math.ceil((Date.now() - new Date(p.fechaInicio).getTime()) / (7 * 24 * 60 * 60 * 1000)));
}

/** Bloque vigente de un plan ACTIVE según la semana en curso. */
export function bloqueActualDe(p: PlanResumen): BloqueResumen | null {
  const semana = semanaActualDe(p);
  if (semana === null || p.bloques.length === 0) return null;
  return p.bloques.find(b => semana >= b.semanaInicio && semana <= b.semanaFin) ?? p.bloques[p.bloques.length - 1];
}

/**
 * Periodizaciones del coach.
 *
 * const { planes, loading, refresh, publicar } = useWorkoutPlans();
 */
export function useWorkoutPlans() {
  const { token, authFetch, ready } = useAuth({ require: 'ADMIN' });
  const [planes, setPlanes] = useState<PlanResumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const res = await authFetch('/api/periodizaciones');
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? 'Error al cargar'); return; }
      setPlanes(d.data ?? []);
    } catch {
      setError('No se pudieron cargar las periodizaciones');
    } finally {
      setLoading(false);
    }
  }, [token, authFetch]);

  useEffect(() => {
    if (ready && token) refresh();
  }, [ready, token, refresh]);

  /** Publica un plan DRAFT → ACTIVE con actualización optimista. */
  const publicar = useCallback(async (id: string): Promise<boolean> => {
    const res = await authFetch(`/api/periodizaciones/${id}/publicar`, { method: 'POST' });
    if (!res.ok) return false;
    setPlanes(prev => prev.map(p => (p.id === id ? { ...p, estado: 'ACTIVE' } : p)));
    return true;
  }, [authFetch]);

  return { planes, loading, error, refresh, publicar };
}
