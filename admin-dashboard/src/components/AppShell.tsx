'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';

const NAV = [
  { href: '/', label: 'Overview' },
  { href: '/bookings', label: 'Bookings' },
  { href: '/trips', label: 'Live Trips & Map' },
  { href: '/drivers', label: 'Drivers' },
  { href: '/vehicles', label: 'Vehicles' },
  { href: '/vehicle-categories', label: 'Vehicle Categories' },
  { href: '/corporate', label: 'Corporate Companies' },
  { href: '/pricing-rules', label: 'Pricing Rules' },
  { href: '/commission-rules', label: 'Commission Rules' },
  { href: '/invoices', label: 'Corporate Invoices' },
  { href: '/settlements', label: 'Vendor Settlements' },
  { href: '/reports', label: 'Reports' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();

  if (pathname === '/login') return <>{children}</>;

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-slate-500">Loading…</div>;
  }

  if (!user) {
    if (typeof window !== 'undefined') window.location.href = '/login';
    return null;
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 shrink-0 border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="text-lg font-semibold text-brand-700">Cab Platform</div>
          <div className="text-xs text-slate-500">Admin Dashboard</div>
        </div>
        <nav className="flex flex-col gap-0.5 p-3">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2 text-sm ${
                pathname === item.href ? 'bg-brand-50 font-medium text-brand-700' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <div className="text-sm text-slate-500">Signed in as {user.phone} · {user.role}</div>
          <button className="btn-secondary" onClick={logout}>
            Log out
          </button>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
