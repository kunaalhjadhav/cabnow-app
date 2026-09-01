'use client';

import { useState } from 'react';
import { useApiSwr } from '@/lib/useApiSwr';
import { api } from '@/lib/api';

export default function CorporatePage() {
  const { data: companies, isLoading, mutate } = useApiSwr<any[]>('/corporate/companies');
  const [form, setForm] = useState({ legalName: '', displayName: '', contactEmail: '', contactPhone: '', creditLimit: 100000 });
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/corporate/companies', form);
      setForm({ legalName: '', displayName: '', contactEmail: '', contactPhone: '', creditLimit: 100000 });
      await mutate();
    } finally {
      setBusy(false);
    }
  }

  async function approve(id: string) {
    await api.patch(`/corporate/companies/${id}/approve`);
    await mutate();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Corporate companies</h1>
        <p className="text-sm text-slate-500">Onboard a company, set its credit limit, then invite bookers/approvers from the corporate portal.</p>
      </div>

      <form onSubmit={create} className="card grid grid-cols-1 gap-3 md:grid-cols-5">
        <input className="input" placeholder="Legal name" value={form.legalName} onChange={(e) => setForm({ ...form, legalName: e.target.value })} required />
        <input className="input" placeholder="Display name" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} required />
        <input className="input" placeholder="Contact email" type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} required />
        <input className="input" placeholder="Contact phone" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} required />
        <input className="input" type="number" placeholder="Credit limit" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: Number(e.target.value) })} required />
        <button className="btn-primary md:col-span-5" disabled={busy} type="submit">Add company</button>
      </form>

      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr><th>Company</th><th>Contact</th><th>Credit limit</th><th>Credit used</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {(companies ?? []).map((c) => (
              <tr key={c.id}>
                <td>{c.displayName}</td>
                <td>{c.contactEmail}<br /><span className="text-xs text-slate-400">{c.contactPhone}</span></td>
                <td>₹{c.creditLimit}</td>
                <td>₹{c.creditUsed}</td>
                <td>{c.status}</td>
                <td>{c.status !== 'ACTIVE' && <button className="btn-secondary" onClick={() => approve(c.id)}>Approve</button>}</td>
              </tr>
            ))}
            {!isLoading && (companies ?? []).length === 0 && (
              <tr><td colSpan={6} className="py-6 text-center text-slate-400">No corporate companies yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
