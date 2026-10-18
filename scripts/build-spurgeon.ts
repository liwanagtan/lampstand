// Spurgeon's Morning and Evening (1865, public domain) as Today's classic devotional
// (docs/DECISIONS.md 2026-10-19). Source: CCEL's single-file edition (morn_eve-bod.html),
// cached in scripts/.cache/spurgeon. Run: npx tsx scripts/build-spurgeon.ts
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseRef, toOsis } from '../src/features/bible/ref';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SOURCE = join(ROOT, 'scripts/.cache/spurgeon/morn_eve-bod.html');
const OUT = join(ROOT, 'public/devotionals/morning-evening.json');

interface Reading {
  /** Spurgeon's key verse as he quoted it (KJV), and its reference. */
  quote: string;
  reference: string;
  /** Canonical ref, so Lampstand can show the verse in the reader's own translation. */
  ref: string | null;
  body: string[];
}

/** Typographic tidy only; never changes his words. */
const tidy = (t: string) =>
  t
    .replace(/\s+/g, ' ')
    .replace(/--/g, '—')
    .replace(/\s+([?!;:,.])/g, '$1')
    .trim();

const html = readFileSync(SOURCE, 'latin1');
const parts = html.split(/<a name="(\d\d)\/(\d\d)\/(AM|PM)"><\/a>/);
const days: Record<string, { morning?: Reading; evening?: Reading }> = {};
let missingRefs = 0;

for (let i = 1; i < parts.length; i += 4) {
  const [month, day, half, chunk] = [parts[i]!, parts[i + 1]!, parts[i + 2]!, parts[i + 3]!];
  const text = chunk
    .replace(/<H2>[^<]*<\/H2>/gi, '')
    .replace(/<\/?(BODY|HTML)>/gi, '');
  const paras = text
    .split(/<p>/i)
    .map((p) => p.replace(/<[^>]+>/g, '').trim())
    .filter(Boolean);
  let head = paras.shift() ?? '';
  // Now and then the reference sits in its own paragraph after the verse.
  if (!/--\s*\S/.test(head) && /^--/.test(paras[0] ?? '')) head = `${head}\n${paras.shift()}`;
  const m = /^([\s\S]*?)\s*--\s*([^\n]+)$/.exec(head.trim());
  const quote = tidy((m ? m[1]! : head).replace(/^"|"$/g, '').replace(/^"|"$/g, ''));
  const reference = tidy(m ? m[2]! : '');
  // "Luke 24:33,35" → the first verse for the reader; the full reference stays as written.
  const parsed = reference ? (parseRef(reference) ?? parseRef(reference.split(',')[0]!)) : null;
  if (!parsed) missingRefs++;
  const reading: Reading = {
    quote,
    reference,
    ref: parsed ? toOsis(parsed) : null,
    body: paras.map(tidy),
  };
  const key = `${month}-${day}`;
  days[key] ??= {};
  days[key][half === 'AM' ? 'morning' : 'evening'] = reading;
}

const count = Object.values(days).reduce((n, d) => n + (d.morning ? 1 : 0) + (d.evening ? 1 : 0), 0);
if (count !== 732) throw new Error(`expected 732 readings, found ${count}`);
writeFileSync(
  OUT,
  JSON.stringify({
    title: 'Morning and Evening',
    author: 'Charles H. Spurgeon',
    year: 1865,
    license: 'Public domain',
    source: 'Christian Classics Ethereal Library (ccel.org)',
    days,
  }),
);
console.log(`Wrote ${count} readings (${missingRefs} without a parsable reference) to ${OUT}`);
