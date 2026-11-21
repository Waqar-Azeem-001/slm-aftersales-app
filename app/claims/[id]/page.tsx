'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useStore } from '@/lib/store';
import { getPhoto } from '@/lib/photos';
import { fmtDate } from '@/lib/rules';
import ClaimForm from '@/components/ClaimForm';
import { Card, DecisionTag, btnPrimary, btnSecondary } from '@/components/ui';
import type { PhotoKind } from '@/lib/types';

const LABELS: Record<PhotoKind, string> = { full: 'Poora tyre', tyre: 'Tyre no', serial: 'Serial label', brand: 'Brand / size', dot: 'DOT', defect: 'Defect', extra: 'Extra' };

function Thumb({ id, label }: { id: string; label: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let u: string | null = null;
    getPhoto(id).then((b) => { if (b) { u = URL.createObjectURL(b); setUrl(u); } });
    return () => { if (u) URL.revokeObjectURL(u); };
  }, [id]);
  return (
    <a href={url ?? '#'} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url ? <img src={url} alt={label} className="h-24 w-full object-cover" /> : <div className="h-24" />}
      <div className="px-2 py-1 text-xs font-semibold text-zinc-600">{label}</div>
    </a>
  );
}

function Detail() {
  const { id } = useParams<{ id: string }>();
  const saved = useSearchParams().get('saved') === '1';
  const { claims, ready } = useStore();
  const [edit, setEdit] = useState(false);
  const c = claims.find((x) => x.id === id);
  if (!ready) return null;
  if (!c) return <p className="text-zinc-500">Claim nahi mila. <Link href="/claims" className="text-brand">Claims list</Link></p>;
  if (edit || c.status === 'draft') return <ClaimForm initial={c} />;

  const rows: [string, string | number | null | undefined][] = [
    ['Happened date', fmtDate(c.happenedDate)], ['Location', c.location], ['Distributor', c.distributor], ['Dealer checked', c.dealerChecked],
    ['Customer', c.customer], ['Truck number', c.truckNumber], ['Truck type', c.truckType], ['Driver', c.driverName],
    ['Brand', c.brand], ['Tyre size', c.tyreSize], ['DOT', c.dot], ['Position', c.vehiclePosition], ['Residual depth (mm)', c.residualDepthMm],
    ['Load (tons)', c.loadTons], ['KM covered', c.kmCovered], ['Road condition', c.roadCondition], ['Fault category', c.faultCategory],
    ['Bilty', c.bilty], ['Inspected by', c.inspectedBy], ['Remarks', c.remarks],
  ];
  const photos = Object.entries(c.photos ?? {}).flatMap(([k, ids]) => (ids ?? []).map((pid, i) => ({ pid, label: k === 'extra' ? `Extra ${i + 1}` : LABELS[k as PhotoKind] })));

  return (
    <div className="mx-auto max-w-3xl">
      {saved && <div className="mb-4 rounded-xl border border-green-300 bg-green-50 px-4 py-3 font-semibold text-green-800">✓ Claim #{c.sNo} save ho gaya{c.customer ? ` aur ${c.customer} ke saath jur gaya` : ''}.</div>}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <h1 className="text-2xl font-extrabold">Claim #{c.sNo}</h1>
          <p className="mono text-lg font-bold">{c.tyreNumber}</p>
        </div>
        <DecisionTag d={c.decision} />
        <button type="button" className={btnSecondary} onClick={() => setEdit(true)}>Edit</button>
        <Link href="/claims/new" className={btnPrimary}>Agla claim</Link>
      </div>
      <Card className="mb-4 p-4">
        <div className="mb-1 text-sm text-zinc-500">Damage</div>
        <div className="text-lg font-bold">{c.damage || '—'}</div>
      </Card>
      {photos.length > 0 && (
        <Card className="mb-4 grid grid-cols-3 gap-2 p-3 sm:grid-cols-6">
          {photos.map((p) => <Thumb key={p.pid} id={p.pid} label={p.label} />)}
        </Card>
      )}
      <Card>
        <dl className="divide-y divide-zinc-100">
          {rows.filter(([, v]) => v !== '' && v !== null && v !== undefined && v !== '—').map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 px-4 py-2.5 text-sm">
              <dt className="text-zinc-500">{k}</dt>
              <dd className="text-right font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  );
}

export default function ClaimDetailPage() {
  return (
    <Suspense>
      <Detail />
    </Suspense>
  );
}
