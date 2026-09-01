'use client';

import { useState } from 'react';
import { useApiSwr } from '@/lib/useApiSwr';
import { api } from '@/lib/api';

export default function SettlementsPage() {
  const { data: vendors } = useApiSwr<any[]>('/vendors');
  const [vendorId, setVendorId] = useState('');
  const { data: settlements, mutate } = useApiSwr<any[]>(vendorId ? `/vendors/${vendorId}/settlements` : null);
  const [range, setRange] = useState({ periodStart: '', periodEnd: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (!vendorId) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/vendors/${vendorId}/settlements/generate`, range);
      await mutate();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function markPaid(id: string) {
    const ref = window.prompt('Payout reference / UTR number');
    if (!ref) return;
    await api.post(`/settlements/${id}/mark-paid`, { payoutReference: ref });
    await mutate();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Vendor settlements</h1>
        <p className="text-sm text-slate-500">Batches a vendor's completed trips into one payable settlement (gross fare − commission = net payable).</p>
      </div>

      <div className="card grid grid-cols-1 gap-3 md:grid-cols-4">
        <select className="input" value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
          <option value="">Select a vendor…</option>
          {(vendors ?? []).map((v: any) => <option key={v.id} value={v.id}>{v.displayName}</option>)}
        </select>
        <input className="input" type="date" value={range.periodStart} onChange={(e) => setRange({ ...range, periodStart: e.target.value })} />
        <input className="input" type="date" value={range.periodEnd} onChange={(e) => setRange({ ...range, periodEnd: e.target.value })} />
        <button className="btn-primary" disabled={busy || !vendorId} onClick={generate}>Generate settlement</button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr><th>Period</th><th>Trips</th><th>Gross</th><th>Commission</th><th>Net payable</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {(settlements ?? []).map((s) => (
              <tr key={s.id}>
                <td>{new Date(s.periodStart).toLocaleDateString()} – {new Date(s.periodEnd).toLocaleDateString()}</td>
                <td>{s.tripCount}</td>
                <td>₹{s.grossAmount}</td>
                <td>₹{s.commissionAmount}</td>
                <td>₹{s.netPayable}</td>
                <td>{s.status}</td>
                <td>{s.status === 'PENDING' && <button className="btn-secondary" onClick={() => markPaid(s.id)}>Mark paid</button>}</td>
              </tr>
            ))}
            {vendorId && (settlements ?? []).length === 0 && (
              <tr><td colSpan={7} className="py-6 text-center text-slate-400">No settlements for this vendor yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
