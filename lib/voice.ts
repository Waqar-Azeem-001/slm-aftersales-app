'use client';

import { DAMAGES, findTyreNumber } from './rules';
import type { Decision } from './types';

/**
 * Turns spoken text into claim fields with keyword rules (no AI).
 * Works best when the user says a keyword and then the value:
 *   "front left, depth 13.2, shoulder separation, claimable, truck GLT 1958"
 */
export interface VoiceResult {
  position?: string;
  depth?: number;
  damage?: string;
  decision?: Decision;
  truckNumber?: string;
  tyreNumber?: string;
  truckType?: string;
  heard: string;
}

const URDU_NUM: Record<string, string> = {
  ek: '1', aik: '1', do: '2', teen: '3', char: '4', chaar: '4', panch: '5', paanch: '5', chay: '6', che: '6', saat: '7', aath: '8', nau: '9', das: '10',
  six: '6', ten: '10', twelve: '12', fourteen: '14', eighteen: '18', 'twenty two': '22', baees: '22', bais: '22',
  gyarah: '11', barah: '12', baara: '12', terah: '13', teraa: '13', chaudah: '14', pandrah: '15', solah: '16', satrah: '17', atharah: '18',
};

function normalise(t: string): string {
  let s = ' ' + t.toLowerCase().replace(/[,،]/g, ' , ') + ' ';
  for (const [w, n] of Object.entries(URDU_NUM)) s = s.replace(new RegExp(`\\s${w}\\s`, 'g'), ` ${n} `);
  s = s.replace(/\s(point|pwaint|dashmalav)\s/g, '.').replace(/(\d)\s*\.\s*(\d)/g, '$1.$2');
  return s.replace(/\s+/g, ' ').trim();
}

export function parseVoice(text: string): VoiceResult {
  const s = normalise(text);
  const r: VoiceResult = { heard: text };

  const pos: [RegExp, string][] = [
    [/front left|agla left|aagay left|agla baya|f l\b|\bfl\b/, 'FL'],
    [/front right|agla right|aagay right|agla daya|\bfr\b/, 'FR'],
    [/rear left|back left|pichla left|pichla baya|\brl\b/, 'RL'],
    [/rear right|back right|pichla right|pichla daya|\brr\b/, 'RR'],
  ];
  for (const [re, v] of pos) if (re.test(s)) { r.position = v; break; }

  const dm = s.match(/(?:depth|gehrai|tread|mm)\s*(\d{1,2}(?:\.\d)?)/) || s.match(/(\d{1,2}(?:\.\d)?)\s*(?:mm|ملی)/);
  if (dm) r.depth = parseFloat(dm[1]);

  const dmg = DAMAGES.find((d) => s.includes(d.toLowerCase()));
  if (dmg) r.damage = dmg;
  else if (/shoulder/.test(s)) r.damage = 'Shoulder Separation';
  else if (/burst|phat/.test(s)) r.damage = 'Burst';
  else if (/\bcut\b|kat/.test(s)) r.damage = 'Cut through tread';
  else if (/heat|garmi/.test(s)) r.damage = 'Heat Generation';

  if (/non ?claimable|reject|nahi claim/.test(s)) r.decision = 'Nonclaimable';
  else if (/commercial|comercial/.test(s)) r.decision = 'Comercial';
  else if (/claimable|approve/.test(s)) r.decision = 'Claimable';

  const tm = s.match(/(?:truck|gaari|gari|number plate|plate)\s*(?:number|no)?\s*([a-z]{2,3})\s*-?\s*(\d{2,4})/);
  if (tm) r.truckNumber = `${tm[1].toUpperCase()}-${tm[2]}`;

  const ty = findTyreNumber(s.replace(/\s/g, ''));
  if (ty) r.tyreNumber = ty;

  const ww = s.match(/(\d{1,2})\s*(?:wheeler|wheel|pahiye)/);
  if (ww) r.truckType = `${ww[1]} Wheeler`;
  return r;
}

type Rec = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
  onend: () => void;
  onerror: (e: { error: string }) => void;
  start: () => void;
  stop: () => void;
};

export function speechSupported(): boolean {
  const w = globalThis as unknown as Record<string, unknown>;
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}

/** Starts the browser's own speech recognition; calls onText with the final transcript. */
export function listen(onText: (t: string) => void, onEnd: () => void, lang = 'en-PK'): () => void {
  const w = globalThis as unknown as Record<string, new () => Rec>;
  const C = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!C) {
    onEnd();
    return () => {};
  }
  const rec = new C();
  rec.lang = lang;
  rec.interimResults = false;
  rec.continuous = true;
  let text = '';
  rec.onresult = (e) => {
    text = Array.from(e.results).map((r) => r[0].transcript).join(' ');
  };
  rec.onend = () => {
    if (text) onText(text);
    onEnd();
  };
  rec.onerror = () => onEnd();
  rec.start();
  return () => rec.stop();
}
