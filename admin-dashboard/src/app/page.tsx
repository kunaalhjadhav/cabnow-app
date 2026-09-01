'use client';

import { useApiSwr } from '@/lib/useApiSwr';

function StatCard({ label, value, loading }: { label: string; value: number | string; loading: boolean }) {
  return (
    <div className="card">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{loading ? '—' : value}</div>
    </div>
  );
}

export default function OverviewPage() {
  const { data: bookings, isLoading: bookingsLoading } = useApiSwr<any[]>('/bookings');
  const { data: drivers, isLoading: driversLoading } = useApiSwr<any[]>('/drivers');
  const { data: vehicles, isLoading: vehiclesLoading } = useApiSwr<any[]>('/vehicles');
  const { data: companies, isLoading: companiesLoading } = useApiSwr<any[]>('/corporate/companies');

  const activeBookings = bookings?.filter((b) => !['COMPLETED', 'CANCELLED'].includes(b.status)).length ?? 0;
  const onlineDrivers = drivers?.filter((d) => d.isOnline).length ?? 0;
  const pendingVehicles = vehicles?.filter((v) => v.status === 'PENDING_APPROVAL').length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Operations overview</h1>
        <p className="text-sm text-slate-500">Live snapshot across bookings, dispatch, fleet and corporate accounts.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Active bookings" value={activeBookings} loading={bookingsLoading} />
        <StatCard label="Drivers online" value={onlineDrivers} loading={driversLoading} />
        <StatCard label="Vehicles pending approval" value={pendingVehicles} loading={vehiclesLoading} />
        <StatCard label="Corporate companies" value={companies?.length ?? 0} loading={companiesLoading} />
      </div>

      <div className="card">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Recent bookings</h2>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Pickup</th>
                <th>Drop</th>
                <th>Type</th>
                <th>Status</th>
                <th>Est. fare</th>
              </tr>
            </thead>
            <tbody>
              {(bookings ?? []).slice(0, 10).map((b) => (
                <tr key={b.id}>
                  <td>{b.pickupLabel}</td>
                  <td>{b.dropLabel}</td>
                  <td>{b.type}</td>
                  <td>{b.status}</td>
                  <td>₹{b.estimatedFare ?? '—'}</td>
                </tr>
              ))}
              {!bookingsLoading && (bookings ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">
                    No bookings yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
