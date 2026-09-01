'use client';

import { useState } from 'react';
import { useApiSwr } from '@/lib/useApiSwr';
import { api } from '@/lib/api';

export default function DriversPage() {
  const { data: drivers, isLoading, mutate } = useApiSwr<any[]>('/drivers');
  const [busyId, setBusyId] = useState<string | null>(null);

  async function approve(id: string) {
    setBusyId(id);
    try {
      await api.patch(`/drivers/${id}/approve`);
      await mutate();
    } finally {
      setBusyId(null);
    }
  }

  async function suspend(id: string) {
    setBusyId(id);
    try {
      await api.patch(`/drivers/${id}/suspend`);
      await mutate();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Drivers</h1>
        <p className="text-sm text-slate-500">KYC, approval, online status and fleet assignment.</p>
      </div>
      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Vendor</th>
              <th>KYC</th>
              <th>Status</th>
              <th>Online</th>
              <th>Rating</th>
              <th>Trips</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(drivers ?? []).map((d) => (
              <tr key={d.id}>
                <td>{d.user?.fullName}</td>
                <td>{d.user?.phone}</td>
                <td>{d.vendorId ?? '—'}</td>
                <td>{d.kycStatus}</td>
                <td>{d.status}</td>
                <td>{d.isOnline ? 'Online' : 'Offline'}</td>
                <td>{Number(d.rating).toFixed(2)}</td>
                <td>{d.totalTrips}</td>
                <td className="space-x-2">
                  {d.status !== 'ACTIVE' && (
                    <button className="btn-secondary" disabled={busyId === d.id} onClick={() => approve(d.id)}>
                      Approve
                    </button>
                  )}
                  {d.status === 'ACTIVE' && (
                    <button className="btn-secondary" disabled={busyId === d.id} onClick={() => suspend(d.id)}>
                      Suspend
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!isLoading && (drivers ?? []).length === 0 && (
              <tr>
                <td colSpan={9} className="py-6 text-center text-slate-400">
                  No drivers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
