import type { Prisma } from '@prisma/client';
import type { Claim, Customer, Dealer, PhotoKind } from './types';

const DECISIONS = ['Claimable', 'Nonclaimable', 'Comercial', 'Pending'] as const;
const KINDS: PhotoKind[] = ['full', 'tyre', 'serial', 'brand', 'dot', 'defect', 'extra'];

export const claimInclude = { photos: { orderBy: { order: 'asc' } } } satisfies Prisma.ClaimInclude;
export const customerInclude = { vehicles: true, drivers: true } satisfies Prisma.CustomerInclude;

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
const toDate = (s: string | null | undefined) => (s ? new Date(`${s.slice(0, 10)}T00:00:00Z`) : null);
const str = (v: string | null | undefined) => v ?? '';
const nil = (v: string | null | undefined) => (v ? v : null);

type DbClaim = Prisma.ClaimGetPayload<{ include: typeof claimInclude }>;

export function claimFromDb(c: DbClaim): Claim {
  const photos: Partial<Record<PhotoKind, string[]>> = {};
  for (const p of c.photos) {
    const k = p.kind as PhotoKind;
    (photos[k] ??= []).push(p.url.startsWith('idb:') ? p.url.slice(4) : p.url);
  }
  return {
    id: c.id,
    sNo: c.sNo,
    status: c.status,
    distributor: str(c.distributorName),
    dealerChecked: str(c.dealerCheckedName),
    customer: str(c.customerName),
    bilty: str(c.bilty),
    dot: str(c.dot),
    fitmentDate: day(c.fitmentDate),
    happenedDate: day(c.happenedDate),
    location: str(c.location),
    truckType: str(c.truckType),
    driverName: str(c.driverName),
    truckNumber: str(c.truckNumber),
    brand: c.brand,
    tyreSize: c.tyreSize,
    size: str(c.size),
    pattern: str(c.pattern),
    tyreNumber: c.tyreNumber,
    serialNumber: c.serialNumber ?? undefined,
    loadTons: c.loadTons,
    operatingDistanceKm: c.operatingDistanceKm,
    kmCovered: c.kmCovered,
    speedKmh: c.speedKmh,
    roadCondition: str(c.roadCondition),
    residualDepthMm: c.residualDepthMm,
    damage: str(c.damage),
    faultCategory: str(c.faultCategory),
    vehiclePosition: str(c.vehiclePosition),
    decision: c.decision,
    inspectedBy: c.inspectedBy,
    whatsappInspection: str(c.whatsappInspection),
    remarks: str(c.remarks),
    photos,
    amountApproved: c.amountApproved,
    approvedBy: c.approvedBy ?? undefined,
    approvedDate: day(c.approvedDate),
    createdAt: c.createdAt.toISOString(),
  };
}

/** Scalar columns of a claim (no relations). */
export function claimToDb(c: Claim) {
  return {
    sNo: c.sNo,
    status: c.status,
    distributorName: nil(c.distributor),
    dealerCheckedName: nil(c.dealerChecked),
    customerName: nil(c.customer),
    bilty: nil(c.bilty),
    dot: nil(c.dot),
    fitmentDate: toDate(c.fitmentDate),
    happenedDate: toDate(c.happenedDate),
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
    decision: (DECISIONS as readonly string[]).includes(c.decision) ? c.decision : ('Pending' as const),
    inspectedBy: c.inspectedBy || 'Waseem Akhtar',
    whatsappInspection: nil(c.whatsappInspection),
    remarks: nil(c.remarks),
    amountApproved: c.amountApproved ?? null,
    approvedBy: nil(c.approvedBy),
    approvedDate: toDate(c.approvedDate),
  };
}

export function photoRows(c: Claim) {
  const rows: { kind: string; url: string; order: number }[] = [];
  for (const k of KINDS) (c.photos?.[k] ?? []).forEach((id, i) => rows.push({ kind: k, url: `idb:${id}`, order: i }));
  return rows;
}

export function dealerFromDb(d: {
  id: string;
  name: string;
  city: string;
  role: string;
  contactPerson: string | null;
  phone: string | null;
  brands: string | null;
  note: string | null;
}): Dealer {
  return {
    id: d.id,
    name: d.name,
    city: d.city,
    role: d.role,
    contactPerson: str(d.contactPerson),
    phone: str(d.phone),
    brands: d.brands
      ? d.brands
          .split(',')
          .map((b) => b.trim())
          .filter(Boolean)
      : [],
    note: str(d.note),
  };
}

export function dealerToDb(d: Dealer) {
  return {
    name: d.name,
    city: d.city ?? '',
    role: d.role ?? '',
    contactPerson: nil(d.contactPerson),
    phone: nil(d.phone),
    brands: d.brands?.length ? d.brands.join(',') : null,
    note: nil(d.note),
  };
}

type DbCustomer = Prisma.CustomerGetPayload<{ include: typeof customerInclude }>;

export function customerFromDb(c: DbCustomer): Customer {
  return {
    id: c.id,
    name: c.name,
    type: c.type,
    business: str(c.business),
    city: str(c.city),
    contactPerson: str(c.contactPerson),
    phone: str(c.phone),
    fleetSize: c.fleetSize,
    vehicleTypes: str(c.vehicleTypes),
    sizes: str(c.sizes),
    vehicles: c.vehicles.map((v) => ({ plate: v.plate, type: str(v.type), tyreSize: str(v.tyreSize) })),
    drivers: c.drivers.map((d) => d.name),
  };
}

export function customerToDb(c: Customer) {
  return {
    name: c.name,
    type: c.type || 'Transporter',
    business: nil(c.business),
    city: nil(c.city),
    contactPerson: nil(c.contactPerson),
    phone: nil(c.phone),
    fleetSize: c.fleetSize ?? null,
    vehicleTypes: nil(c.vehicleTypes),
    sizes: nil(c.sizes),
  };
}
