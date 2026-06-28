'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './useAuth';

export type Atleta = {
  id: string;
  pesoActual: number | null;
  altura: number | null;
  edad: number | null;
  categoriaPeso: string | null;
  experienciaPowerlifting: string;
  lesionesActuales: string[];
  objetivos: string[];
  rmSquat: number | null;
  rmBench: number | null;
  rmDeadlift: number | null;
  createdAt: string;
  user: { nombre: string; email: string; activo: boolean };
  periodizaciones: { id: string; nombre: string }[];
};

export type DashAtleta = {
  id: string;
  estadoFatiga: 'VERDE' | 'AMARILLA' | 'ROJA';
  rpe7dias: number;
  ultimaSesion: string | null;
  sesionesEstaSemana: number;
  bloqueActual: { nombre: string; enfasis: string } | null;
};

/**
 * Atletas del coach + estado del dashboard (fatiga, RPE 7d, última sesión).
 *
 * const { atletas, dashMap, loading, refresh, toggleActivo } = useAthletes();
 */
export function useAthletes() {
  const { token, authFetch, ready } = useAuth({ require: 'ADMIN' });
  const [atletas, setAtletas] = useState<Atleta[]>([]);
  const [dashMap, setDashMap] = useState<Record<string, DashAtleta>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const [atletasRes, dashRes] = await Promise.all([
        authFetch('/api/atletas').then(r => r.json()),
        authFetch('/api/admin/dashboard').then(r => r.json()),
      ]);
      setAtletas(atletasRes.data ?? []);
      const map: Record<string, DashAtleta> = {};
      for (const a of dashRes.atletas ?? []) map[a.id] = a;
      setDashMap(map);
    } catch {
      setError('No se pudieron cargar los atletas');
    } finally {
      setLoading(false);
    }
  }, [token, authFetch]);

  useEffect(() => {
    if (ready && token) refresh();
  }, [ready, token, refresh]);

  /** Activa/desactiva la cuenta del atleta. Devuelve el nuevo estado o null si falló. */
  const toggleActivo = useCallback(async (atletaId: string): Promise<boolean | null> => {
    const res = await authFetch(`/api/atletas/${atletaId}/toggle-activo`, { method: 'PATCH' });
    if (!res.ok) return null;
    const { activo } = await res.json();
    setAtletas(prev => prev.map(a => (a.id === atletaId ? { ...a, user: { ...a.user, activo } } : a)));
    return activo;
  }, [authFetch]);

  return { atletas, dashMap, loading, error, refresh, toggleActivo };
}
