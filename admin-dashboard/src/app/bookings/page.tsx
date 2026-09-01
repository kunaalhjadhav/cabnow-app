'use client';

import { useApiSwr } from '@/lib/useApiSwr';

export default function BookingsPage() {
  const { data: bookings, isLoading } = useApiSwr<any[]>('/bookings');

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Bookings</h1>
        <p className="text-sm text-slate-500">Immediate, scheduled and corporate-package bookings across the platform.</p>
      </div>
      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Pickup</th>
              <th>Drop</th>
              <th>Source</th>
              <th>Type</th>
              <th>Status</th>
              <th>Est. fare</th>
              <th>Scheduled</th>
            </tr>
          </thead>
          <tbody>
            {(bookings ?? []).map((b) => (
              <tr key={b.id}>
                <td>{b.pickupLabel}</td>
                <td>{b.dropLabel}</td>
                <td>{b.source}</td>
                <td>{b.type}</td>
                <td>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{b.status}</span>
                </td>
                <td>₹{b.estimatedFare ?? '—'}</td>
                <td>{b.scheduledAt ? new Date(b.scheduledAt).toLocaleString() : 'Immediate'}</td>
              </tr>
            ))}
            {!isLoading && (bookings ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-slate-400">
                  No bookings yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
