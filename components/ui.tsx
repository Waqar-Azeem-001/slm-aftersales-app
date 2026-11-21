'use client';

import type { ReactNode } from 'react';
import { DECISION_STYLE } from '@/lib/rules';
import type { Decision } from '@/lib/types';

export function DecisionTag({ d }: { d: Decision }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${DECISION_STYLE[d]}`}>{d}</span>;
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-zinc-200 bg-white ${className}`}>{children}</section>;
}

export function PageTitle({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold md:text-3xl">{title}</h1>
        {sub && <p className="mt-1 text-sm text-zinc-500">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-semibold text-zinc-600">{label}</span>
      {children}
      {hint && <span className="text-xs">{hint}</span>}
    </label>
  );
}

export const inputCls = 'h-11 w-full min-w-0 rounded-lg border border-zinc-300 bg-white px-3 text-[15px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/20';
export const autoCls = 'border-amber-500 bg-amber-50 font-semibold';
export const btnPrimary = 'inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand px-4 font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-zinc-300';
export const btnSecondary = 'inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 font-semibold text-zinc-900 hover:bg-zinc-50';

export function Segmented<T extends string>({ options, value, onChange, label }: { options: readonly T[]; value: T | ''; onChange: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1 rounded-lg bg-zinc-100 p-1">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={value === o}
          onClick={() => onChange(o)}
          className={`h-9 flex-1 rounded-md px-3 text-sm font-semibold ${value === o ? 'bg-white shadow-sm' : 'text-zinc-600'}`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

export function Stat({ label, value, sub, tone = 'text-zinc-900' }: { label: string; value: ReactNode; sub?: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-5 py-4">
      <div className="text-xs font-bold tracking-wide text-zinc-500">{label}</div>
      <div className={`mt-1 text-3xl font-extrabold ${tone}`}>{value}</div>
      {sub && <div className="text-sm text-zinc-500">{sub}</div>}
    </div>
  );
}
