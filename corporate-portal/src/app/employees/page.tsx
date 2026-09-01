'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useApiSwr } from '@/lib/useApiSwr';
import { api } from '@/lib/api';

export default function EmployeesPage() {
  const { user } = useAuth();
  const companyId = user?.companyId;
  const { data: employees, isLoading, mutate } = useApiSwr<any[]>(companyId ? `/corporate/companies/${companyId}/employees` : null);
  const { data: users, mutate: mutateUsers } = useApiSwr<any[]>(companyId ? `/corporate/companies/${companyId}/users` : null);

  const [empForm, setEmpForm] = useState({ fullName: '', phone: '', department: '', costCenter: '' });
  const [inviteForm, setInviteForm] = useState({ fullName: '', phone: '', role: 'CORPORATE_BOOKER', department: '' });
  const [busy, setBusy] = useState(false);

  async function addEmployee(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post(`/corporate/companies/${companyId}/employees`, empForm);
      setEmpForm({ fullName: '', phone: '', department: '', costCenter: '' });
      await mutate();
    } finally {
      setBusy(false);
    }
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post(`/corporate/companies/${companyId}/users`, inviteForm);
      setInviteForm({ fullName: '', phone: '', role: 'CORPORATE_BOOKER', department: '' });
      await mutateUsers();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Employees &amp; bookers</h1>
        <p className="text-sm text-slate-500">
          Employees are the passengers you book trips for. Bookers/approvers/admins are portal users who can log in
          here — invited by phone number, they sign in the same way you did (OTP).
        </p>
      </div>

      <div className="card">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Employees (passengers)</h2>
        <form onSubmit={addEmployee} className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-5">
          <input className="input" placeholder="Full name" value={empForm.fullName} onChange={(e) => setEmpForm({ ...empForm, fullName: e.target.value })} required />
          <input className="input" placeholder="Phone" value={empForm.phone} onChange={(e) => setEmpForm({ ...empForm, phone: e.target.value })} required />
          <input className="input" placeholder="Department" value={empForm.department} onChange={(e) => setEmpForm({ ...empForm, department: e.target.value })} />
          <input className="input" placeholder="Cost center" value={empForm.costCenter} onChange={(e) => setEmpForm({ ...empForm, costCenter: e.target.value })} />
          <button className="btn-primary" disabled={busy} type="submit">Add employee</button>
        </form>
        <table className="data-table">
          <thead><tr><th>Name</th><th>Phone</th><th>Department</th><th>Active</th></tr></thead>
          <tbody>
            {(employees ?? []).map((emp) => (
              <tr key={emp.id}><td>{emp.fullName}</td><td>{emp.phone}</td><td>{emp.department ?? '—'}</td><td>{emp.isActive ? 'Yes' : 'No'}</td></tr>
            ))}
            {!isLoading && (employees ?? []).length === 0 && (
              <tr><td colSpan={4} className="py-6 text-center text-slate-400">No employees added yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Portal users (bookers / approvers / admins)</h2>
        <form onSubmit={invite} className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-5">
          <input className="input" placeholder="Full name" value={inviteForm.fullName} onChange={(e) => setInviteForm({ ...inviteForm, fullName: e.target.value })} required />
          <input className="input" placeholder="Phone" value={inviteForm.phone} onChange={(e) => setInviteForm({ ...inviteForm, phone: e.target.value })} required />
          <select className="input" value={inviteForm.role} onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}>
            <option value="CORPORATE_BOOKER">Booker</option>
            <option value="CORPORATE_APPROVER">Approver</option>
            <option value="CORPORATE_ADMIN">Admin</option>
          </select>
          <input className="input" placeholder="Department" value={inviteForm.department} onChange={(e) => setInviteForm({ ...inviteForm, department: e.target.value })} />
          <button className="btn-primary" disabled={busy} type="submit">Invite user</button>
        </form>
        <table className="data-table">
          <thead><tr><th>Name</th><th>Phone</th><th>Role</th></tr></thead>
          <tbody>
            {(users ?? []).map((u: any) => (
              <tr key={u.id}><td>{u.user?.fullName}</td><td>{u.user?.phone}</td><td>{u.role}</td></tr>
            ))}
            {(users ?? []).length === 0 && (
              <tr><td colSpan={3} className="py-6 text-center text-slate-400">No portal users invited yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
