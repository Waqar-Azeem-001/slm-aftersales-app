'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import { BRANDS, fmtDate, monthKey, monthLabel } from '@/lib/rules';
import { Card, DecisionTag, PageTitle, Stat, btnPrimary, inputCls } from '@/components/ui';

function Bars({ data }: { data: [string, number][] }) {
  const max = Math.max(1, ...data.map((d) => d[1]));
  return (
    <div>
      <div className="flex h-48 items-end gap-1.5 border-b border-zinc-200">
        {data.map(([k, v]) => (
          <div key={k} className="flex flex-1 flex-col items-center justify-end gap-1 text-xs font-bold">
            {v}
            <div className="w-full max-w-8 rounded-t bg-brand" style={{ height: `${(v / max) * 150}px` }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1.5">
        {data.map(([k]) => (
          <span key={k} className="flex-1 text-center text-[11px] text-zinc-500">{k}</span>
        ))}
      </div>
    </div>
  );
}

function HBars({ data, color = 'bg-brand-dark' }: { data: [string, number][]; color?: string }) {
  const max = Math.max(1, ...data.map((d) => d[1]));
  return (
    <div className="flex flex-col gap-3">
      {data.map(([k, v]) => (
        <div key={k}>
          <div className="flex justify-between text-sm"><span className="truncate pr-2">{k}</span><b>{v}</b></div>
          <div className="mt-1 h-2.5 rounded bg-zinc-100"><div className={`h-2.5 rounded ${color}`} style={{ width: `${(v / max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { claims } = useStore();
  const [month, setMonth] = useState('all');
  const [brand, setBrand] = useState('all');
  const confirmed = claims.filter((c) => c.status === 'confirmed');
  const months = useMemo(() => Array.from(new Set(confirmed.map((c) => monthKey(c.happenedDate)))).filter((m) => m !== 'unknown').sort(), [confirmed]);
  const list = confirmed.filter((c) => (month === 'all' || monthKey(c.happenedDate) === month) && (brand === 'all' || c.brand === brand));

  const count = (d: string) => list.filter((c) => c.decision === d).length;
  const pct = (n: number) => (list.length ? `${((n / list.length) * 100).toFixed(1)}%` : '—');
  const group = (f: (c: (typeof list)[number]) => string, n = 6): [string, number][] => {
    const m = new Map<string, number>();
    list.forEach((c) => m.set(f(c), (m.get(f(c)) ?? 0) + 1));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, n);
  };
  const byMonth: [string, number][] = months.slice(-12).map((m) => [monthLabel(m).slice(0, 3), confirmed.filter((c) => monthKey(c.happenedDate) === m && (brand === 'all' || c.brand === brand)).length]);
  const recent = [...list].sort((a, b) => (b.happenedDate ?? '').localeCompare(a.happenedDate ?? '') || (b.sNo ?? 0) - (a.sNo ?? 0)).slice(0, 8);
  const drafts = claims.filter((c) => c.status === 'draft');

  return (
    <>
      <PageTitle title="Tyre Claims Dashboard" sub={month === 'all' ? 'Sab mahine' : monthLabel(month)}>
        <select aria-label="Month" className={`${inputCls} w-44`} value={month} onChange={(e) => setMonth(e.target.value)}>
          <option value="all">All months</option>
          {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>
        <select aria-label="Brand" className={`${inputCls} w-40`} value={brand} onChange={(e) => setBrand(e.target.value)}>
          <option value="all">All brands</option>
          {BRANDS.map((b) => <option key={b}>{b}</option>)}
        </select>
        <Link href="/claims/new" className={btnPrimary}>+ New Claim</Link>
      </PageTitle>

      {drafts.length > 0 && (
        <Link href="/claims?status=draft" className="mb-5 flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 no-underline">
          <span className="font-semibold text-zinc-900">{drafts.length} draft claim{drafts.length > 1 ? 's' : ''} confirm hona baaqi</span>
          <span className="font-bold text-brand">Review →</span>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="TOTAL CLAIMS" value={list.length} />
        <Stat label="CLAIMABLE" value={count('Claimable')} sub={pct(count('Claimable'))} tone="text-green-700" />
        <Stat label="NONCLAIMABLE" value={count('Nonclaimable')} sub={pct(count('Nonclaimable'))} tone="text-red-700" />
        <Stat label="COMERCIAL" value={count('Comercial')} sub={pct(count('Comercial'))} tone="text-amber-700" />
        <Stat label="DISTRIBUTORS" value={new Set(list.map((c) => c.distributor)).size} sub={`${new Set(list.map((c) => c.tyreSize)).size} tyre sizes`} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-5"><h2 className="mb-4 font-bold">Claims by month</h2><Bars data={byMonth} /></Card>
        <Card className="p-5"><h2 className="mb-4 font-bold">Top distributors</h2><HBars data={group((c) => c.distributor)} /></Card>
        <Card className="p-5"><h2 className="mb-4 font-bold">Top tyre sizes</h2><HBars data={group((c) => c.tyreSize)} color="bg-zinc-700" /></Card>
      </div>

      <Card className="mt-4 p-5">
        <div className="mb-3 flex items-center justify-between"><h2 className="font-bold">Recent claims</h2><Link href="/claims" className="text-sm font-bold text-brand">Sab claims →</Link></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead><tr className="text-left text-xs tracking-wide text-zinc-500">{['S NO', 'DATE', 'DISTRIBUTOR', 'BRAND', 'SIZE', 'TYRE NO', 'DAMAGE', 'DECISION'].map((h) => <th key={h} className="border-b border-zinc-200 px-3 py-2">{h}</th>)}</tr></thead>
            <tbody>
              {recent.map((c) => (
                <tr key={c.id} className="hover:bg-zinc-50">
                  <td className="border-b border-zinc-100 px-3 py-2.5 font-bold"><Link href={`/claims/${c.id}`} className="text-zinc-900">{c.sNo}</Link></td>
                  <td className="border-b border-zinc-100 px-3 py-2.5">{fmtDate(c.happenedDate)}</td>
                  <td className="border-b border-zinc-100 px-3 py-2.5">{c.distributor}</td>
                  <td className="border-b border-zinc-100 px-3 py-2.5">{c.brand}</td>
                  <td className="border-b border-zinc-100 px-3 py-2.5">{c.tyreSize}</td>
                  <td className="mono border-b border-zinc-100 px-3 py-2.5 text-[13px]">{c.tyreNumber}</td>
                  <td className="border-b border-zinc-100 px-3 py-2.5">{c.damage}</td>
                  <td className="border-b border-zinc-100 px-3 py-2.5"><DecisionTag d={c.decision} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
