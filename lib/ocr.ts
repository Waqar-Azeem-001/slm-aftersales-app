'use client';

import { BRANDS, DOT_RE, PATTERN_RE, SIZE_RE, findTyreNumber } from './rules';

/**
 * Reads printed text from a label/sidewall photo in the browser (Tesseract.js, no AI service)
 * and pulls out the fields by pattern. Sticker labels read well; moulded rubber text is hit and miss,
 * so every value it fills is shown yellow for the user to check.
 */
export interface OcrFields {
  tyreNumber?: string;
  brand?: string;
  size?: string;
  pattern?: string;
  dot?: string;
  text: string;
}

export async function readText(blob: Blob): Promise<string> {
  try {
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng');
    const { data } = await worker.recognize(blob);
    await worker.terminate();
    return data.text || '';
  } catch {
    return '';
  }
}

export function extractFields(raw: string): OcrFields {
  const text = raw.toUpperCase().replace(/[|]/g, 'I');
  const flat = text.replace(/\s+/g, ' ');
  const out: OcrFields = { text: raw };
  const t = findTyreNumber(flat.replace(/\s/g, ' ')) ?? findTyreNumber(flat.replace(/\s/g, ''));
  if (t) out.tyreNumber = t;
  const compact = flat.replace(/\s/g, '');
  const b = BRANDS.find((x) => compact.includes(x)) ?? (compact.includes('LONGMARCH') ? 'LONGMARCH' : undefined);
  if (b) out.brand = b;
  const s = flat.match(SIZE_RE);
  if (s) out.size = s[1].replace(/\s/g, '').toUpperCase();
  const p = flat.match(PATTERN_RE);
  if (p) out.pattern = p[1];
  const dotM = flat.match(/DOT[^0-9]{0,20}(\d{4})/) || flat.match(DOT_RE);
  if (dotM) out.dot = dotM[1];
  return out;
}
