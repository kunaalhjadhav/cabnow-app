'use client';

import { useAuth } from '@/lib/auth';
import { useApiSwr } from '@/lib/useApiSwr';
import { api } from '@/lib/api';

export default function RouteApprovalsPage() {
  const { user } = useAuth();
  const { data: pending, isLoading, mutate } = useApiSwr<any[]>(
    user?.companyId ? `/route-changes/pending-approvals?companyId=${user.companyId}` : null,
  );

  async function approve(id: string) {
    await api.post(`/route-changes/${id}/approve`);
    await mutate();
  }

  async function reject(id: string) {
    const reason = window.prompt('Reason for rejecting this route change?') ?? undefined;
    await api.post(`/route-changes/${id}/reject`, { reason });
    await mutate();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Route change approvals</h1>
        <p className="text-sm text-slate-500">
          When a passenger or driver modifies the route mid-trip and your company's route-editing rules require
          approval, the request lands here with the original route, the new route, and the priced impact.
        </p>
      </div>
      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr><th>Trip</th><th>Requested</th><th>+Distance</th><th>+Time</th><th>+Fare</th><th>Reason</th><th></th></tr>
          </thead>
          <tbody>
            {(pending ?? []).map((rc) => (
              <tr key={rc.id}>
                <td>{rc.trip?.booking?.pickupLabel} → {rc.trip?.booking?.dropLabel}</td>
                <td>{new Date(rc.requestedAt).toLocaleString()}</td>
                <td>{rc.additionalDistanceKm} km</td>
                <td>{rc.additionalTimeMinutes} min</td>
                <td>₹{rc.additionalFare}</td>
                <td>{rc.reason ?? '—'}</td>
                <td className="space-x-2">
                  <button className="btn-primary" onClick={() => approve(rc.id)}>Approve</button>
                  <button className="btn-secondary" onClick={() => reject(rc.id)}>Reject</button>
                </td>
              </tr>
            ))}
            {!isLoading && (pending ?? []).length === 0 && (
              <tr><td colSpan={7} className="py-6 text-center text-slate-400">No route changes waiting on approval.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
