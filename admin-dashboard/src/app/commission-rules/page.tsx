'use client';

import { useState } from 'react';
import { useApiSwr } from '@/lib/useApiSwr';
import { api } from '@/lib/api';

export default function CommissionRulesPage() {
  const { data: rules, isLoading, mutate } = useApiSwr<any[]>('/commission-rules');
  const { data: vendors } = useApiSwr<any[]>('/vendors');
  const [form, setForm] = useState({ name: '', basis: 'PERCENTAGE', value: 20, vendorId: '' });
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/commission-rules', { ...form, vendorId: form.vendorId || undefined });
      setForm({ name: '', basis: 'PERCENTAGE', value: 20, vendorId: '' });
      await mutate();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    await api.delete(`/commission-rules/${id}`);
    await mutate();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Commission rules</h1>
        <p className="text-sm text-slate-500">
          Example: a trip's final fare is ₹2,500. A 20% commission rule scoped to a vendor yields ₹500 commission and a
          ₹2,000 vendor/driver payable — computed automatically at trip completion, never hard-coded.
        </p>
      </div>

      <form onSubmit={create} className="card grid grid-cols-1 gap-3 md:grid-cols-5">
        <input className="input md:col-span-2" placeholder="Rule name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <select className="input" value={form.basis} onChange={(e) => setForm({ ...form, basis: e.target.value })}>
          <option value="PERCENTAGE">Percentage</option>
          <option value="FIXED_AMOUNT">Fixed amount</option>
        </select>
        <select className="input" value={form.vendorId} onChange={(e) => setForm({ ...form, vendorId: e.target.value })}>
          <option value="">All vendors</option>
          {(vendors ?? []).map((v: any) => (
            <option key={v.id} value={v.id}>{v.displayName}</option>
          ))}
        </select>
        <input className="input" type="number" step="0.01" placeholder="Value" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} required />
        <button className="btn-primary md:col-span-5" disabled={busy} type="submit">Add commission rule</button>
      </form>

      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr><th>Name</th><th>Basis</th><th>Vendor</th><th>Value</th><th>Active</th><th></th></tr>
          </thead>
          <tbody>
            {(rules ?? []).map((r) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td>{r.basis}</td>
                <td>{vendors?.find((v: any) => v.id === r.vendorId)?.displayName ?? 'All'}</td>
                <td>{r.basis === 'PERCENTAGE' ? `${r.value}%` : `₹${r.value}`}</td>
                <td>{r.isActive ? 'Yes' : 'No'}</td>
                <td><button className="btn-secondary" onClick={() => remove(r.id)}>Deactivate</button></td>
              </tr>
            ))}
            {!isLoading && (rules ?? []).length === 0 && (
              <tr><td colSpan={6} className="py-6 text-center text-slate-400">No commission rules yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
