'use client';

import { useMemo, useState } from 'react';
import { newId, useStore } from '@/lib/store';
import type { Dealer } from '@/lib/types';
import { Card, Field, PageTitle, btnPrimary, btnSecondary, inputCls } from '@/components/ui';

const ROLES = ['Distributor', 'Sub-dealer', 'Tire Shop'];
const BRAND_GROUPS = ['SLM', 'STARLUX', 'ROADLUX'];

function DealerForm({ d, onClose }: { d: Dealer; onClose: () => void }) {
  const { saveDealer } = useStore();
  const [x, setX] = useState<Dealer>(d);
  return (
    <Card className="mb-4 grid gap-3 p-4 md:grid-cols-3">
      <Field label="Naam"><input className={inputCls} value={x.name} onChange={(e) => setX({ ...x, name: e.target.value })} /></Field>
      <Field label="City"><input className={inputCls} value={x.city} onChange={(e) => setX({ ...x, city: e.target.value })} /></Field>
      <Field label="Role">
        <select className={inputCls} value={x.role} onChange={(e) => setX({ ...x, role: e.target.value })}>
          {Array.from(new Set([...ROLES, x.role])).map((r) => <option key={r}>{r}</option>)}
        </select>
      </Field>
      <Field label="Contact person"><input className={inputCls} value={x.contactPerson} onChange={(e) => setX({ ...x, contactPerson: e.target.value })} /></Field>
      <Field label="Phone"><input className={inputCls} value={x.phone} inputMode="tel" onChange={(e) => setX({ ...x, phone: e.target.value })} /></Field>
      <div className="flex flex-col gap-1 text-sm">
        <span className="font-semibold text-zinc-600">Distributor for brands</span>
        <div className="flex flex-wrap gap-2">
          {BRAND_GROUPS.map((b) => {
            const on = x.brands.includes(b);
            return (
              <button key={b} type="button" aria-pressed={on} onClick={() => setX({ ...x, brands: on ? x.brands.filter((y) => y !== b) : [...x.brands, b] })}
                className={`h-10 rounded-full px-3 text-sm font-semibold ${on ? 'bg-zinc-900 text-white' : 'border border-zinc-300 bg-white'}`}>{b}</button>
            );
          })}
        </div>
      </div>
      <div className="md:col-span-3"><Field label="Note"><input className={inputCls} value={x.note} onChange={(e) => setX({ ...x, note: e.target.value })} placeholder="e.g. SLM sub-dealer of Z & H" /></Field></div>
      <div className="flex gap-2 md:col-span-3">
        <button type="button" className={btnPrimary} disabled={!x.name.trim() || !x.city.trim()} onClick={() => { saveDealer({ ...x, name: x.name.trim(), city: x.city.trim() }); onClose(); }}>Save</button>
        <button type="button" className={btnSecondary} onClick={onClose}>Cancel</button>
      </div>
    </Card>
  );
}

export default function DealersPage() {
  const { dealers, claims } = useStore();
  const [q, setQ] = useState('');
  const [role, setRole] = useState('all');
  const [editing, setEditing] = useState<Dealer | null>(null);
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    claims.forEach((c) => m.set(c.distributor, (m.get(c.distributor) ?? 0) + 1));
    return m;
  }, [claims]);
  const list = dealers
    .filter((d) => role === 'all' || d.role === role)
    .filter((d) => !q.trim() || [d.name, d.city, d.contactPerson, d.phone].join(' ').toLowerCase().includes(q.trim().toLowerCase()));
  const byCity = list.reduce<Record<string, Dealer[]>>((a, d) => { (a[d.city || '—'] ||= []).push(d); return a; }, {});

  return (
    <>
      <PageTitle title="Dealers & Distributors" sub={`${dealers.length} dealers · ${dealers.filter((d) => d.role === 'Distributor').length} distributors`}>
        <button type="button" className={btnPrimary} onClick={() => setEditing({ id: newId('d'), name: '', city: '', role: 'Distributor', contactPerson: '', phone: '', brands: [], note: '' })}>+ Dealer</button>
      </PageTitle>

      <Card className="mb-4 p-4 text-sm">
        <h2 className="mb-2 font-bold">Distributor rules (claim par khud lagte hain)</h2>
        <ul className="list-disc space-y-1 pl-5 text-zinc-700">
          <li>Har <b>ROADLUX</b> tyre, kisi bhi shehar mein → <b>MYCO Corporation</b></li>
          <li><b>SUPERCARGO</b> aur <b>LONGMARCH</b> = SLM. Lahore mein SLM → <b>Z &amp; H Enterprises</b> (wahid SLM distributor)</li>
          <li>Lahore mein <b>STARLUX</b> → <b>Asif Brothers</b>. S116 pattern hamesha STARLUX</li>
          <li>Baaqi shehar: us shehar ka distributor (neeche list se). Kai hon ya koi na ho to claim par poocha jata hai</li>
        </ul>
      </Card>

      {editing && <DealerForm key={editing.id} d={editing} onClose={() => setEditing(null)} />}

      <div className="mb-4 flex flex-wrap gap-2">
        <input type="search" aria-label="Search" className={`${inputCls} max-w-sm`} placeholder="Naam, city, phone…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select aria-label="Role" className={`${inputCls} w-44`} value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="all">All roles</option>
          {ROLES.map((r) => <option key={r}>{r}</option>)}
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {Object.entries(byCity).sort(([a], [b]) => a.localeCompare(b)).map(([city, ds]) => (
          <Card key={city}>
            <h2 className="border-b border-zinc-100 px-4 py-3 font-bold">{city} <span className="text-sm font-normal text-zinc-500">· {ds.length}</span></h2>
            <ul className="divide-y divide-zinc-100">
              {ds.map((d) => (
                <li key={d.id}>
                  <button type="button" onClick={() => setEditing(d)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-zinc-50">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{d.name}</span>
                      <span className="block truncate text-xs text-zinc-500">{[d.role, d.brands.join(', '), d.contactPerson, d.phone].filter(Boolean).join(' · ')}</span>
                    </span>
                    {(counts.get(d.name) ?? 0) > 0 && <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-bold">{counts.get(d.name)} claims</span>}
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </>
  );
}
