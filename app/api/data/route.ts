import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { claimFromDb, claimInclude, customerFromDb, customerInclude, dealerFromDb } from '@/lib/mappers';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [claims, dealers, customers] = await Promise.all([
    prisma.claim.findMany({ include: claimInclude, orderBy: [{ sNo: 'asc' }, { createdAt: 'asc' }] }),
    prisma.dealer.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.customer.findMany({ include: customerInclude, orderBy: { createdAt: 'asc' } }),
  ]);
  return NextResponse.json({
    claims: claims.map(claimFromDb),
    dealers: dealers.map(dealerFromDb),
    customers: customers.map(customerFromDb),
  });
}
