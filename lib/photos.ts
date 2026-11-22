'use client';

/**
 * Photo handling in the browser:
 * - compress + auto-rotate to landscape before saving (phone photos are 3–5 MB)
 * - stored in IndexedDB until the hosting storage is connected
 */

const DB = 'slm-photos';
const STORE = 'photos';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Server copy lives on the cPanel hosting via /api/photos/[id]. IndexedDB is a local cache
// and a queue: photos that could not be uploaded (no signal) are retried by syncPhotos().
const PENDING = 'slm-photos-pending';

function pendingIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(PENDING) ?? '[]') as string[];
  } catch {
    return [];
  }
}
function setPending(ids: string[]) {
  try {
    localStorage.setItem(PENDING, JSON.stringify([...new Set(ids)]));
  } catch {
    /* storage unavailable */
  }
}

async function idbPut(id: string, blob: Blob): Promise<void> {
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGet(id: string): Promise<Blob | null> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(id);
    req.onsuccess = () => resolve((req.result as Blob) ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function upload(id: string, blob: Blob): Promise<boolean> {
  try {
    const res = await fetch(`/api/photos/${encodeURIComponent(id)}`, { method: 'PUT', body: blob });
    return res.ok;
  } catch {
    return false;
  }
}

export async function putPhoto(id: string, blob: Blob): Promise<void> {
  await idbPut(id, blob);
  setPending([...pendingIds(), id]);
  if (await upload(id, blob)) setPending(pendingIds().filter((p) => p !== id));
}

export async function getPhoto(id: string): Promise<Blob | null> {
  const local = await idbGet(id);
  if (local) return local;
  try {
    const res = await fetch(`/api/photos/${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    const blob = await res.blob();
    await idbPut(id, blob);
    return blob;
  } catch {
    return null;
  }
}

export async function deletePhoto(id: string): Promise<void> {
  const db = await open();
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
  setPending(pendingIds().filter((p) => p !== id));
  try {
    await fetch(`/api/photos/${encodeURIComponent(id)}`, { method: 'DELETE' });
  } catch {
    /* offline: the orphan file on the server is harmless */
  }
}

/** Upload photos that are still only on this device (e.g. taken without signal). Returns how many remain. */
export async function syncPhotos(): Promise<number> {
  for (const id of pendingIds()) {
    const blob = await idbGet(id).catch(() => null);
    if (!blob) {
      setPending(pendingIds().filter((p) => p !== id));
      continue;
    }
    if (await upload(id, blob)) setPending(pendingIds().filter((p) => p !== id));
  }
  return pendingIds().length;
}

/** Resize to max 1600 px on the long side, turn portrait shots to landscape, JPEG ~0.82. */
export async function compressImage(file: File, opts: { maxSide?: number; landscape?: boolean } = {}): Promise<Blob> {
  const maxSide = opts.maxSide ?? 1600;
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
  const portrait = bmp.height > bmp.width;
  const rotate = (opts.landscape ?? true) && portrait;
  const w0 = rotate ? bmp.height : bmp.width;
  const h0 = rotate ? bmp.width : bmp.height;
  const scale = Math.min(1, maxSide / Math.max(w0, h0));
  const w = Math.round(w0 * scale);
  const h = Math.round(h0 * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  if (rotate) {
    // rotate 90° counter-clockwise so the tread sits on top and text reads left to right
    ctx.translate(0, h);
    ctx.rotate(-Math.PI / 2);
    ctx.drawImage(bmp, 0, 0, h, w);
  } else {
    ctx.drawImage(bmp, 0, 0, w, h);
  }
  bmp.close();
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? file), 'image/jpeg', 0.82));
}

/** Rotate a stored photo by 90° (for "photo ulti hai" fixes). */
export async function rotateBlob(blob: Blob, clockwise = true): Promise<Blob> {
  const bmp = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = bmp.height;
  canvas.height = bmp.width;
  const ctx = canvas.getContext('2d');
  if (!ctx) return blob;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(((clockwise ? 1 : -1) * Math.PI) / 2);
  ctx.drawImage(bmp, -bmp.width / 2, -bmp.height / 2);
  bmp.close();
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? blob), 'image/jpeg', 0.85));
}

/** Barcode reading with the browser's own BarcodeDetector (Chrome on Android). Returns null where unsupported. */
export async function readBarcode(blob: Blob): Promise<string | null> {
  const BD = (globalThis as unknown as { BarcodeDetector?: new (o?: { formats?: string[] }) => { detect: (s: ImageBitmap) => Promise<{ rawValue: string }[]> } }).BarcodeDetector;
  if (!BD) return null;
  try {
    const det = new BD({ formats: ['code_128', 'code_39', 'ean_13', 'qr_code', 'data_matrix'] });
    const bmp = await createImageBitmap(blob);
    const res = await det.detect(bmp);
    bmp.close();
    return res[0]?.rawValue?.trim() || null;
  } catch {
    return null;
  }
}

export function barcodeSupported(): boolean {
  return typeof globalThis !== 'undefined' && 'BarcodeDetector' in globalThis;
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}
