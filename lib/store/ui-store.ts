'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type UIState = {
  /** Vista doble en el editor de periodizaciones */
  splitView: boolean;
  setSplitView: (v: boolean) => void;
};

// Preferencias de UI persistidas entre sesiones
export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      splitView: false,
      setSplitView: (v) => set({ splitView: v }),
    }),
    { name: 'valkyria-ui' }
  )
);
