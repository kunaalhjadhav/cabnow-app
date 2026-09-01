'use client';

import { useState } from 'react';
import { useApiSwr } from '@/lib/useApiSwr';
import { api } from '@/lib/api';

export default function VehicleCategoriesPage() {
  const { data: categories, isLoading, mutate } = useApiSwr<any[]>('/vehicle-categories');
  const [form, setForm] = useState({ name: '', seatingCapacity: 4, description: '' });
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/vehicle-categories', form);
      setForm({ name: '', seatingCapacity: 4, description: '' });
      await mutate();
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    await api.patch(`/vehicle-categories/${id}`, { isActive: !isActive });
    await mutate();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Vehicle Categories</h1>
        <p className="text-sm text-slate-500">Mini, Sedan, SUV, Luxury, corporate-specific classes, etc.</p>
      </div>

      <form onSubmit={create} className="card grid grid-cols-1 gap-3 md:grid-cols-4">
        <input className="input" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input
          className="input"
          type="number"
          min={1}
          placeholder="Seats"
          value={form.seatingCapacity}
          onChange={(e) => setForm({ ...form, seatingCapacity: Number(e.target.value) })}
          required
        />
        <input
          className="input"
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <button className="btn-primary" disabled={busy} type="submit">
          Add category
        </button>
      </form>

      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Seats</th>
              <th>Description</th>
              <th>Active</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(categories ?? []).map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.seatingCapacity}</td>
                <td>{c.description ?? '—'}</td>
                <td>{c.isActive ? 'Yes' : 'No'}</td>
                <td>
                  <button className="btn-secondary" onClick={() => toggleActive(c.id, c.isActive)}>
                    {c.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
            {!isLoading && (categories ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-400">
                  No categories yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
