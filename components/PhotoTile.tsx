'use client';

import { useEffect, useRef, useState } from 'react';
import { compressImage, deletePhoto, getPhoto, putPhoto, rotateBlob } from '@/lib/photos';
import { newId } from '@/lib/store';

interface Props {
  label: string;
  photoId?: string;
  onChange: (id: string | undefined, blob?: Blob) => void;
  big?: boolean;
}

/** One photo slot: tap to take/choose a photo; compressed + rotated to landscape before saving. */
export default function PhotoTile({ label, photoId, onChange, big }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    let u: string | null = null;
    if (photoId) {
      getPhoto(photoId).then((b) => {
        if (b && alive) {
          u = URL.createObjectURL(b);
          setUrl(u);
        }
      });
    } else setUrl(null);
    return () => {
      alive = false;
      if (u) URL.revokeObjectURL(u);
    };
  }, [photoId]);

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const blob = await compressImage(file);
      const id = newId('p');
      await putPhoto(id, blob);
      if (photoId) await deletePhoto(photoId);
      onChange(id, blob);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  async function rotate() {
    if (!photoId) return;
    const b = await getPhoto(photoId);
    if (!b) return;
    const r = await rotateBlob(b, true);
    const id = newId('p');
    await putPhoto(id, r);
    await deletePhoto(photoId);
    onChange(id, r);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => input.current?.click()}
        aria-label={`${label} ki photo`}
        className={`relative flex w-full flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl text-xs font-semibold ${big ? 'h-36' : 'h-[100px]'} ${
          url ? 'border border-zinc-800 bg-zinc-800 text-white' : 'border border-dashed border-zinc-400 bg-white text-zinc-700'
        }`}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={label} className="absolute inset-0 h-full w-full object-cover opacity-90" />
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C00000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
        )}
        <span className={`relative ${url ? 'rounded bg-black/60 px-1.5 py-0.5' : ''}`}>{busy ? 'Saving…' : label}</span>
        {url && (
          <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-white">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>
          </span>
        )}
      </button>
      {url && (
        <div className="absolute bottom-1.5 left-1.5 flex gap-1">
          <button type="button" onClick={rotate} aria-label={`${label} ghumayein`} className="h-7 w-7 rounded-md bg-black/60 text-sm text-white">↻</button>
          <button type="button" onClick={async () => { if (photoId) await deletePhoto(photoId); onChange(undefined); }} aria-label={`${label} hatayein`} className="h-7 w-7 rounded-md bg-black/60 text-sm text-white">✕</button>
        </div>
      )}
      <input ref={input} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  );
}
