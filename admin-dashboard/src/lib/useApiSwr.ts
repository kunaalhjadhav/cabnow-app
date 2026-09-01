'use client';

import useSWR from 'swr';
import { api } from './api';

export function useApiSwr<T>(path: string | null) {
  return useSWR<T>(path, (p: string) => api.get<T>(p));
}
