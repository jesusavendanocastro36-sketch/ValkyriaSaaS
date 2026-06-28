'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/app/hooks/useAuth';

function Ico({ children }: { children: React.ReactNode }) {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"
      className="shrink-0">
      {children}
    </svg>
  );
}

const Icons = {
  dashboard:  <><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="8" rx="1.5" /><rect x="3" y="13" width="8" height="8" rx="1.5" /><rect x="13" y="13" width="8" height="8" rx="1.5" /></>,
  calendar:   <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  users:      <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></>,
  list:       <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 9h8M8 13h8M8 17h5" /></>,
  sparkle:    <path d="M12 3l1.8 5.2 5.2 1.8-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3zM19 14l.9 2.6 2.6.9-2.6.9L19 21l-.9-2.6-2.6-.9 2.6-.9L19 14zM5 14l.9 2.6 2.6.9-2.6.9L5 21l-.9-2.6-2.6-.9 2.6-.9L5 14z" />,
  star:       <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />,
  chart:      <><path d="M18 20V10M12 20V4M6 20v-6" /></>,
  book:       <><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></>,
  layers:     <><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></>,
  chat:       <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" />,
  logout:     <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />,
  menu:       <><path d="M3 12h18M3 6h18M3 18h18" /></>,
  close:      <><path d="M18 6L6 18M6 6l12 12" /></>,
};

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
};

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: 'Principal',
    items: [
      { href: '/admin/dashboard',       label: 'Dashboard',       icon: Icons.dashboard },
      { href: '/admin/periodizaciones', label: 'Periodizaciones', icon: Icons.calendar  },
      { href: '/admin/atletas',         label: 'Atletas',         icon: Icons.users     },
      { href: '/admin/ejercicios',      label: 'Ejercicios',      icon: Icons.list      },
    ],
  },
  {
    section: 'Inteligencia',
    items: [
      { href: '/admin/consultar-ia',    label: 'Consultar IA',    icon: Icons.sparkle },
      { href: '/admin/recomendaciones', label: 'Recomendaciones', icon: Icons.star    },
      { href: '/admin/reportes',        label: 'Reportes',        icon: Icons.chart   },
    ],
  },
  {
    section: 'Recursos',
    items: [
      { href: '/admin/protocolos',    label: 'Protocolos RV',   icon: Icons.book   },
      { href: '/admin/metodologias',  label: 'Metodologías',    icon: Icons.layers },
      { href: '/admin/mensajes',      label: 'Mensajes',        icon: Icons.chat   },
    ],
  },
];

export default function AdminSidebar() {
  const pathname  = usePathname();
  const { nombre, token, authFetch, logout, ready } = useAuth({ redirect: false });
  const [recBadge, setRecBadge] = useState(0);
  const [open, setOpen]       = useState(false);

  useEffect(() => {
    if (!ready || !token) return;
    authFetch('/api/admin/dashboard')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setRecBadge(d.stats?.recomendacionesPendientes ?? 0); });
  }, [ready, token, authFetch]);

  // Close mobile menu on navigation
  useEffect(() => { setOpen(false); }, [pathname]);

  const handleLogout = logout;

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  // Inject badge into Recomendaciones
  const navWithBadges = NAV.map(group => ({
    ...group,
    items: group.items.map(item =>
      item.href === '/admin/recomendaciones' && recBadge > 0
        ? { ...item, badge: recBadge }
        : item
    ),
  }));

  const sidebarContent = (
    <aside className="flex flex-col h-full bg-[#090909] border-r border-gray-800/60 w-64">

      {/* Logo */}
      <div className="px-5 pt-5 pb-4 border-b border-gray-800/60">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#FF4500] flex items-center justify-center shrink-0">
            <span className="text-white font-black text-sm leading-none">V</span>
          </div>
          <div>
            <p className="text-white font-black tracking-widest text-[15px] leading-none">VALKYRIA</p>
            <p className="text-[#FF4500]/50 text-[9px] tracking-[0.22em] font-semibold mt-0.5 uppercase">Powerlifting</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-5">
        {navWithBadges.map((group) => (
          <div key={group.section}>
            <p className="px-3 mb-1.5 text-[9px] font-bold text-gray-700 uppercase tracking-[0.15em]">
              {group.section}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 ${
                      active
                        ? 'bg-[#FF4500]/10 text-[#FF4500]'
                        : 'text-gray-500 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    {/* Left accent bar */}
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#FF4500] rounded-full" />
                    )}
                    <Ico>{item.icon}</Ico>
                    <span className="flex-1">{item.label}</span>
                    {item.badge ? (
                      <span className="min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-[#FF4500] text-white text-[10px] font-bold leading-none">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer — coach profile + logout */}
      <div className="px-3 py-3 border-t border-gray-800/60 space-y-0.5">
        <Link
          href="/admin/perfil"
          className="px-3 py-2.5 flex items-center gap-3 rounded-xl hover:bg-white/[0.04] transition-colors group"
        >
          <div className="w-7 h-7 rounded-full bg-[#FF4500]/15 border border-[#FF4500]/25 flex items-center justify-center text-[#FF4500] font-bold text-sm shrink-0">
            {nombre[0]?.toUpperCase() ?? 'Y'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-white truncate group-hover:text-[#FF4500] transition-colors">
              {nombre || 'Coach'}
            </p>
            <p className="text-[11px] text-gray-700">Coach · Admin</p>
          </div>
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-gray-600 hover:text-red-400 hover:bg-red-400/5 transition-all duration-150"
        >
          <Ico>{Icons.logout}</Ico>
          Cerrar sesión
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop: fixed sidebar */}
      <div className="fixed inset-y-0 left-0 z-40 hidden lg:flex">
        {sidebarContent}
      </div>

      {/* Mobile: hamburger button */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 w-9 h-9 flex items-center justify-center rounded-xl bg-[#0f0f0f] border border-gray-800 text-gray-400 hover:text-white transition-colors"
      >
        <Ico>{Icons.menu}</Ico>
      </button>

      {/* Mobile: overlay + drawer */}
      {open && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="lg:hidden fixed inset-y-0 left-0 z-50 flex">
            {sidebarContent}
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-[-48px] w-9 h-9 flex items-center justify-center rounded-xl bg-[#0f0f0f] border border-gray-800 text-gray-400 hover:text-white transition-colors"
            >
              <Ico>{Icons.close}</Ico>
            </button>
          </div>
        </>
      )}
    </>
  );
}
