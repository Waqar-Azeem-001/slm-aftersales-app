'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { newId, useStore } from '@/lib/store';
import type { Claim, Decision, PhotoKind } from '@/lib/types';
import { BRANDS, DAMAGES, POSITIONS, TRUCK_TYPES, faultCategory, findDuplicate, fmtDate, resolveDistributor, suggestDecision } from '@/lib/rules';
import { readBarcode } from '@/lib/photos';
import { extractFields, readText } from '@/lib/ocr';
import { listen, parseVoice, speechSupported } from '@/lib/voice';
import PhotoTile from './PhotoTile';
import { Card, DecisionTag, Field, Segmented, autoCls, btnPrimary, btnSecondary, inputCls } from './ui';

const TILES: [PhotoKind, string][] = [
  ['full', 'Poora tyre'],
  ['tyre', 'Tyre no'],
  ['serial', 'Serial label'],
  ['brand', 'Brand / size'],
  ['dot', 'DOT'],
  ['defect', 'Defect'],
];

type FieldKey = 'tyreNumber' | 'serialNumber' | 'brand' | 'size' | 'pattern' | 'dot' | 'truckNumber';

/** local date (Pakistan / Saudi), not UTC */
const today = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
const LAST_CITY = 'slm-last-city';

export function blankClaim(): Claim {
  return {
    id: newId('c'), sNo: null, status: 'draft', distributor: '', dealerChecked: '', customer: '', bilty: '', dot: '', fitmentDate: null,
    happenedDate: today(), location: '', truckType: '', driverName: '', truckNumber: '', brand: '', tyreSize: '', size: '', pattern: '',
    tyreNumber: '', serialNumber: '', loadTons: null, operatingDistanceKm: null, kmCovered: null, speedKmh: null, roadCondition: '',
    residualDepthMm: null, damage: '', faultCategory: '', vehiclePosition: '', decision: 'Pending', inspectedBy: 'Waseem Akhtar',
    whatsappInspection: '', remarks: '', photos: {}, createdAt: new Date().toISOString(),
  };
}

export default function ClaimForm({ initial }: { initial: Claim }) {
  const router = useRouter();
  const { claims, dealers, customers, saveClaim, nextSNo, deleteClaim } = useStore();
  const [c, setC] = useState<Claim>(initial);
  const [step, setStep] = useState<1 | 2>(1);
  const [auto, setAuto] = useState<Set<FieldKey>>(new Set());
  const [reading, setReading] = useState<string>('');
  const [mic, setMic] = useState(false);
  const [heard, setHeard] = useState('');
  const [custQ, setCustQ] = useState('');
  const [more, setMore] = useState(false);
  const stopRef = useRef<() => void>(() => {});
  const isNew = !claims.some((x) => x.id === initial.id);

  useEffect(() => {
    if (!c.location) {
      const last = typeof window !== 'undefined' ? localStorage.getItem(LAST_CITY) : null;
      if (last) setC((x) => ({ ...x, location: last }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = <K extends keyof Claim>(k: K, v: Claim[K]) => {
    setC((x) => ({ ...x, [k]: v }));
    if (auto.has(k as FieldKey)) setAuto((a) => { const n = new Set(a); n.delete(k as FieldKey); return n; });
  };
  const fillAuto = (vals: Partial<Record<FieldKey, string>>) => {
    const keys = (Object.keys(vals) as FieldKey[]).filter((k) => vals[k]);
    if (!keys.length) return;
    setC((x) => {
      const n = { ...x };
      keys.forEach((k) => { if (!x[k]) (n[k] as string) = vals[k] as string; });
      if (vals.size || vals.pattern) n.tyreSize = [n.size, n.pattern].filter(Boolean).join(' ');
      return n;
    });
    setAuto((a) => new Set([...a, ...keys]));
  };

  async function onPhoto(kind: PhotoKind, id: string | undefined, blob?: Blob) {
    setC((x) => ({ ...x, photos: { ...x.photos, [kind]: id ? [id] : [] } }));
    if (!blob) return;
    if (kind === 'serial') {
      setReading('Barcode parh raha hai…');
      const code = await readBarcode(blob);
      if (code) fillAuto({ serialNumber: code, tyreNumber: code });
    }
    if (kind === 'tyre' || kind === 'serial' || kind === 'brand' || kind === 'dot') {
      setReading('Photo se text parh raha hai…');
      const f = extractFields(await readText(blob));
      if (kind === 'tyre') fillAuto({ tyreNumber: f.tyreNumber });
      if (kind === 'serial') fillAuto({ serialNumber: f.tyreNumber, tyreNumber: f.tyreNumber });
      if (kind === 'brand') fillAuto({ brand: f.brand, size: f.size, pattern: f.pattern });
      if (kind === 'dot') fillAuto({ dot: f.dot });
    }
    setReading('');
  }

  function toggleMic() {
    if (mic) { stopRef.current(); return; }
    setMic(true);
    stopRef.current = listen(
      (t) => {
        const r = parseVoice(t);
        setHeard(r.heard);
        setC((x) => {
          const n = { ...x };
          if (r.position) n.vehiclePosition = r.position;
          if (r.depth !== undefined) n.residualDepthMm = r.depth;
          if (r.damage) { n.damage = r.damage; n.faultCategory = faultCategory(r.damage); }
          if (r.decision) n.decision = r.decision;
          else if (r.damage && x.decision === 'Pending') n.decision = suggestDecision(r.damage) || 'Pending';
          if (r.truckNumber && !x.truckNumber) n.truckNumber = r.truckNumber;
          if (r.truckType && !x.truckType) n.truckType = r.truckType;
          if (r.tyreNumber && !x.tyreNumber) n.tyreNumber = r.tyreNumber;
          return n;
        });
      },
      () => setMic(false),
    );
  }

  const dup = findDuplicate(claims, c.tyreNumber, c.id);
  const serialMatch = c.serialNumber && c.tyreNumber && c.serialNumber.toUpperCase() === c.tyreNumber.toUpperCase();
  const photoCount = TILES.filter(([k]) => (c.photos?.[k]?.length ?? 0) > 0).length;
  const extras = c.photos?.extra ?? [];
  const need: string[] = [];
  if (!c.tyreNumber) need.push('tyre no');
  if (!c.brand) need.push('brand');
  if (!c.size) need.push('size');
  if (!c.damage) need.push('damage');
  if (c.decision === 'Pending') need.push('decision');

  const cities = useMemo(() => Array.from(new Set(dealers.map((d) => d.city).filter(Boolean))).sort(), [dealers]);
  const cityDealers = dealers.filter((d) => c.location && d.city.toLowerCase().startsWith(c.location.toLowerCase().split(' ')[0]));
  const dist = resolveDistributor(c.brand, c.pattern, c.location, dealers);
  const custList = customers
    .filter((u) => !custQ.trim() || [u.name, u.phone, u.city, ...u.vehicles.map((v) => v.plate)].join(' ').toLowerCase().includes(custQ.trim().toLowerCase()))
    .sort((a, b) => Number(b.vehicles.length > 0) - Number(a.vehicles.length > 0) || a.name.localeCompare(b.name))
    .slice(0, custQ ? 20 : 8);
  const cur = customers.find((u) => u.name === c.customer);
  const ready = need.length === 0 && !!c.distributor;

  useEffect(() => {
    if (dist.name && !dist.ask && c.distributor !== dist.name) setC((x) => ({ ...x, distributor: dist.name as string }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dist.name, dist.ask]);

  function persist(status: Claim['status']) {
    const final: Claim = {
      ...c,
      status,
      tyreNumber: c.tyreNumber.trim().toUpperCase(),
      tyreSize: [c.size, c.pattern].filter(Boolean).join(' '),
      faultCategory: faultCategory(c.damage),
      happenedDate: c.happenedDate || today(),
      sNo: status === 'confirmed' && !c.sNo ? nextSNo() : c.sNo,
    };
    if (c.location) localStorage.setItem(LAST_CITY, c.location);
    saveClaim(final);
    return final;
  }

  const decOpts: Decision[] = ['Claimable', 'Nonclaimable', 'Comercial'];
  const ac = (k: FieldKey) => `${inputCls} ${auto.has(k) ? autoCls : ''}`;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center gap-3">
        <button type="button" onClick={() => (step === 2 ? setStep(1) : router.back())} aria-label="Back" className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-zinc-200">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-extrabold">{isNew ? 'New Claim' : `Claim #${c.sNo ?? 'draft'}`}</h1>
          <p className="text-xs text-zinc-500">{fmtDate(c.happenedDate)} · {c.inspectedBy}{c.status === 'draft' ? ' · draft' : ''}</p>
        </div>
      </div>
      <div className="mb-5 grid grid-cols-2 gap-2 text-xs font-semibold">
        <div><div className="mb-1 h-1 rounded bg-brand" />1 · Claim data</div>
        <div className={step === 2 ? '' : 'text-zinc-400'}><div className={`mb-1 h-1 rounded ${step === 2 ? 'bg-brand' : 'bg-zinc-200'}`} />2 · Kis ke saath jorna</div>
      </div>

      {step === 1 && (
        <div className="flex flex-col gap-4">
          <section>
            <div className="mb-2 flex items-baseline justify-between px-0.5">
              <h2 className="text-sm font-bold">Photos</h2>
              <span className={`text-xs font-semibold ${photoCount === 6 ? 'text-green-700' : 'text-zinc-500'}`}>{photoCount} / 6</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {TILES.map(([k, label]) => (
                <PhotoTile key={k} label={label} photoId={c.photos?.[k]?.[0]} onChange={(id, b) => onPhoto(k, id, b)} />
              ))}
            </div>
            {reading && <p className="mt-2 text-xs font-semibold text-amber-700">{reading}</p>}
            <div className="mt-2 grid grid-cols-4 gap-2">
              {[0, 1, 2, 3].map((i) => (
                <PhotoTile
                  key={i}
                  label={`Extra ${i + 1}`}
                  photoId={extras[i]}
                  onChange={(id) => {
                    const n = [...extras];
                    if (id) n[i] = id; else n.splice(i, 1);
                    setC((x) => ({ ...x, photos: { ...x.photos, extra: n.filter(Boolean) } }));
                  }}
                />
              ))}
            </div>
            <p className="mt-1 text-xs text-zinc-500">Extra photos sirf record ke liye · report mein nahi jatin</p>
          </section>

          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold">Tyre</h2>
              <span className="flex items-center gap-1.5 text-xs text-zinc-500"><span className="h-3 w-3 rounded border border-amber-500 bg-amber-50" />photo se bhara — check karein</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Tyre number" hint={dup ? <span className="font-semibold text-amber-700">Pehle se claim #{dup.sNo} mein hai ({fmtDate(dup.happenedDate)}, {dup.distributor}, {dup.decision})</span> : undefined}>
                <input className={`${ac('tyreNumber')} mono uppercase`} value={c.tyreNumber} onChange={(e) => set('tyreNumber', e.target.value.toUpperCase())} placeholder="SNOC578658" />
              </Field>
              <Field label="Serial label" hint={serialMatch ? <span className="font-semibold text-green-700">✓ Tyre no se match</span> : undefined}>
                <input className={`${ac('serialNumber')} mono uppercase`} value={c.serialNumber ?? ''} onChange={(e) => set('serialNumber', e.target.value.toUpperCase())} placeholder="Barcode / sticker" />
              </Field>
              <Field label="Brand">
                <select className={ac('brand')} value={c.brand} onChange={(e) => set('brand', e.target.value)}>
                  <option value="">Chunein…</option>
                  {BRANDS.map((b) => <option key={b}>{b}</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Size"><input className={ac('size')} value={c.size} onChange={(e) => set('size', e.target.value.toUpperCase())} placeholder="11.00R20" list="sizes" /></Field>
                <Field label="Pattern"><input className={ac('pattern')} value={c.pattern} onChange={(e) => set('pattern', e.target.value.toUpperCase())} placeholder="A707" list="patterns" /></Field>
              </div>
              <Field label="DOT"><input className={`${ac('dot')} mono`} value={c.dot} onChange={(e) => set('dot', e.target.value)} placeholder="0326" inputMode="numeric" /></Field>
              <Field label="Happened date (inspection)"><input type="date" className={inputCls} value={c.happenedDate ?? ''} onChange={(e) => set('happenedDate', e.target.value)} /></Field>
            </div>
            <datalist id="sizes">{Array.from(new Set(claims.map((x) => x.size).filter(Boolean))).map((s) => <option key={s} value={s} />)}</datalist>
            <datalist id="patterns">{Array.from(new Set(claims.map((x) => x.pattern).filter(Boolean))).map((s) => <option key={s} value={s} />)}</datalist>
          </Card>

          <Card className="flex flex-col gap-4 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">Damage &amp; faisla</h2>
              {speechSupported() && (
                <button type="button" onClick={toggleMic} className={`flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold ${mic ? 'bg-brand text-white' : 'bg-zinc-100'}`}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0014 0M12 18v3" /></svg>
                  {mic ? 'Sun raha… (rokne ke liye dabayein)' : 'Bolein'}
                </button>
              )}
            </div>
            {heard && <p className="rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-700">Suna: “{heard}”</p>}
            <Field label="Damage">
              <select className={inputCls} value={c.damage} onChange={(e) => {
                const d = e.target.value;
                setC((x) => ({ ...x, damage: d, faultCategory: faultCategory(d), decision: x.decision === 'Pending' ? (suggestDecision(d) || 'Pending') : x.decision }));
              }}>
                <option value="">Chunein…</option>
                {Array.from(new Set([...DAMAGES, c.damage].filter(Boolean))).map((d) => <option key={d}>{d}</option>)}
              </select>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1 text-sm"><span className="font-semibold text-zinc-600">Position</span><Segmented label="Position" options={POSITIONS} value={c.vehiclePosition} onChange={(v) => set('vehiclePosition', v)} /></div>
              <Field label="Residual depth (mm)">
                <div className="flex h-11 items-center rounded-lg border border-zinc-300 bg-white">
                  <button type="button" aria-label="Kam" className="h-11 w-11 text-lg" onClick={() => set('residualDepthMm', Math.max(0, Math.round(((c.residualDepthMm ?? 12) - 0.1) * 10) / 10))}>−</button>
                  <input className="h-10 w-full min-w-0 text-center font-semibold outline-none" inputMode="decimal" value={c.residualDepthMm ?? ''} placeholder="—" onChange={(e) => set('residualDepthMm', e.target.value === '' ? null : Number(e.target.value))} />
                  <button type="button" aria-label="Zyada" className="h-11 w-11 text-lg" onClick={() => set('residualDepthMm', Math.round(((c.residualDepthMm ?? 12) + 0.1) * 10) / 10)}>+</button>
                </div>
              </Field>
            </div>
            <div className="flex flex-col gap-1.5 text-sm">
              <span className="font-semibold text-zinc-600">Decision</span>
              <div role="group" aria-label="Decision" className="grid grid-cols-3 gap-2">
                {decOpts.map((d) => {
                  const on = c.decision === d;
                  const tone = d === 'Claimable' ? 'border-green-700 bg-green-50 text-green-800' : d === 'Nonclaimable' ? 'border-red-700 bg-red-50 text-red-800' : 'border-amber-700 bg-amber-50 text-amber-800';
                  return (
                    <button key={d} type="button" aria-pressed={on} onClick={() => set('decision', d)} className={`h-11 rounded-lg border text-sm font-semibold ${on ? tone + ' border-2' : 'border-zinc-300 bg-white text-zinc-700'}`}>{d}</button>
                  );
                })}
              </div>
              <span className="text-xs text-zinc-500">
                {/shoulder/i.test(c.damage) ? 'Shoulder Separation = Claimable (worn out / non-dealer ho to reject, wajah Remarks mein)' : c.damage ? 'Suggestion: Nonclaimable — wajah Remarks mein' : 'Damage chunne par faisla khud suggest hoga'}
              </span>
            </div>
            <Field label="Remarks"><textarea rows={2} className={`${inputCls} h-auto py-2`} value={c.remarks} onChange={(e) => set('remarks', e.target.value)} placeholder="Rejection ki wajah, ya koi aur baat" /></Field>

            <button type="button" onClick={() => setMore(!more)} className="self-start text-sm font-semibold text-brand">{more ? '− Kam fields' : '+ Mazeed fields (load, km, speed, road, bilty…)'}</button>
            {more && (
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Load (tons)"><input className={inputCls} inputMode="decimal" value={c.loadTons ?? ''} onChange={(e) => set('loadTons', e.target.value === '' ? null : Number(e.target.value))} /></Field>
                <Field label="Operating distance (km)"><input className={inputCls} inputMode="numeric" value={c.operatingDistanceKm ?? ''} onChange={(e) => set('operatingDistanceKm', e.target.value === '' ? null : Number(e.target.value))} /></Field>
                <Field label="KM covered"><input className={inputCls} inputMode="numeric" value={c.kmCovered ?? ''} onChange={(e) => set('kmCovered', e.target.value === '' ? null : Number(e.target.value))} /></Field>
                <Field label="Speed (km/h)"><input className={inputCls} inputMode="numeric" value={c.speedKmh ?? ''} onChange={(e) => set('speedKmh', e.target.value === '' ? null : Number(e.target.value))} /></Field>
                <Field label="Road condition"><input className={inputCls} value={c.roadCondition} onChange={(e) => set('roadCondition', e.target.value)} placeholder="Regional" /></Field>
                <Field label="Fitment date"><input type="date" className={inputCls} value={c.fitmentDate ?? ''} onChange={(e) => set('fitmentDate', e.target.value || null)} /></Field>
                <Field label="Bilty #"><input className={inputCls} value={c.bilty} onChange={(e) => set('bilty', e.target.value)} /></Field>
                <Field label="Inspected by"><input className={inputCls} value={c.inspectedBy} onChange={(e) => set('inspectedBy', e.target.value)} /></Field>
              </div>
            )}
          </Card>

          <div className="sticky bottom-16 z-10 flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-lg md:bottom-4">
            <div className="flex-1 text-xs text-zinc-500">
              {need.length ? `Baaqi: ${need.join(', ')}` : <span className="font-semibold text-green-700">Claim data tayyar ✓</span>}
              <br />
              <button type="button" className="font-semibold text-zinc-900 underline" onClick={() => { persist('draft'); router.push('/claims?status=draft'); }}>Draft save</button>
            </div>
            <button type="button" className={btnPrimary} onClick={() => setStep(2)}>Aagay →</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          <Card className="flex items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <div className="mono font-bold">{c.tyreNumber || '— tyre no —'}</div>
              <div className="truncate text-xs text-zinc-500">{c.brand} {[c.size, c.pattern].filter(Boolean).join(' ')} · {c.damage || 'damage —'}</div>
            </div>
            <DecisionTag d={c.decision} />
          </Card>

          <Card className="p-4">
            <h2 className="mb-2 text-sm font-bold">Area / City</h2>
            <input className={inputCls} list="cities" value={c.location} onChange={(e) => set('location', e.target.value)} placeholder="Lahore, Sargodha Pull 111…" />
            <datalist id="cities">{cities.map((x) => <option key={x} value={x} />)}</datalist>

            <h2 className="mb-2 mt-4 text-sm font-bold">Dealer jahan check hua</h2>
            {cityDealers.length ? (
              <div role="radiogroup" aria-label="Dealer" className="flex max-h-72 flex-col overflow-y-auto rounded-lg border border-zinc-200">
                {cityDealers.map((d) => {
                  const on = c.dealerChecked === d.name;
                  return (
                    <button key={d.id} type="button" role="radio" aria-checked={on} onClick={() => set('dealerChecked', d.name)} className={`flex min-h-[52px] items-center gap-3 border-b border-zinc-100 px-3 text-left last:border-0 ${on ? 'bg-red-50' : 'bg-white'}`}>
                      <span className="flex-1"><span className="block text-sm font-semibold">{d.name}</span><span className="text-xs text-zinc-500">{d.role}{d.brands.length ? ` · ${d.brands.join(', ')}` : ''}</span></span>
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${on ? 'border-brand' : 'border-zinc-300'}`}>{on && <span className="h-2.5 w-2.5 rounded-full bg-brand" />}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-500">{c.location ? 'Is shehar ka koi dealer list mein nahi — ' : 'Pehle area likhein — '}<Link href="/dealers" className="font-semibold text-brand">dealer add karein</Link></p>
            )}

            <div className="mt-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm">
              <span className="text-xs font-bold tracking-wide text-red-800">DISTRIBUTOR · RULE SE</span>
              {dist.ask ? (
                <select className={`${inputCls} mt-1`} value={c.distributor} onChange={(e) => set('distributor', e.target.value)}>
                  <option value="">Chunein…</option>
                  {(dist.candidates.length ? dist.candidates : dealers.filter((d) => d.role.toLowerCase() === 'distributor').map((d) => d.name)).map((n) => <option key={n}>{n}</option>)}
                </select>
              ) : (
                <div className="font-bold">{c.distributor || '—'}</div>
              )}
              <div className="text-xs text-zinc-600">{c.brand ? dist.rule : 'Brand chunne ke baad rule lagega'}</div>
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="mb-2 text-sm font-bold">Customer / Transporter</h2>
            <input type="search" className={inputCls} value={custQ} onChange={(e) => setCustQ(e.target.value)} placeholder="Naam, phone ya gaari number" />
            <div role="radiogroup" aria-label="Customer" className="mt-2 flex max-h-80 flex-col overflow-y-auto rounded-lg border border-zinc-200">
              <button type="button" role="radio" aria-checked={!c.customer} onClick={() => setC((x) => ({ ...x, customer: '' }))} className={`min-h-[44px] border-b border-zinc-100 px-3 text-left text-sm ${!c.customer ? 'bg-red-50 font-semibold' : ''}`}>Koi customer nahi (sirf dealer claim)</button>
              {custList.map((u) => {
                const on = c.customer === u.name;
                return (
                  <button key={u.id} type="button" role="radio" aria-checked={on} onClick={() => setC((x) => ({ ...x, customer: u.name, truckNumber: x.truckNumber || (u.vehicles.length === 1 ? u.vehicles[0].plate : '') }))}
                    className={`flex min-h-[52px] items-center gap-3 border-b border-zinc-100 px-3 text-left last:border-0 ${on ? 'bg-red-50' : 'bg-white'}`}>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-xs font-bold text-brand-dark">{u.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}</span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{u.name}</span><span className="block truncate text-xs text-zinc-500">{[u.city, u.type, u.vehicles.length ? `${u.vehicles.length} gaari` : ''].filter(Boolean).join(' · ')}</span></span>
                  </button>
                );
              })}
            </div>
            <Link href="/customers?new=1" className="mt-2 inline-block text-sm font-semibold text-brand">+ Naya customer</Link>
          </Card>

          <Card className="grid gap-3 p-4 sm:grid-cols-2">
            <Field label="Truck number">
              <input className={`${inputCls} mono uppercase`} list="plates" value={c.truckNumber} onChange={(e) => set('truckNumber', e.target.value.toUpperCase())} placeholder="GLT-1958" />
            </Field>
            <datalist id="plates">{(cur?.vehicles ?? []).map((v) => <option key={v.plate} value={v.plate}>{v.type}</option>)}</datalist>
            <Field label="Truck type">
              <select className={inputCls} value={c.truckType} onChange={(e) => set('truckType', e.target.value)}>
                <option value="">—</option>
                {Array.from(new Set([...TRUCK_TYPES, c.truckType].filter(Boolean))).map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Driver (optional)">
              <input className={inputCls} list="drivers" value={c.driverName} onChange={(e) => set('driverName', e.target.value)} />
            </Field>
            <datalist id="drivers">{(cur?.drivers ?? []).map((d) => <option key={d} value={d} />)}</datalist>
          </Card>

          <div className="sticky bottom-16 z-10 flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-lg md:bottom-4">
            <div className="flex-1 text-xs text-zinc-500">
              {ready ? <span className="font-semibold text-green-700">Confirm karte hi claim jur jayega</span> : `Baaqi: ${[...need, !c.distributor ? 'distributor' : ''].filter(Boolean).join(', ')}`}
              <br />
              <button type="button" className="font-semibold text-zinc-900 underline" onClick={() => { persist('draft'); router.push('/claims?status=draft'); }}>Draft save</button>
              {!isNew && (
                <button type="button" className="ml-3 font-semibold text-red-700 underline" onClick={() => { if (window.confirm('Yeh claim delete karna hai?')) { deleteClaim(c.id); router.push('/claims'); } }}>Delete</button>
              )}
            </div>
            <button type="button" className={btnSecondary} onClick={() => setStep(1)}>Wapas</button>
            <button type="button" className={btnPrimary} disabled={!ready} onClick={() => { const f = persist('confirmed'); router.push(`/claims/${f.id}?saved=1`); }}>Confirm</button>
          </div>
        </div>
      )}
    </div>
  );
}
