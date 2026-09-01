'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api } from './api';

interface SessionUser {
  id: string;
  phone: string;
  role: string;
  companyId?: string;
}

interface AuthContextValue {
  user: SessionUser | null;
  loading: boolean;
  requestOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, code: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const CORPORATE_ROLES = ['CORPORATE_ADMIN', 'CORPORATE_BOOKER', 'CORPORATE_APPROVER'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const stored = window.localStorage.getItem('corporateUser');
    if (stored) setUser(JSON.parse(stored));
    setLoading(false);
  }, []);

  async function requestOtp(phone: string) {
    await api.post('/auth/otp/request', { phone, purpose: 'LOGIN' });
  }

  async function verifyOtp(phone: string, code: string) {
    const result = await api.post<{ accessToken: string; refreshToken: string; user: SessionUser }>('/auth/otp/verify', {
      phone,
      code,
    });
    if (!CORPORATE_ROLES.includes(result.user.role)) {
      throw new Error('This portal is for corporate admins, bookers and approvers only.');
    }
    window.localStorage.setItem('accessToken', result.accessToken);
    window.localStorage.setItem('refreshToken', result.refreshToken);
    window.localStorage.setItem('corporateUser', JSON.stringify(result.user));
    setUser(result.user);
    router.push('/');
  }

  function logout() {
    window.localStorage.removeItem('accessToken');
    window.localStorage.removeItem('refreshToken');
    window.localStorage.removeItem('corporateUser');
    setUser(null);
    router.push('/login');
  }

  return (
    <AuthContext.Provider value={{ user, loading, requestOtp, verifyOtp, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
