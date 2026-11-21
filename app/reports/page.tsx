'use client';

import { useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import { BRANDS, monthKey, monthLabel } from '@/lib/rules';
import { downloadClaimSummary } from '@/lib/reports/claimSummary';
import { downloadClaimFile } from '@/lib/reports/claimFile';
import { download } from '@/lib/reports/download';
import { Card, Field, PageTitle, btnPrimary, btnSecondary, inputCls } from '@/components/ui';

export default function ReportsPage() {
  const { claims, dealers, exportBackup, resetToSeed } = useStore();
  const confirmed = claims.filter((c) => c.status === 'confirmed');
  const months = useMemo(() => Array.from(new Set(confirmed.map((c) => monthKey(c.happenedDate)))).filter((m) => m !== 'unknown').sort().reverse(), [confirmed]);
  const [sMonth, setSMonth] = useState(months[0] ?? '');
  const [sDist, setSDist] = useState('');
  const [fMonth, setFMonth] = useState(months[0] ?? '');
  const [fBrand, setFBrand] = useState('SUPERCARGO');
  const [msg, setMsg] = useState('');

  const distsInMonth = Array.from(new Set(confirmed.filter((c) => (c.happenedDate ?? '').startsWith(sMonth) && c.decision === 'Claimable').map((c) => c.distributor))).sort();
  const summaryCount = confirmed.filter((c) => c.distributor === sDist && c.decision === 'Claimable' && (c.happenedDate ?? '').startsWith(sMonth)).length;
  const fileRows = confirmed.filter((c) => c.brand === fBrand && (c.happenedDate ?? '').startsWith(fMonth)).sort((a, b) => (a.sNo ?? 0) - (b.sNo ?? 0));

  return (
    <>
      <PageTitle title="Reports" sub="Pehle wale formats mein, saved data se" />
      {msg && <p className="mb-4 rounded-lg bg-green-50 px-4 py-2 text-sm font-semibold text-green-800">{msg}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="flex flex-col gap-3 p-5">
          <div className="flex items-start justify-between"><h2 className="text-lg font-bold">Claim Summary form</h2><span className="rounded bg-red-100 px-2 py-0.5 text-xs font-extrabold text-red-800">PDF</span></div>
          <p className="text-sm text-zinc-500">Har dealer/distributor ka monthly form — sirf claimable tyres, Bilty #, amount aur signature boxes.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Month">
              <select className={inputCls} value={sMonth} onChange={(e) => { setSMonth(e.target.value); setSDist(''); }}>
                {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
              </select>
            </Field>
            <Field label="Distributor">
              <select className={inputCls} value={sDist} onChange={(e) => setSDist(e.target.value)}>
                <option value="">Chunein…</option>
                {distsInMonth.map((d) => <option key={d}>{d}</option>)}
              </select>
            </Field>
          </div>
          <p className="text-sm">{sDist ? <><b>{summaryCount}</b> claimable tyres</> : `${distsInMonth.length} distributors ke claimable tyres is mahine`}</p>
          <button type="button" className={btnPrimary} disabled={!sDist || !summaryCount} onClick={async () => {
            const city = dealers.find((d) => d.name === sDist)?.city ?? '';
            const n = await downloadClaimSummary(claims, sDist, sMonth, city);
            setMsg(`Claim Summary ban gaya: ${sDist}, ${monthLabel(sMonth)} — ${n} tyres`);
          }}>Download PDF</button>
          {distsInMonth.length > 1 && (
            <button type="button" className={btnSecondary} onClick={async () => {
              for (const d of distsInMonth) await downloadClaimSummary(claims, d, sMonth, dealers.find((x) => x.name === d)?.city ?? '');
              setMsg(`${distsInMonth.length} Claim Summary forms ban gaye (${monthLabel(sMonth)})`);
            }}>Sab distributors ke forms</button>
          )}
        </Card>

        <Card className="flex flex-col gap-3 p-5">
          <div className="flex items-start justify-between"><h2 className="text-lg font-bold">Claim file by brand</h2><span className="rounded bg-green-100 px-2 py-0.5 text-xs font-extrabold text-green-800">EXCEL</span></div>
          <p className="text-sm text-zinc-500">26-column Claim Data Format. S No # file ke andar 1 se, defect photo Picture column mein.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Month">
              <select className={inputCls} value={fMonth} onChange={(e) => setFMonth(e.target.value)}>
                {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
              </select>
            </Field>
            <Field label="Brand">
              <select className={inputCls} value={fBrand} onChange={(e) => setFBrand(e.target.value)}>
                {BRANDS.map((b) => <option key={b}>{b}</option>)}
              </select>
            </Field>
          </div>
          <p className="text-sm"><b>{fileRows.length}</b> claims</p>
          <button type="button" className={btnPrimary} disabled={!fileRows.length} onClick={async () => {
            await downloadClaimFile(fileRows, `${fBrand} Claims - ${monthLabel(fMonth)}.xlsx`, monthLabel(fMonth));
            setMsg(`${fBrand} claim file ban gayi — ${fileRows.length} claims`);
          }}>Download Excel</button>
        </Card>

        <Card className="flex flex-col gap-3 p-5">
          <h2 className="text-lg font-bold">Backup</h2>
          <p className="text-sm text-zinc-500">Database connect hone tak data isi browser mein hai. Hafte mein aik dafa backup download kar lein.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btnSecondary} onClick={() => download(new Blob([exportBackup()], { type: 'application/json' }), `SLM backup ${new Date().toISOString().slice(0, 10)}.json`)}>Backup download (JSON)</button>
            <button type="button" className={btnSecondary} onClick={async () => {
              await downloadClaimFile([...confirmed].sort((a, b) => (a.sNo ?? 0) - (b.sNo ?? 0)), `All Claims ${new Date().toISOString().slice(0, 10)}.xlsx`, 'All claims');
            }}>Saare claims (Excel)</button>
            <button type="button" className="h-11 px-2 text-sm font-semibold text-red-700 underline" onClick={() => { if (window.confirm('Saari tabdeeliyan mita kar asal seed data wapas laana hai?')) resetToSeed(); }}>Seed data reset</button>
          </div>
        </Card>

        <Card className="p-5 text-sm text-zinc-500">
          <h2 className="mb-1 text-lg font-bold text-zinc-900">Agle phases mein</h2>
          Photos zip (1(1), 1(2)… naming), visit report (Word), Daily Activity, monthly PPT aur vehicle test-tyre file.
        </Card>
      </div>
    </>
  );
}
