'use client';

import { useState } from 'react';
import { useApiSwr } from '@/lib/useApiSwr';
import { api } from '@/lib/api';

export default function VehiclesPage() {
  const { data: vehicles, isLoading, mutate } = useApiSwr<any[]>('/vehicles');
  const [busyId, setBusyId] = useState<string | null>(null);

  async function approve(id: string) {
    setBusyId(id);
    try {
      await api.patch(`/vehicles/${id}/approve`);
      await mutate();
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id: string) {
    setBusyId(id);
    try {
      await api.patch(`/vehicles/${id}/reject`);
      await mutate();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Vehicles</h1>
        <p className="text-sm text-slate-500">
          A vehicle cannot be dispatched until an admin approves its documents (RC, insurance, permit, fitness).
        </p>
      </div>
      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Registration</th>
              <th>Make/Model</th>
              <th>Category</th>
              <th>Seats</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(vehicles ?? []).map((v) => (
              <tr key={v.id}>
                <td>{v.registrationNumber}</td>
                <td>{v.make} {v.model} ({v.year})</td>
                <td>{v.category?.name}</td>
                <td>{v.seatingCapacity}</td>
                <td>{v.status}</td>
                <td className="space-x-2">
                  {v.status !== 'ACTIVE' && (
                    <button className="btn-secondary" disabled={busyId === v.id} onClick={() => approve(v.id)}>
                      Approve
                    </button>
                  )}
                  {v.status === 'PENDING_APPROVAL' && (
                    <button className="btn-secondary" disabled={busyId === v.id} onClick={() => reject(v.id)}>
                      Reject
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!isLoading && (vehicles ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-400">
                  No vehicles yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
