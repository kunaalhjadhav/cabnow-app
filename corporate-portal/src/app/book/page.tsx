'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useApiSwr } from '@/lib/useApiSwr';
import { api } from '@/lib/api';

interface StopForm {
  label: string;
  lat: string;
  lng: string;
  plannedWaitMinutes: number;
}

export default function BookTripPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { data: categories } = useApiSwr<any[]>('/vehicle-categories?activeOnly=true');
  const { data: employees } = useApiSwr<any[]>(user?.companyId ? `/corporate/companies/${user.companyId}/employees` : null);
  const { data: packages } = useApiSwr<any[]>(user?.companyId ? `/packages?companyId=${user.companyId}` : null);

  const [form, setForm] = useState({
    employeeId: '',
    packageId: '',
    categoryId: '',
    pickupLabel: '',
    pickupLat: '',
    pickupLng: '',
    dropLabel: '',
    dropLat: '',
    dropLng: '',
    scheduledAt: '',
    passengerName: '',
    passengerPhone: '',
    specialInstructions: '',
  });
  const [stops, setStops] = useState<StopForm[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<any>(null);

  function addStop() {
    setStops([...stops, { label: '', lat: '', lng: '', plannedWaitMinutes: 0 }]);
  }
  function updateStop(i: number, patch: Partial<StopForm>) {
    setStops(stops.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }
  function removeStop(i: number) {
    setStops(stops.filter((_, idx) => idx !== i));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setCreated(null);
    try {
      const payload = {
        source: 'CORPORATE_PORTAL',
        type: form.packageId ? 'CORPORATE_PACKAGE' : 'SCHEDULED',
        companyId: user?.companyId,
        employeeId: form.employeeId || undefined,
        packageId: form.packageId || undefined,
        categoryId: form.categoryId,
        pickup: { label: form.pickupLabel, lat: Number(form.pickupLat), lng: Number(form.pickupLng) },
        drop: { label: form.dropLabel, lat: Number(form.dropLat), lng: Number(form.dropLng) },
        stops: stops.map((s) => ({ label: s.label, lat: Number(s.lat), lng: Number(s.lng), plannedWaitMinutes: s.plannedWaitMinutes })),
        scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : undefined,
        passengerName: form.passengerName || undefined,
        passengerPhone: form.passengerPhone || undefined,
        specialInstructions: form.specialInstructions || undefined,
      };
      const booking = await api.post('/bookings', payload);
      setCreated(booking);
    } catch (err: any) {
      setError(err.message ?? 'Failed to create booking');
    } finally {
      setBusy(false);
    }
  }

  if (created) {
    return (
      <div className="card max-w-xl">
        <h2 className="text-lg font-semibold">
          {created.status === 'PENDING_APPROVAL' ? 'Booking submitted for approval' : 'Booking confirmed'}
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          {created.pickupLabel} → {created.dropLabel} · Estimated fare ₹{created.estimatedFare}
        </p>
        <p className="mt-1 text-sm text-slate-500">Status: {created.status}</p>
        <div className="mt-4 flex gap-2">
          <button className="btn-primary" onClick={() => router.push('/bookings')}>View all bookings</button>
          <button className="btn-secondary" onClick={() => setCreated(null)}>Book another trip</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Book a transportation package</h1>
        <p className="text-sm text-slate-500">
          Pickup, destination, any number of intermediate stops with waiting time, vehicle category, schedule, passenger
          details and special instructions — everything the platform needs to run the trip end-to-end.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-5">
        <div className="card space-y-3">
          <h2 className="text-sm font-semibold text-slate-700">Who is this for?</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <select className="input" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}>
              <option value="">No specific employee record</option>
              {(employees ?? []).map((emp: any) => <option key={emp.id} value={emp.id}>{emp.fullName}</option>)}
            </select>
            <select className="input" value={form.packageId} onChange={(e) => setForm({ ...form, packageId: e.target.value })}>
              <option value="">Ad-hoc trip (not against a package)</option>
              {(packages ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input className="input" placeholder="Passenger name" value={form.passengerName} onChange={(e) => setForm({ ...form, passengerName: e.target.value })} />
            <input className="input" placeholder="Passenger phone" value={form.passengerPhone} onChange={(e) => setForm({ ...form, passengerPhone: e.target.value })} />
          </div>
        </div>

        <div className="card space-y-3">
          <h2 className="text-sm font-semibold text-slate-700">Route</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <input className="input md:col-span-1" placeholder="Pickup label" value={form.pickupLabel} onChange={(e) => setForm({ ...form, pickupLabel: e.target.value })} required />
            <input className="input" placeholder="Pickup latitude" value={form.pickupLat} onChange={(e) => setForm({ ...form, pickupLat: e.target.value })} required />
            <input className="input" placeholder="Pickup longitude" value={form.pickupLng} onChange={(e) => setForm({ ...form, pickupLng: e.target.value })} required />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <input className="input md:col-span-1" placeholder="Drop label" value={form.dropLabel} onChange={(e) => setForm({ ...form, dropLabel: e.target.value })} required />
            <input className="input" placeholder="Drop latitude" value={form.dropLat} onChange={(e) => setForm({ ...form, dropLat: e.target.value })} required />
            <input className="input" placeholder="Drop longitude" value={form.dropLng} onChange={(e) => setForm({ ...form, dropLng: e.target.value })} required />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase text-slate-500">Intermediate stops</h3>
              <button type="button" className="btn-secondary" onClick={addStop}>+ Add stop</button>
            </div>
            {stops.map((s, i) => (
              <div key={i} className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 p-3 md:grid-cols-5">
                <input className="input md:col-span-2" placeholder="Stop label" value={s.label} onChange={(e) => updateStop(i, { label: e.target.value })} />
                <input className="input" placeholder="Lat" value={s.lat} onChange={(e) => updateStop(i, { lat: e.target.value })} />
                <input className="input" placeholder="Lng" value={s.lng} onChange={(e) => updateStop(i, { lng: e.target.value })} />
                <div className="flex items-center gap-2">
                  <input className="input" type="number" min={0} placeholder="Wait (min)" value={s.plannedWaitMinutes} onChange={(e) => updateStop(i, { plannedWaitMinutes: Number(e.target.value) })} />
                  <button type="button" className="text-sm text-red-600" onClick={() => removeStop(i)}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card space-y-3">
          <h2 className="text-sm font-semibold text-slate-700">Vehicle & schedule</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <select className="input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} required>
              <option value="">Select vehicle category…</option>
              {(categories ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input className="input" type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} />
          </div>
          <textarea
            className="input"
            placeholder="Special instructions (e.g. call on arrival, luggage assistance, meeting room number)"
            value={form.specialInstructions}
            onChange={(e) => setForm({ ...form, specialInstructions: e.target.value })}
            rows={3}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary" disabled={busy} type="submit">
          {busy ? 'Submitting…' : 'Book trip'}
        </button>
      </form>
    </div>
  );
}
