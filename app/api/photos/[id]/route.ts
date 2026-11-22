import { NextResponse } from 'next/server';

/**
 * Proxy to the photo script on the cPanel hosting (hosting/slm-photos.php).
 * Needs PHOTO_API_URL (full https URL of slm-photos.php) and PHOTO_SECRET.
 */
export const dynamic = 'force-dynamic';

const ID = /^[A-Za-z0-9_-]{4,64}$/;

function remote(action: string, id: string) {
  const base = process.env.PHOTO_API_URL;
  const secret = process.env.PHOTO_SECRET;
  if (!base || !secret) return null;
  return { url: `${base}${base.includes('?') ? '&' : '?'}action=${action}&id=${encodeURIComponent(id)}`, headers: { 'X-Photo-Secret': secret } };
}

async function call(action: string, id: string, init: RequestInit = {}) {
  const r = remote(action, id);
  if (!ID.test(id)) return NextResponse.json({ error: 'bad id' }, { status: 400 });
  if (!r) return NextResponse.json({ error: 'photo storage not configured' }, { status: 503 });
  try {
    return await fetch(r.url, { ...init, headers: { ...r.headers, ...(init.headers ?? {}) }, cache: 'no-store' });
  } catch {
    return NextResponse.json({ error: 'photo server unreachable' }, { status: 502 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const form = new FormData();
  form.append('photo', new Blob([await req.arrayBuffer()], { type: 'image/jpeg' }), `${id}.jpg`);
  const res = await call('put', id, { method: 'POST', body: form });
  return NextResponse.json({ ok: res.ok }, { status: res.ok ? 200 : res.status });
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await call('get', id);
  if (!res.ok) return new NextResponse(null, { status: res.status });
  return new NextResponse(await res.arrayBuffer(), { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=86400' } });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await call('delete', id, { method: 'POST' });
  return NextResponse.json({ ok: res.ok }, { status: res.ok ? 200 : res.status });
}
