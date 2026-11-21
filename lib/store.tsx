'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import seedClaims from '@/data/seed/claims.json';
import seedDealers from '@/data/seed/dealers.json';
import seedCustomers from '@/data/seed/customers.json';
import type { Claim, Customer, Dealer } from './types';

/**
 * Phase 1 data store: lives in the browser (localStorage), seeded from data/seed.
 * When the MySQL database is connected (Phase 2) these functions become API calls;
 * the screens keep using the same hook.
 */
const KEY = 'slm-aftersales-store-v1';

interface Data {
  claims: Claim[];
  dealers: Dealer[];
  customers: Customer[];
}

interface Store extends Data {
  ready: boolean;
  saveClaim: (c: Claim) => void;
  deleteClaim: (id: string) => void;
  nextSNo: () => number;
  saveCustomer: (c: Customer) => void;
  saveDealer: (d: Dealer) => void;
  resetToSeed: () => void;
  exportBackup: () => string;
}

const seed = (): Data => ({
  claims: seedClaims as unknown as Claim[],
  dealers: (seedDealers as unknown as Dealer[]).map((d) => ({ ...d, brands: d.brands ?? [], note: d.note ?? '' })),
  customers: (seedCustomers as unknown as Customer[]).map((c) => ({ ...c, drivers: c.drivers ?? [], vehicles: c.vehicles ?? [] })),
});

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data>(seed);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setData(JSON.parse(raw) as Data);
    } catch {
      /* corrupted or unavailable storage: keep seed */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      /* storage full: data stays in memory for this session */
    }
  }, [data, ready]);

  const saveClaim = useCallback((c: Claim) => {
    setData((d) => {
      const i = d.claims.findIndex((x) => x.id === c.id);
      const claims = i >= 0 ? d.claims.map((x) => (x.id === c.id ? c : x)) : [...d.claims, c];
      return { ...d, claims };
    });
  }, []);

  const deleteClaim = useCallback((id: string) => setData((d) => ({ ...d, claims: d.claims.filter((c) => c.id !== id) })), []);

  const nextSNo = useCallback(() => data.claims.reduce((m, c) => Math.max(m, c.sNo ?? 0), 0) + 1, [data.claims]);

  const saveCustomer = useCallback((c: Customer) => {
    setData((d) => {
      const i = d.customers.findIndex((x) => x.id === c.id);
      return { ...d, customers: i >= 0 ? d.customers.map((x) => (x.id === c.id ? c : x)) : [...d.customers, c] };
    });
  }, []);

  const saveDealer = useCallback((x: Dealer) => {
    setData((d) => {
      const i = d.dealers.findIndex((y) => y.id === x.id);
      return { ...d, dealers: i >= 0 ? d.dealers.map((y) => (y.id === x.id ? x : y)) : [...d.dealers, x] };
    });
  }, []);

  const resetToSeed = useCallback(() => setData(seed()), []);
  const exportBackup = useCallback(() => JSON.stringify(data, null, 1), [data]);

  const value = useMemo<Store>(
    () => ({ ...data, ready, saveClaim, deleteClaim, nextSNo, saveCustomer, saveDealer, resetToSeed, exportBackup }),
    [data, ready, saveClaim, deleteClaim, nextSNo, saveCustomer, saveDealer, resetToSeed, exportBackup],
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
