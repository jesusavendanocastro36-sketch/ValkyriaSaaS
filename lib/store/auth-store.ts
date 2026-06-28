'use client';

import { create } from 'zustand';

export type Rol = 'ADMIN' | 'ATHLETE';

export type AuthSession = {
  token: string;
  userId: string;
  rol: Rol;
  nombre: string;
};

type AuthState = {
  session: AuthSession | null;
  /** true una vez leído localStorage (evita redirects antes de hidratar) */
  hydrated: boolean;
  hydrate: () => void;
  login: (s: AuthSession) => void;
  logout: () => void;
};

// El store escribe en las mismas claves de localStorage que usa el resto de la
// app (token, userId, rol, nombre), así las páginas no migradas siguen funcionando.
export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  hydrated: false,

  hydrate: () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    const rol = localStorage.getItem('rol') as Rol | null;
    const nombre = localStorage.getItem('nombre') ?? '';
    set({
      session: token && userId && (rol === 'ADMIN' || rol === 'ATHLETE')
        ? { token, userId, rol, nombre }
        : null,
      hydrated: true,
    });
  },

  login: (s) => {
    const prevUid = localStorage.getItem('userId');
    if (prevUid && prevUid !== s.userId) {
      localStorage.removeItem(`valkyria_perfil_ok_${prevUid}`);
    }
    localStorage.setItem('token', s.token);
    localStorage.setItem('userId', s.userId);
    localStorage.setItem('rol', s.rol);
    localStorage.setItem('nombre', s.nombre);
    set({ session: s, hydrated: true });
  },

  logout: () => {
    localStorage.clear();
    set({ session: null, hydrated: true });
  },
}));
