'use client';

import { useAuth } from '@/lib/auth';
import { useApiSwr } from '@/lib/useApiSwr';
import { api } from '@/lib/api';

export default function BookingsPage() {
  const { user } = useAuth();
  const { data: bookings, isLoading, mutate } = useApiSwr<any[]>(user?.companyId ? `/bookings?companyId=${user.companyId}` : null);

  async function cancel(id: string) {
    const reason = window.prompt('Cancellation reason (optional)') ?? undefined;
    await api.patch(`/bookings/${id}/cancel`, { reason });
    await mutate();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Bookings</h1>
        <p className="text-sm text-slate-500">All trips booked for your company.</p>
      </div>
      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr><th>Pickup</th><th>Drop</th><th>Type</th><th>Status</th><th>Est. fare</th><th>Scheduled</th><th></th></tr>
          </thead>
          <tbody>
            {(bookings ?? []).map((b) => (
              <tr key={b.id}>
                <td>{b.pickupLabel}</td>
                <td>{b.dropLabel}</td>
                <td>{b.type}</td>
                <td><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{b.status}</span></td>
                <td>₹{b.estimatedFare ?? '—'}</td>
                <td>{b.scheduledAt ? new Date(b.scheduledAt).toLocaleString() : 'Immediate'}</td>
                <td>
                  {!['COMPLETED', 'CANCELLED'].includes(b.status) && (
                    <button className="btn-secondary" onClick={() => cancel(b.id)}>Cancel</button>
                  )}
                </td>
              </tr>
            ))}
            {!isLoading && (bookings ?? []).length === 0 && (
              <tr><td colSpan={7} className="py-6 text-center text-slate-400">No bookings yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
