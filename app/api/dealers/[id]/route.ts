import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { dealerToDb } from '@/lib/mappers';
import type { Dealer } from '@/lib/types';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = dealerToDb((await req.json()) as Dealer);
  await prisma.dealer.upsert({ where: { id }, create: { id, ...data }, update: data });
  return NextResponse.json({ ok: true });
}
