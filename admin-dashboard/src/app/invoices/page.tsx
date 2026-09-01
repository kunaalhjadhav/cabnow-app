'use client';

import { useState } from 'react';
import { useApiSwr } from '@/lib/useApiSwr';
import { api } from '@/lib/api';

export default function InvoicesPage() {
  const { data: companies } = useApiSwr<any[]>('/corporate/companies');
  const [companyId, setCompanyId] = useState('');
  const { data: invoices, mutate } = useApiSwr<any[]>(companyId ? `/corporate/companies/${companyId}/invoices` : null);
  const [range, setRange] = useState({ periodStart: '', periodEnd: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (!companyId) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/corporate/companies/${companyId}/invoices/generate`, range);
      await mutate();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Corporate invoices</h1>
        <p className="text-sm text-slate-500">Batch a company's completed trips for a billing period into one invoice.</p>
      </div>

      <div className="card grid grid-cols-1 gap-3 md:grid-cols-4">
        <select className="input" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
          <option value="">Select a company…</option>
          {(companies ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.displayName}</option>)}
        </select>
        <input className="input" type="date" value={range.periodStart} onChange={(e) => setRange({ ...range, periodStart: e.target.value })} />
        <input className="input" type="date" value={range.periodEnd} onChange={(e) => setRange({ ...range, periodEnd: e.target.value })} />
        <button className="btn-primary" disabled={busy || !companyId} onClick={generate}>Generate invoice</button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr><th>Invoice #</th><th>Period</th><th>Total</th><th>Paid</th><th>Status</th></tr>
          </thead>
          <tbody>
            {(invoices ?? []).map((inv) => (
              <tr key={inv.id}>
                <td>{inv.invoiceNumber}</td>
                <td>{new Date(inv.periodStart).toLocaleDateString()} – {new Date(inv.periodEnd).toLocaleDateString()}</td>
                <td>₹{inv.totalAmount}</td>
                <td>₹{inv.amountPaid}</td>
                <td>{inv.status}</td>
              </tr>
            ))}
            {companyId && (invoices ?? []).length === 0 && (
              <tr><td colSpan={5} className="py-6 text-center text-slate-400">No invoices for this company yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
