'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Claim, Customer, Dealer } from './types';

/**
 * Data store backed by the MySQL database through the /api routes.
 * Changes are applied on screen immediately and saved to the server in the background;
 * if a save fails, `error` is set so the UI can warn and the screen can be reloaded.
 */
interface Data {
  claims: Claim[];
  dealers: Dealer[];
  customers: Customer[];
}

interface Store extends Data {
  ready: boolean;
  error: string | null;
  saveClaim: (c: Claim) => void;
  deleteClaim: (id: string) => void;
  nextSNo: () => number;
  saveCustomer: (c: Customer) => void;
  saveDealer: (d: Dealer) => void;
  /** Re-read everything from the database (drops unsaved local state). */
  reload: () => Promise<void>;
  exportBackup: () => string;
}

const Ctx = createContext<Store | null>(null);

async function api(path: string, method: 'PUT' | 'DELETE', body?: unknown) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} failed (${res.status})`);
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data>({ claims: [], dealers: [], customers: [] });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const res = await fetch('/api/data', { cache: 'no-store' });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      setData((await res.json()) as Data);
      setError(null);
    } catch (e) {
      setError(`Database se data nahi aaya: ${(e as Error).message}`);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const persist = useCallback((p: Promise<void>) => {
    p.then(() => setError(null)).catch((e: Error) => setError(`Save nahi hua: ${e.message}. Page reload karein.`));
  }, []);

  const saveClaim = useCallback(
    (c: Claim) => {
      setData((d) => {
        const i = d.claims.findIndex((x) => x.id === c.id);
        return { ...d, claims: i >= 0 ? d.claims.map((x) => (x.id === c.id ? c : x)) : [...d.claims, c] };
      });
      persist(api(`/api/claims/${encodeURIComponent(c.id)}`, 'PUT', c));
    },
    [persist],
  );

  const deleteClaim = useCallback(
    (id: string) => {
      setData((d) => ({ ...d, claims: d.claims.filter((c) => c.id !== id) }));
      persist(api(`/api/claims/${encodeURIComponent(id)}`, 'DELETE'));
    },
    [persist],
  );

  const nextSNo = useCallback(() => data.claims.reduce((m, c) => Math.max(m, c.sNo ?? 0), 0) + 1, [data.claims]);

  const saveCustomer = useCallback(
    (c: Customer) => {
      setData((d) => {
        const i = d.customers.findIndex((x) => x.id === c.id);
        return { ...d, customers: i >= 0 ? d.customers.map((x) => (x.id === c.id ? c : x)) : [...d.customers, c] };
      });
      persist(api(`/api/customers/${encodeURIComponent(c.id)}`, 'PUT', c));
    },
    [persist],
  );

  const saveDealer = useCallback(
    (x: Dealer) => {
      setData((d) => {
        const i = d.dealers.findIndex((y) => y.id === x.id);
        return { ...d, dealers: i >= 0 ? d.dealers.map((y) => (y.id === x.id ? x : y)) : [...d.dealers, x] };
      });
      persist(api(`/api/dealers/${encodeURIComponent(x.id)}`, 'PUT', x));
    },
    [persist],
  );

  const exportBackup = useCallback(() => JSON.stringify(data, null, 1), [data]);

  const value = useMemo<Store>(
    () => ({ ...data, ready, error, saveClaim, deleteClaim, nextSNo, saveCustomer, saveDealer, reload, exportBackup }),
    [data, ready, error, saveClaim, deleteClaim, nextSNo, saveCustomer, saveDealer, reload, exportBackup],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore must be used inside StoreProvider');
  return s;
}

export function newId(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
