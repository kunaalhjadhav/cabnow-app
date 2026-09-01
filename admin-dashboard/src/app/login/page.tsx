'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const { requestOtp, verifyOtp } = useAuth();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await requestOtp(phone);
      setStep('otp');
    } catch (err: any) {
      setError(err.message ?? 'Failed to send OTP');
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await verifyOtp(phone, code);
    } catch (err: any) {
      setError(err.message ?? 'Invalid OTP');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="card w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="text-xl font-semibold text-brand-700">Cab Platform</div>
          <div className="text-sm text-slate-500">Admin Dashboard sign-in</div>
        </div>

        {step === 'phone' ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Phone number</label>
              <input
                className="input"
                placeholder="+919876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button className="btn-primary w-full" disabled={busy} type="submit">
              Send OTP
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Enter the OTP sent to {phone}</label>
              <input className="input" value={code} onChange={(e) => setCode(e.target.value)} required maxLength={8} />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button className="btn-primary w-full" disabled={busy} type="submit">
              Verify &amp; sign in
            </button>
            <button type="button" className="w-full text-center text-xs text-slate-400" onClick={() => setStep('phone')}>
              Use a different number
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-slate-400">
          Only accounts with an admin role (seeded via the backend) can sign in here.
        </p>
      </div>
    </div>
  );
}
