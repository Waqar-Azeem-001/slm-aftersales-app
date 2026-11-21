'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { newId, useStore } from '@/lib/store';
import type { Customer } from '@/lib/types';
import { fmtDate } from '@/lib/rules';
import { Card, DecisionTag, Field, PageTitle, btnPrimary, btnSecondary, inputCls } from '@/components/ui';

const blank = (): Customer => ({ id: newId('u'), name: '', type: 'Transporter', business: '', city: '', contactPerson: '', phone: '', fleetSize: null, vehicleTypes: '', sizes: '', vehicles: [], drivers: [] });

function Profile({ u, onClose }: { u: Customer; onClose: () => void }) {
  const { saveCustomer, claims } = useStore();
  const [x, setX] = useState<Customer>(u);
  const [tab, setTab] = useState<'info' | 'veh' | 'drv' | 'claims'>(u.name ? 'veh' : 'info');
  const [plate, setPlate] = useState({ plate: '', type: '', tyreSize: '' });
  const [drv, setDrv] = useState('');
  const linked = claims.filter((c) => c.customer && c.customer === u.name);
  const save = (n: Customer) => { setX(n); if (n.name.trim()) saveCustomer(n); };

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-lg font-bold text-brand-dark">{(x.name || '?').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}</span>
        <div className="flex-1">
          <h2 className="text-lg font-extrabold">{x.name || 'Naya customer'}</h2>
          <p className="text-sm text-zinc-500">{[x.type, x.city].filter(Boolean).join(' · ')}</p>
        </div>
        <button type="button" className={btnSecondary} onClick={onClose}>Band</button>
      </div>
      <div role="tablist" className="mb-3 grid grid-cols-4 gap-1 rounded-lg bg-zinc-100 p-1 text-sm font-semibold">
        {([['info', 'Details'], ['veh', `Gaariyan (${x.vehicles.length})`], ['drv', `Drivers (${x.drivers.length})`], ['claims', `Claims (${linked.length})`]] as const).map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`h-9 rounded-md ${tab === k ? 'bg-white shadow-sm' : 'text-zinc-600'}`}>{l}</button>
        ))}
      </div>

      {tab === 'info' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Naam"><input className={inputCls} value={x.name} onChange={(e) => setX({ ...x, name: e.target.value })} /></Field>
          <Field label="Type"><select className={inputCls} value={x.type} onChange={(e) => setX({ ...x, type: e.target.value })}><option>Transporter</option><option>Corporate</option></select></Field>
          <Field label="City"><input className={inputCls} value={x.city} onChange={(e) => setX({ ...x, city: e.target.value })} /></Field>
          <Field label="Business"><input className={inputCls} value={x.business} onChange={(e) => setX({ ...x, business: e.target.value })} placeholder="Logistics, bus service…" /></Field>
          <Field label="Contact person"><input className={inputCls} value={x.contactPerson} onChange={(e) => setX({ ...x, contactPerson: e.target.value })} /></Field>
          <Field label="Phone"><input className={inputCls} inputMode="tel" value={x.phone} onChange={(e) => setX({ ...x, phone: e.target.value })} /></Field>
          <Field label="Fleet size"><input className={inputCls} inputMode="numeric" value={x.fleetSize ?? ''} onChange={(e) => setX({ ...x, fleetSize: e.target.value === '' ? null : Number(e.target.value) })} /></Field>
          <Field label="Sizes & patterns"><input className={inputCls} value={x.sizes} onChange={(e) => setX({ ...x, sizes: e.target.value })} /></Field>
          <div className="sm:col-span-2"><button type="button" className={btnPrimary} disabled={!x.name.trim()} onClick={() => { save({ ...x, name: x.name.trim() }); setTab('veh'); }}>Save</button></div>
        </div>
      )}

      {tab === 'veh' && (
        <div className="flex flex-col gap-2">
          {x.vehicles.map((v, i) => (
            <div key={v.plate + i} className="flex items-center gap-3 rounded-lg border border-zinc-200 px-3 py-2">
              <span className="mono font-bold">{v.plate}</span>
              <span className="flex-1 text-sm text-zinc-500">{[v.type, v.tyreSize].filter(Boolean).join(' · ')}</span>
              <button type="button" aria-label={`${v.plate} hatayein`} className="h-9 w-9 rounded-md text-zinc-500 hover:bg-zinc-100" onClick={() => save({ ...x, vehicles: x.vehicles.filter((_, j) => j !== i) })}>✕</button>
            </div>
          ))}
          <div className="grid gap-2 rounded-lg bg-zinc-50 p-3 sm:grid-cols-4">
            <input className={`${inputCls} mono uppercase`} placeholder="Plate (TAS-595)" value={plate.plate} onChange={(e) => setPlate({ ...plate, plate: e.target.value.toUpperCase() })} />
            <input className={inputCls} placeholder="Type (10 Wheeler)" value={plate.type} onChange={(e) => setPlate({ ...plate, type: e.target.value })} />
            <input className={inputCls} placeholder="Tyre size" value={plate.tyreSize} onChange={(e) => setPlate({ ...plate, tyreSize: e.target.value })} />
            <button type="button" className={btnPrimary} disabled={!plate.plate.trim() || !x.name.trim()} onClick={() => { save({ ...x, vehicles: [...x.vehicles, { ...plate, plate: plate.plate.trim() }] }); setPlate({ plate: '', type: '', tyreSize: '' }); }}>+ Gaari</button>
          </div>
        </div>
      )}

      {tab === 'drv' && (
        <div className="flex flex-col gap-2">
          {x.drivers.map((d, i) => (
            <div key={d + i} className="flex items-center gap-3 rounded-lg border border-zinc-200 px-3 py-2">
              <span className="flex-1 font-semibold">{d}</span>
              <button type="button" aria-label={`${d} hatayein`} className="h-9 w-9 rounded-md text-zinc-500 hover:bg-zinc-100" onClick={() => save({ ...x, drivers: x.drivers.filter((_, j) => j !== i) })}>✕</button>
            </div>
          ))}
          <div className="flex gap-2 rounded-lg bg-zinc-50 p-3">
            <input className={inputCls} placeholder="Driver ka naam" value={drv} onChange={(e) => setDrv(e.target.value)} />
            <button type="button" className={btnPrimary} disabled={!drv.trim() || !x.name.trim()} onClick={() => { save({ ...x, drivers: [...x.drivers, drv.trim()] }); setDrv(''); }}>+ Driver</button>
          </div>
        </div>
      )}

      {tab === 'claims' && (
        <ul className="divide-y divide-zinc-100">
          {linked.map((c) => (
            <li key={c.id}>
              <Link href={`/claims/${c.id}`} className="flex items-center gap-3 py-2.5 text-zinc-900 no-underline">
                <span className="flex-1"><span className="mono block text-sm font-bold">{c.tyreNumber}</span><span className="text-xs text-zinc-500">#{c.sNo} · {fmtDate(c.happenedDate)} · {c.truckNumber} · {c.distributor}</span></span>
                <DecisionTag d={c.decision} />
              </Link>
            </li>
          ))}
          {!linked.length && <li className="py-4 text-sm text-zinc-500">Is customer ke saath abhi koi claim nahi jora gaya</li>}
        </ul>
      )}
    </Card>
  );
}

function CustomersInner() {
  const { customers } = useStore();
  const params = useSearchParams();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<Customer | null>(params.get('new') ? blank() : null);
  const list = customers
    .filter((u) => !q.trim() || [u.name, u.city, u.phone, u.contactPerson, ...u.vehicles.map((v) => v.plate)].join(' ').toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <PageTitle title="Customers" sub={`${customers.length} transporters aur corporate customers`}>
        <button type="button" className={btnPrimary} onClick={() => setOpen(blank())}>+ Customer</button>
      </PageTitle>
      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <input type="search" aria-label="Search" className={`${inputCls} mb-3`} placeholder="Naam, city, phone, gaari number…" value={q} onChange={(e) => setQ(e.target.value)} />
          <Card>
            <ul className="max-h-[70vh] divide-y divide-zinc-100 overflow-y-auto">
              {list.map((u) => (
                <li key={u.id}>
                  <button type="button" onClick={() => setOpen(u)} className={`flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-zinc-50 ${open?.id === u.id ? 'bg-red-50' : ''}`}>
                    <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{u.name}</span><span className="block truncate text-xs text-zinc-500">{[u.type, u.city, u.business, u.fleetSize ? `${u.fleetSize} gaariyan` : ''].filter(Boolean).join(' · ')}</span></span>
                    {u.vehicles.length > 0 && <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-bold">{u.vehicles.length} saved</span>}
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </div>
        <div>{open ? <Profile key={open.id} u={open} onClose={() => setOpen(null)} /> : <Card className="p-6 text-sm text-zinc-500">Customer chunein — details, gaariyan, drivers aur jore gaye claims yahan</Card>}</div>
      </div>
    </>
  );
}

export default function CustomersPage() {
  return (
    <Suspense>
      <CustomersInner />
    </Suspense>
  );
}
