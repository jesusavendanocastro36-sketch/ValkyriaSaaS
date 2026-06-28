'use client';

import dynamic from 'next/dynamic';

// El panel de chat IA se carga bajo demanda — no infla el bundle inicial
// de cada página admin (el layout admin es server component, por eso este wrapper).
const AIChatPanel = dynamic(() => import('./AIChatPanel'), { ssr: false });

export default function AIChatPanelLazy() {
  return <AIChatPanel />;
}
