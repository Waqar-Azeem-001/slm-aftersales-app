import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { customerToDb } from '@/lib/mappers';
import type { Customer } from '@/lib/types';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = (await req.json()) as Customer;
  const data = customerToDb(c);
  await prisma.$transaction([
    prisma.customer.upsert({ where: { id }, create: { id, ...data }, update: data }),
    prisma.vehicle.deleteMany({ where: { customerId: id, claims: { none: {} } } }),
    prisma.driver.deleteMany({ where: { customerId: id, claims: { none: {} } } }),
    prisma.vehicle.createMany({ data: (c.vehicles ?? []).map((v) => ({ plate: v.plate, type: v.type || null, tyreSize: v.tyreSize || null, customerId: id })) }),
    prisma.driver.createMany({ data: (c.drivers ?? []).map((name) => ({ name, customerId: id })) }),
  ]);
  return NextResponse.json({ ok: true });
}
