'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

function NavIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

const NAV = [
  {
    href: '/athlete/dashboard',
    label: 'Inicio',
    icon: <><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></>,
  },
  {
    href: '/athlete/periodizacion',
    label: 'Mi Plan',
    icon: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  },
  {
    href: '/athlete/progreso',
    label: 'Progreso',
    icon: <><path d="M18 20V10M12 20V4M6 20v-6" /></>,
  },
  {
    href: '/athlete/mensajes',
    label: 'Mensajes',
    icon: <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" />,
  },
  {
    href: '/athlete/historial',
    label: 'Historial',
    icon: <><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="9"/></>,
  },
  {
    href: '/athlete/perfil',
    label: 'Perfil',
    icon: <><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></>,
  },
];

const ONBOARDING_EXEMPT = ['/athlete/onboarding'];
const PERFIL_FLAG = (uid: string) => `valkyria_perfil_ok_${uid}`;

export default function AthleteLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');
  const isSesion = pathname.includes('/sesion/');
  const isOnboarding = pathname.includes('/onboarding');

  useEffect(() => {
    if (ONBOARDING_EXEMPT.some(p => pathname.startsWith(p))) return;
    const token = localStorage.getItem('token');
    const uid   = localStorage.getItem('userId');
    if (!token || !uid) return;

    // If we already verified this session, skip the API call
    if (localStorage.getItem(PERFIL_FLAG(uid)) === '1') return;

    fetch('/api/athlete/perfil', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        // Never redirect on API errors (expired token, network issues, etc.)
        if (!r.ok) return null;
        return r.json();
      })
      .then(d => {
        if (!d) return;
        if (d.altura && d.edad) {
          // Cache the result so we don't re-check on every navigation
          localStorage.setItem(PERFIL_FLAG(uid), '1');
        } else {
          router.replace('/athlete/onboarding');
        }
      })
      .catch(() => {});
  // Only run on initial mount (empty deps). Pathname changes don't need a re-check.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`min-h-screen bg-[#080808] ${!isSesion && !isOnboarding ? 'pb-16' : ''}`}>
      {children}
      {!isSesion && !isOnboarding && (
        <nav className="fixed bottom-0 left-0 right-0 bg-[#0a0a0a] border-t border-gray-800 z-50 flex items-stretch h-16 safe-bottom box-content">
          {NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  active ? 'text-[#FF4500]' : 'text-gray-600 hover:text-gray-400'
                }`}
              >
                <NavIcon>{item.icon}</NavIcon>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
