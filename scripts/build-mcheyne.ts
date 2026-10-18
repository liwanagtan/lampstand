// The M'Cheyne reading calendar as a built-in plan (docs/DECISIONS.md 2026-10-18).
// The calendar is Robert Murray M'Cheyne's (1842, public domain); the day-by-day data comes
// from The M'Cheyne Plan app (github.com/willswire/mcheyne, Apache-2.0), App/PlanConstants.swift,
// cached in scripts/.cache/mcheyne. Run: npx tsx scripts/build-mcheyne.ts
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePlanFile } from '../src/schema/plan';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SOURCE = join(ROOT, 'scripts/.cache/mcheyne/PlanConstants.swift');
const OUT = join(ROOT, 'src/features/bible-app/plans/mcheyne-1-year.lampstand-plan.json');

const days = [...readFileSync(SOURCE, 'utf8').matchAll(/^\s*\[("[^\]]+")\],?\s*$/gm)].map(
  (m) => JSON.parse(`[${m[1]}]`) as string[],
);
if (days.length !== 365) throw new Error(`expected 365 days, found ${days.length}`);

/** "Jeremiah 36,45" → "Jeremiah 36", "Jeremiah 45": one passage per reading. */
const split = (reading: string): string[] => {
  if (!reading.includes(',')) return [reading];
  const m = /^(.*?\D)\s*(\d.*)$/.exec(reading);
  if (!m) return [reading];
  return m[2]!.split(',').map((part) => `${m[1]!.trim()} ${part.trim()}`);
};

const plan = {
  format: 'lampstand-plan',
  version: 2,
  id: 'mcheyne-1-year',
  name: 'M’Cheyne: the Bible in a year',
  description:
    'The classic calendar from 1842: four short readings a day, the New Testament and Psalms twice and the rest of the Old Testament once.',
  pace: 'daily',
  categories: ['through-the-bible', 'spiritual-habits'],
  audience: 'personal',
  cover: 'autumn-forest',
  credits:
    'Robert Murray M’Cheyne (1842), via Andrew Bonar’s Memoir; calendar data from The M’Cheyne Plan app (Apache-2.0)',
  license: 'Public domain',
  days: days.map((day, i) => {
    const readings = day.flatMap(split);
    return i === 0
      ? {
          readings,
          note: 'M’Cheyne paired the readings: the first two for the family, morning and evening, and the last two for your own quiet time. Read them all, or keep a pair a day at your own pace.',
        }
      : { readings };
  }),
};

const check = parsePlanFile(plan, 'builtin');
if (!check.ok) throw new Error(check.errors.join('\n'));
writeFileSync(OUT, `${JSON.stringify(plan, null, 2)}\n`);
console.log(`Wrote ${days.length} days to ${OUT}`);
