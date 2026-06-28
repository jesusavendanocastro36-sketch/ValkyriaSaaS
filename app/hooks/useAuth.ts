'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, type Rol } from '@/lib/store/auth-store';

type UseAuthOptions = {
  /** Si se indica, redirige al dashboard correcto cuando el rol no coincide */
  require?: Rol;
  /** false desactiva el redirect a /login cuando no hay sesión (default: true) */
  redirect?: boolean;
};

/**
 * Hook central de autenticación.
 *
 * const { session, authHeaders, authFetch, logout, ready } = useAuth({ require: 'ADMIN' });
 *
 * - Hidrata la sesión desde localStorage una sola vez.
 * - Redirige a /login si no hay sesión (salvo redirect: false).
 * - `authFetch` es fetch con el header Authorization ya incluido.
 */
export function useAuth(opts: UseAuthOptions = {}) {
  const router = useRouter();
  const { session, hydrated, hydrate, login, logout } = useAuthStore();
  const { require, redirect = true } = opts;

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrated, hydrate]);

  useEffect(() => {
    if (!hydrated || !redirect) return;
    if (!session) {
      router.replace('/login');
      return;
    }
    if (require && session.rol !== require) {
      router.replace(session.rol === 'ADMIN' ? '/admin/dashboard' : '/athlete/dashboard');
    }
  }, [hydrated, session, require, redirect, router]);

  const authHeaders = useMemo<Record<string, string>>(
    () => (session ? { Authorization: `Bearer ${session.token}` } : ({} as Record<string, string>)),
    [session]
  );

  const authFetch = useCallback(
    (input: RequestInfo | URL, init: RequestInit = {}) =>
      fetch(input, { ...init, headers: { ...(init.headers ?? {}), ...authHeaders } }),
    [authHeaders]
  );

  const handleLogout = useCallback(() => {
    logout();
    router.push('/login');
  }, [logout, router]);

  return {
    session,
    token: session?.token ?? null,
    rol: session?.rol ?? null,
    nombre: session?.nombre ?? '',
    /** true cuando ya se leyó localStorage */
    ready: hydrated,
    authHeaders,
    authFetch,
    login,
    logout: handleLogout,
  };
}
