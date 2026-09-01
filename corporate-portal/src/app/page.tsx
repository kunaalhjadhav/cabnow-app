'use client';

import { useAuth } from '@/lib/auth';
import { useApiSwr } from '@/lib/useApiSwr';

export default function DashboardPage() {
  const { user } = useAuth();
  const companyId = user?.companyId;
  const { data: billing } = useApiSwr<any>(companyId ? `/corporate/companies/${companyId}/billing-summary` : null);
  const { data: bookings } = useApiSwr<any[]>(companyId ? `/bookings?companyId=${companyId}` : null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-slate-500">Your company's transportation activity and billing at a glance.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="card">
          <div className="text-sm text-slate-500">Credit limit</div>
          <div className="mt-1 text-2xl font-semibold">₹{billing?.creditLimit ?? '—'}</div>
        </div>
        <div className="card">
          <div className="text-sm text-slate-500">Credit used</div>
          <div className="mt-1 text-2xl font-semibold">₹{billing?.creditUsed ?? '—'}</div>
        </div>
        <div className="card">
          <div className="text-sm text-slate-500">Credit available</div>
          <div className="mt-1 text-2xl font-semibold">₹{billing?.creditAvailable ?? '—'}</div>
        </div>
      </div>

      <div className="card">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Recent bookings</h2>
        <table className="data-table">
          <thead>
            <tr><th>Pickup</th><th>Drop</th><th>Status</th><th>Est. fare</th></tr>
          </thead>
          <tbody>
            {(bookings ?? []).slice(0, 10).map((b) => (
              <tr key={b.id}>
                <td>{b.pickupLabel}</td>
                <td>{b.dropLabel}</td>
                <td>{b.status}</td>
                <td>₹{b.estimatedFare ?? '—'}</td>
              </tr>
            ))}
            {(bookings ?? []).length === 0 && (
              <tr><td colSpan={4} className="py-6 text-center text-slate-400">No bookings yet — book your first trip.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
