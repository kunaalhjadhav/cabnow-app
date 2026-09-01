'use client';

import { useApiSwr } from '@/lib/useApiSwr';

export default function ReportsPage() {
  const { data: bookings } = useApiSwr<any[]>('/bookings');
  const completed = (bookings ?? []).filter((b) => b.status === 'COMPLETED');
  const cancelled = (bookings ?? []).filter((b) => b.status === 'CANCELLED');
  const byType = completed.reduce<Record<string, number>>((acc, b) => {
    acc[b.type] = (acc[b.type] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Reports</h1>
        <p className="text-sm text-slate-500">
          A starting point — plug in a BI tool (Metabase/Superset) against the read replica for deeper analytics; this
          view computes simple aggregates client-side from the same API every other screen uses.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="card">
          <div className="text-sm text-slate-500">Completed trips</div>
          <div className="mt-1 text-2xl font-semibold">{completed.length}</div>
        </div>
        <div className="card">
          <div className="text-sm text-slate-500">Cancelled bookings</div>
          <div className="mt-1 text-2xl font-semibold">{cancelled.length}</div>
        </div>
        <div className="card">
          <div className="text-sm text-slate-500">Completed by type</div>
          <ul className="mt-1 text-sm">
            {Object.entries(byType).map(([type, count]) => (
              <li key={type}>{type}: {count}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
