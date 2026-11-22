import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { claimToDb, photoRows } from '@/lib/mappers';
import { resolveLinks } from '@/lib/relink';
import type { Claim } from '@/lib/types';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = (await req.json()) as Claim;
  const data = { ...claimToDb(c), ...(await resolveLinks(c.distributor, c.dealerChecked, c.customer)) };
  await prisma.$transaction([
    prisma.claim.upsert({ where: { id }, create: { id, ...data }, update: data }),
    prisma.photo.deleteMany({ where: { claimId: id } }),
    prisma.photo.createMany({ data: photoRows(c).map((p) => ({ ...p, claimId: id })) }),
  ]);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.claim.deleteMany({ where: { id } });
  return NextResponse.json({ ok: true });
}
