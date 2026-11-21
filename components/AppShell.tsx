'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useStore } from '@/lib/store';

const NAV = [
  { href: '/', label: 'Dashboard', icon: 'M4 20V10M10 20V4M16 20v-7M22 20H2' },
  { href: '/claims', label: 'Claims', icon: 'M12 3a9 9 0 100 18 9 9 0 000-18zm0 5a4 4 0 100 8 4 4 0 000-8z' },
  { href: '/claims/new', label: 'New Claim', icon: 'M12 5v14M5 12h14' },
  { href: '/dealers', label: 'Dealers', icon: 'M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6' },
  { href: '/customers', label: 'Customers', icon: 'M9 11a4 4 0 100-8 4 4 0 000 8zM3 21c0-3.3 2.7-6 6-6s6 2.7 6 6M17 11a3 3 0 000-6M21 21c0-2.6-1.6-4.8-4-5.6' },
  { href: '/reports', label: 'Reports', icon: 'M6 3h9l4 4v14H6zM9 13h6M9 17h6' },
];

function Icon({ d, size = 20 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { claims } = useStore();
  const drafts = claims.filter((c) => c.status === 'draft').length;
  const active = (href: string) => (href === '/' ? path === '/' : href === '/claims' ? path === '/claims' || (path.startsWith('/claims/') && path !== '/claims/new') : path.startsWith(href));

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 bg-brand text-white shadow">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <Link href="/" className="flex items-center gap-1 rounded-md bg-white px-2.5 py-1 no-underline">
            <span className="text-lg font-extrabold tracking-wide text-brand">SLM</span>
            <span className="text-[11px] font-semibold text-zinc-900">TYRES</span>
          </Link>
          <span className="hidden font-bold sm:inline">After-Sales</span>
          <nav aria-label="Main" className="ml-2 hidden flex-1 gap-1 md:flex">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold no-underline ${active(n.href) ? 'bg-white text-brand' : 'text-white hover:bg-white/15'}`}
              >
                {n.label}
                {n.href === '/claims' && drafts > 0 && <span className="ml-1.5 rounded-full bg-amber-300 px-1.5 text-xs text-zinc-900">{drafts}</span>}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-brand-dark text-sm font-bold">WA</div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-28 pt-6 md:pb-12">{children}</main>

      <nav aria-label="Bottom" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-zinc-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        {NAV.filter((n) => n.href !== '/reports').map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-semibold no-underline ${active(n.href) ? 'text-brand' : 'text-zinc-500'}`}
          >
            <Icon d={n.icon} size={n.href === '/claims/new' ? 24 : 20} />
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
