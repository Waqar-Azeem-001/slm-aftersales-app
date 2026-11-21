'use client';

import Link from 'next/link';
import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useStore } from '@/lib/store';
import { BRANDS, brandGroup, fmtDate, monthKey, monthLabel } from '@/lib/rules';
import { downloadClaimFile } from '@/lib/reports/claimFile';
import { Card, DecisionTag, PageTitle, btnPrimary, btnSecondary, inputCls } from '@/components/ui';
import type { Decision } from '@/lib/types';

const PAGE = 25;

function ClaimsInner() {
  const params = useSearchParams();
  const { claims } = useStore();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState(params.get('status') === 'draft' ? 'draft' : 'confirmed');
  const [month, setMonth] = useState('all');
  const [brand, setBrand] = useState('all');
  const [dist, setDist] = useState('all');
  const [dec, setDec] = useState<Decision | 'all'>('all');
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);

  const months = useMemo(() => Array.from(new Set(claims.map((c) => monthKey(c.happenedDate)))).filter((m) => m !== 'unknown').sort().reverse(), [claims]);
  const dists = useMemo(() => Array.from(new Set(claims.map((c) => c.distributor).filter(Boolean))).sort(), [claims]);

  const list = claims
    .filter((c) => c.status === status)
    .filter((c) => month === 'all' || monthKey(c.happenedDate) === month)
    .filter((c) => brand === 'all' || c.brand === brand)
    .filter((c) => dist === 'all' || c.distributor === dist)
    .filter((c) => dec === 'all' || c.decision === dec)
    .filter((c) => {
      if (!q.trim()) return true;
      const t = q.trim().toLowerCase();
      return [c.tyreNumber, c.distributor, c.truckNumber, c.customer, c.tyreSize, c.damage, String(c.sNo)].some((x) => (x ?? '').toLowerCase().includes(t));
    })
    .sort((a, b) => (b.happenedDate ?? '').localeCompare(a.happenedDate ?? '') || (b.sNo ?? 0) - (a.sNo ?? 0));
  const shown = list.slice(page * PAGE, page * PAGE + PAGE);
  const drafts = claims.filter((c) => c.status === 'draft').length;

  async function exportExcel() {
    setBusy(true);
    try {
      const rows = [...list].sort((a, b) => (a.sNo ?? 0) - (b.sNo ?? 0));
      const parts = [brand !== 'all' ? brand : 'All brands', month !== 'all' ? monthLabel(month) : 'All months', dist !== 'all' ? dist : ''].filter(Boolean);
      await downloadClaimFile(rows, `Claims - ${parts.join(' - ')}.xlsx`, month !== 'all' ? monthLabel(month) : 'Claims');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageTitle title="Claims" sub={`${list.length} claims`}>
        <button type="button" className={btnSecondary} onClick={exportExcel} disabled={busy || !list.length}>{busy ? 'Ban raha…' : 'Export Excel'}</button>
        <Link href="/claims/new" className={btnPrimary}>+ New Claim</Link>
      </PageTitle>

      <div role="tablist" className="mb-3 flex gap-2">
        {(['confirmed', 'draft'] as const).map((s) => (
          <button key={s} type="button" role="tab" aria-selected={status === s} onClick={() => { setStatus(s); setPage(0); }}
            className={`h-10 rounded-full px-4 text-sm font-bold ${status === s ? 'bg-zinc-900 text-white' : 'border border-zinc-300 bg-white'}`}>
            {s === 'confirmed' ? 'Confirmed' : `Drafts (${drafts})`}
          </button>
        ))}
      </div>

      <Card className="mb-4 grid gap-3 p-4 md:grid-cols-6">
        <input type="search" aria-label="Search" placeholder="Tyre no, distributor, truck no…" className={`${inputCls} md:col-span-2`} value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
        <select aria-label="Month" className={inputCls} value={month} onChange={(e) => { setMonth(e.target.value); setPage(0); }}>
          <option value="all">All months</option>
          {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>
        <select aria-label="Brand" className={inputCls} value={brand} onChange={(e) => { setBrand(e.target.value); setPage(0); }}>
          <option value="all">All brands</option>
          {BRANDS.map((b) => <option key={b}>{b}</option>)}
        </select>
        <select aria-label="Distributor" className={inputCls} value={dist} onChange={(e) => { setDist(e.target.value); setPage(0); }}>
          <option value="all">All distributors</option>
          {dists.map((d) => <option key={d}>{d}</option>)}
        </select>
        <select aria-label="Decision" className={inputCls} value={dec} onChange={(e) => { setDec(e.target.value as Decision | 'all'); setPage(0); }}>
          <option value="all">All decisions</option>
          {(['Claimable', 'Nonclaimable', 'Comercial', 'Pending'] as Decision[]).map((d) => <option key={d}>{d}</option>)}
        </select>
      </Card>

      <Card className="p-2">
        {/* phone: cards */}
        <ul className="divide-y divide-zinc-100 md:hidden">
          {shown.map((c) => (
            <li key={c.id}>
              <Link href={`/claims/${c.id}`} className="flex items-center gap-3 px-3 py-3 text-zinc-900 no-underline">
                <div className="min-w-0 flex-1">
                  <div className="mono text-sm font-bold">{c.tyreNumber || '—'}</div>
                  <div className="truncate text-xs text-zinc-500">{c.brand} {c.tyreSize} · {c.damage}</div>
                  <div className="truncate text-xs text-zinc-500">#{c.sNo ?? '—'} · {fmtDate(c.happenedDate)} · {c.distributor || 'distributor —'}</div>
                </div>
                <DecisionTag d={c.decision} />
              </Link>
            </li>
          ))}
        </ul>
        {/* desktop: table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="text-left text-xs tracking-wide text-zinc-500">
                {['S NO', 'HAPPENED', 'LOCATION', 'DISTRIBUTOR', 'BRAND', 'TYRE SIZE', 'TYRE NUMBER', 'DAMAGE', 'DECISION', 'CUSTOMER'].map((h) => <th key={h} className="border-b border-zinc-200 px-3 py-2.5">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {shown.map((c) => (
                <tr key={c.id} className="cursor-pointer hover:bg-zinc-50">
                  <td className="border-b border-zinc-100 px-3 py-2.5 font-bold"><Link href={`/claims/${c.id}`} className="text-zinc-900">{c.sNo ?? '—'}</Link></td>
                  <td className="border-b border-zinc-100 px-3 py-2.5">{fmtDate(c.happenedDate)}</td>
                  <td className="border-b border-zinc-100 px-3 py-2.5">{c.location}</td>
                  <td className="border-b border-zinc-100 px-3 py-2.5 font-semibold">{c.distributor}</td>
                  <td className="border-b border-zinc-100 px-3 py-2.5">{c.brand}{brandGroup(c.brand) !== c.brand && <span className="text-xs text-zinc-400"> ({brandGroup(c.brand)})</span>}</td>
                  <td className="border-b border-zinc-100 px-3 py-2.5">{c.tyreSize}</td>
                  <td className="mono border-b border-zinc-100 px-3 py-2.5 text-[13px]"><Link href={`/claims/${c.id}`} className="text-zinc-900">{c.tyreNumber}</Link></td>
                  <td className="border-b border-zinc-100 px-3 py-2.5">{c.damage}</td>
                  <td className="border-b border-zinc-100 px-3 py-2.5"><DecisionTag d={c.decision} /></td>
                  <td className="border-b border-zinc-100 px-3 py-2.5 text-zinc-500">{c.customer || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!shown.length && <p className="p-6 text-center text-sm text-zinc-500">{status === 'draft' ? 'Koi draft nahi' : 'Is filter mein koi claim nahi'}</p>}
        {list.length > PAGE && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 text-sm text-zinc-500">
            <span>{page * PAGE + 1}–{Math.min(list.length, (page + 1) * PAGE)} of {list.length}</span>
            <div className="flex gap-2">
              <button type="button" className={btnSecondary} disabled={page === 0} onClick={() => setPage(page - 1)}>‹ Prev</button>
              <button type="button" className={btnSecondary} disabled={(page + 1) * PAGE >= list.length} onClick={() => setPage(page + 1)}>Next ›</button>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}

export default function ClaimsPage() {
  return (
    <Suspense>
      <ClaimsInner />
    </Suspense>
  );
}
