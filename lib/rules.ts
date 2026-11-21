import type { Claim, Dealer, Decision } from './types';

export const BRANDS = ['SLM', 'SUPERCARGO', 'LONGMARCH', 'ROADLUX', 'STARLUX'] as const;

export const DAMAGES = [
  'Shoulder Separation',
  'Burst',
  'Cut through tread',
  'Tread Separation',
  'Heat Generation',
  'Runflat',
  'Shoulder Rib Detachment',
  'Sidewall Separation',
  'Bead Damage',
  'Road Hazard',
  'Blister',
  'Open Tread Splice',
];

export const POSITIONS = ['FL', 'FR', 'RL', 'RR'];
export const TRUCK_TYPES = ['6 Wheeler', '10 Wheeler', '12 Wheeler', '14 Wheeler', '22 Wheeler'];

/** SUPERCARGO and LONGMARCH are treated as SLM. S116 pattern is always STARLUX. */
export function brandGroup(brand: string, pattern = ''): 'SLM' | 'STARLUX' | 'ROADLUX' | string {
  const b = brand.toUpperCase().replace(/\s+/g, '');
  if (pattern.toUpperCase() === 'S116') return 'STARLUX';
  if (b === 'SUPERCARGO' || b === 'LONGMARCH' || b === 'SLM') return 'SLM';
  return b;
}

export interface DistributorResult {
  name: string | null;
  rule: string;
  /** more than one candidate, or none: the user has to pick */
  ask: boolean;
  candidates: string[];
}

/**
 * Distributor rules (from the user):
 * - every ROADLUX tyre, any city → MYCO Corporation
 * - Lahore: SLM (incl. SUPERCARGO / LONGMARCH) → Z & H Enterprises; STARLUX → Asif Brothers
 * - other cities: that city's distributor for the brand from the dealer list; ask when several or none
 */
export function resolveDistributor(brand: string, pattern: string, city: string, dealers: Dealer[]): DistributorResult {
  const g = brandGroup(brand, pattern);
  const c = (city || '').toLowerCase().split(' ')[0];
  if (g === 'ROADLUX') return { name: 'MYCO Corporation', rule: 'Har ROADLUX tyre MYCO Corporation ke under', ask: false, candidates: [] };
  if (c === 'lahore') {
    if (g === 'SLM') return { name: 'Z & H Enterprises', rule: `${brand} = SLM · Lahore ka wahid SLM distributor`, ask: false, candidates: [] };
    if (g === 'STARLUX') return { name: 'Asif Brothers', rule: 'STARLUX Lahore → Asif Brothers', ask: false, candidates: [] };
  }
  const list = dealers.filter(
    (d) => d.role.toLowerCase() === 'distributor' && d.city.toLowerCase().startsWith(c) && (d.brands.length === 0 || d.brands.includes(g)),
  );
  if (list.length === 1) return { name: list[0].name, rule: `${city} ka ${g} distributor (dealer list)`, ask: false, candidates: [list[0].name] };
  return {
    name: null,
    rule: list.length ? `${city} mein ${list.length} distributors — chunein` : `${city} ka ${g} distributor list mein nahi — chunein`,
    ask: true,
    candidates: list.map((d) => d.name),
  };
}

export function suggestDecision(damage: string): Decision | '' {
  if (!damage) return '';
  // shoulder crack = Shoulder Separation = claimable unless worn out / non-dealer
  if (/shoulder/i.test(damage)) return 'Claimable';
  return 'Nonclaimable';
}

export function faultCategory(d: string): string {
  const x = d.toLowerCase();
  if (x.includes('shoulder')) return x.includes('rib') ? 'Shoulder Rib Detachment' : x.includes('detach') ? 'Shoulder Detachment' : 'Shoulder Separation';
  if (x.includes('tread') && x.includes('sep')) return 'Tread Separation';
  if (x.includes('cut')) return 'Cut / Cut Through Tread';
  if (x.includes('burst')) return 'Burst';
  if (x.includes('runflat')) return 'Runflat';
  if (x.includes('sidewall')) return 'Sidewall Separation';
  if (x.includes('heat')) return 'Heat Generation';
  if (x.includes('road') && x.includes('hazard')) return 'Road Hazard';
  return 'Other';
}

/** "SNOC578658", "HSOB4A8602": 4 letters + 6 alphanumerics */
export const TYRE_NO_RE = /\b([A-Z]{4}[0-9A-Z]{6})\b/g;

/** First 4-letter + 6-character code that has at least 4 digits (avoids words like "TENWHEELER"). */
export function findTyreNumber(text: string): string | undefined {
  for (const m of text.toUpperCase().matchAll(TYRE_NO_RE)) if ((m[1].match(/\d/g) ?? []).length >= 4) return m[1];
  return undefined;
}
export const SIZE_RE = /\b(\d{1,2}\.\d{2}\s?R\s?\d{2}(?:\.\d)?|\d{3}\/\d{2}\s?R\s?\d{2}(?:\.\d)?)\b/i;
export const PATTERN_RE = /\b([A-Z]{1,2}\d{3}\+?)\b/;
export const DOT_RE = /\b(\d{4})\b/;

export function findDuplicate(claims: Claim[], tyreNumber: string, excludeId?: string): Claim | undefined {
  const t = tyreNumber.trim().toUpperCase();
  if (t.length < 6) return undefined;
  return claims.find((c) => c.id !== excludeId && c.status === 'confirmed' && c.tyreNumber.toUpperCase() === t);
}

export const DECISION_STYLE: Record<Decision, string> = {
  Claimable: 'bg-green-100 text-green-800',
  Nonclaimable: 'bg-red-100 text-red-800',
  Comercial: 'bg-amber-100 text-amber-800',
  Pending: 'bg-zinc-100 text-zinc-700',
};

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}-${m}-${y}`;
}

export function monthKey(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 7) : 'unknown';
}

export function monthLabel(key: string): string {
  if (key === 'unknown') return 'Unknown';
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('en-GB', { month: 'long', year: 'numeric' });
}
