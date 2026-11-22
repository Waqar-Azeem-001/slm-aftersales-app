// One-off import of data/seed/*.json into MySQL. Safe to re-run (skips existing ids).
import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const load = (f) => JSON.parse(readFileSync(new URL(`../data/seed/${f}`, import.meta.url), 'utf8'));
const nil = (v) => (v === '' || v === undefined ? null : v);
const date = (s) => (s ? new Date(`${s.slice(0, 10)}T00:00:00Z`) : null);
const DEC = ['Claimable', 'Nonclaimable', 'Comercial', 'Pending'];

const dealers = load('dealers.json');
await prisma.dealer.createMany({
  skipDuplicates: true,
  data: dealers.map((d) => ({
    id: d.id,
    name: d.name,
    city: d.city ?? '',
    role: d.role ?? '',
    contactPerson: nil(d.contactPerson),
    phone: nil(d.phone),
    brands: d.brands?.length ? d.brands.join(',') : null,
    note: nil(d.note),
  })),
});

const customers = load('customers.json');
for (const c of customers) {
  if (await prisma.customer.findUnique({ where: { id: c.id } })) continue;
  await prisma.customer.create({
    data: {
      id: c.id,
      name: c.name,
      type: c.type || 'Transporter',
      business: nil(c.business),
      city: nil(c.city),
      contactPerson: nil(c.contactPerson),
      phone: nil(c.phone),
      fleetSize: c.fleetSize ?? null,
      vehicleTypes: nil(c.vehicleTypes),
      sizes: nil(c.sizes),
      vehicles: { create: (c.vehicles ?? []).map((v) => ({ plate: v.plate, type: nil(v.type), tyreSize: nil(v.tyreSize) })) },
      drivers: { create: (c.drivers ?? []).map((name) => ({ name })) },
    },
  });
}

const byName = new Map(dealers.map((d) => [d.name, d.id]));
const custByName = new Map(customers.map((c) => [c.name, c.id]));
const claims = load('claims.json');
await prisma.claim.createMany({
  skipDuplicates: true,
  data: claims.map((c) => ({
    id: c.id,
    sNo: c.sNo ?? null,
    status: c.status ?? 'confirmed',
    distributorName: nil(c.distributor),
    dealerCheckedName: nil(c.dealerChecked),
    customerName: nil(c.customer),
    distributorId: byName.get(c.distributor) ?? null,
    dealerCheckedId: byName.get(c.dealerChecked) ?? null,
    customerId: custByName.get(c.customer) ?? null,
    bilty: nil(c.bilty),
    dot: nil(c.dot),
    fitmentDate: date(c.fitmentDate),
    happenedDate: date(c.happenedDate),
    location: nil(c.location),
    truckType: nil(c.truckType),
    driverName: nil(c.driverName),
    truckNumber: nil(c.truckNumber),
    brand: c.brand ?? '',
    tyreSize: c.tyreSize ?? '',
    size: nil(c.size),
    pattern: nil(c.pattern),
    tyreNumber: c.tyreNumber ?? '',
    serialNumber: nil(c.serialNumber),
    loadTons: c.loadTons ?? null,
    operatingDistanceKm: c.operatingDistanceKm ?? null,
    kmCovered: c.kmCovered ?? null,
    speedKmh: c.speedKmh ?? null,
    roadCondition: nil(c.roadCondition),
    residualDepthMm: c.residualDepthMm ?? null,
    damage: nil(c.damage),
    faultCategory: nil(c.faultCategory),
    vehiclePosition: nil(c.vehiclePosition),
    decision: DEC.includes(c.decision) ? c.decision : 'Pending',
    inspectedBy: c.inspectedBy || 'Waseem Akhtar',
    whatsappInspection: nil(c.whatsappInspection),
    remarks: nil(c.remarks),
  })),
});

console.log(`dealers ${await prisma.dealer.count()}, customers ${await prisma.customer.count()}, claims ${await prisma.claim.count()}`);
await prisma.$disconnect();
