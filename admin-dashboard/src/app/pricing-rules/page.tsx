'use client';

import { useState } from 'react';
import { useApiSwr } from '@/lib/useApiSwr';
import { api } from '@/lib/api';

const RULE_TYPES = [
  'BASE_FARE', 'PER_KM', 'PER_MINUTE', 'MINIMUM_FARE', 'WAITING_CHARGE', 'EXTRA_STOP_CHARGE',
  'TOLL', 'PARKING', 'AIRPORT_SURCHARGE', 'NIGHT_SURCHARGE', 'SURGE', 'CANCELLATION_FEE', 'TAX', 'DISCOUNT', 'PACKAGE_FARE',
];

export default function PricingRulesPage() {
  const { data: rules, isLoading, mutate } = useApiSwr<any[]>('/pricing-rules');
  const { data: categories } = useApiSwr<any[]>('/vehicle-categories');
  const [form, setForm] = useState({ name: '', type: 'BASE_FARE', value: 0, isPercentage: false, categoryId: '' });
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/pricing-rules', { ...form, categoryId: form.categoryId || undefined });
      setForm({ name: '', type: 'BASE_FARE', value: 0, isPercentage: false, categoryId: '' });
      await mutate();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    await api.delete(`/pricing-rules/${id}`);
    await mutate();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Pricing rules</h1>
        <p className="text-sm text-slate-500">
          Every fare component (base fare, per-km, per-minute, waiting, surcharges, tax, discounts, surge…) is a configurable
          rule here — nothing is hard-coded in the app. Scope a rule to a vehicle category, corporate company, city/zone or
          package type; the most specific active rule wins.
        </p>
      </div>

      <form onSubmit={create} className="card grid grid-cols-1 gap-3 md:grid-cols-6">
        <input className="input md:col-span-2" placeholder="Rule name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          {RULE_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select className="input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
          <option value="">All categories</option>
          {(categories ?? []).map((c: any) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <input className="input" type="number" step="0.01" placeholder="Value" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} required />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.isPercentage} onChange={(e) => setForm({ ...form, isPercentage: e.target.checked })} />
          %
        </label>
        <button className="btn-primary md:col-span-6" disabled={busy} type="submit">Add pricing rule</button>
      </form>

      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th><th>Type</th><th>Category</th><th>Value</th><th>Active</th><th></th>
            </tr>
          </thead>
          <tbody>
            {(rules ?? []).map((r) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td>{r.type}</td>
                <td>{categories?.find((c: any) => c.id === r.categoryId)?.name ?? 'All'}</td>
                <td>{r.isPercentage ? `${r.value}%` : `₹${r.value}`}</td>
                <td>{r.isActive ? 'Yes' : 'No'}</td>
                <td><button className="btn-secondary" onClick={() => remove(r.id)}>Deactivate</button></td>
              </tr>
            ))}
            {!isLoading && (rules ?? []).length === 0 && (
              <tr><td colSpan={6} className="py-6 text-center text-slate-400">No pricing rules yet — run the seed script or add one above.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
