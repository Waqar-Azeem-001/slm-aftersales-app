export type Decision = 'Claimable' | 'Nonclaimable' | 'Comercial' | 'Pending';
export type ClaimStatus = 'draft' | 'confirmed';
export type PhotoKind = 'full' | 'tyre' | 'serial' | 'brand' | 'dot' | 'defect' | 'extra';

export interface Claim {
  id: string;
  sNo: number | null;
  status: ClaimStatus;
  distributor: string;
  dealerChecked: string;
  customer: string;
  bilty: string;
  dot: string;
  fitmentDate: string | null;
  happenedDate: string | null;
  location: string;
  truckType: string;
  driverName: string;
  truckNumber: string;
  brand: string;
  tyreSize: string;
  size: string;
  pattern: string;
  tyreNumber: string;
  serialNumber?: string;
  loadTons: number | null;
  operatingDistanceKm: number | null;
  kmCovered: number | null;
  speedKmh: number | null;
  roadCondition: string;
  residualDepthMm: number | null;
  damage: string;
  faultCategory: string;
  vehiclePosition: string;
  decision: Decision;
  inspectedBy: string;
  whatsappInspection: string;
  remarks: string;
  /** photo ids stored in IndexedDB, keyed by kind (extra may hold several) */
  photos?: Partial<Record<PhotoKind, string[]>>;
  amountApproved?: number | null;
  approvedBy?: string;
  approvedDate?: string | null;
  createdAt?: string;
}

export interface Dealer {
  id: string;
  name: string;
  city: string;
  role: string;
  contactPerson: string;
  phone: string;
  brands: string[];
  note: string;
}

export interface Vehicle {
  plate: string;
  type: string;
  tyreSize: string;
}

export interface Customer {
  id: string;
  name: string;
  type: string;
  business: string;
  city: string;
  contactPerson: string;
  phone: string;
  fleetSize: number | null;
  vehicleTypes: string;
  sizes: string;
  vehicles: Vehicle[];
  drivers: string[];
}
