import { readFileSync } from 'node:fs';
import { LampstandDB } from '@/db/db';
import type { TranslationFile } from '@/schema/translation';
import { installTranslation, removeTranslation } from './install';
import { getPassage } from './passage';
import { parseRef } from './ref';
import { highlightRuns, parseQuery } from './searchCore';

const kjv = JSON.parse(readFileSync('public/bibles/kjv.json', 'utf8')) as TranslationFile;

describe('install and lookup', () => {
  const db = new LampstandDB('test-bible');
  let record: Awaited<ReturnType<typeof installTranslation>>;

  beforeAll(async () => {
    record = await installTranslation(db, kjv, { bundled: true, hash: 'abc' });
  }, 60_000);

  it('stores every verse and the versification', async () => {
    expect(record.verseCount).toBe(31102);
    expect(await db.verses.where('code').equals('KJV').count()).toBe(31102);
    expect(record.books.find((b) => b.osis === 'JHN')?.verseCounts[2]).toBe(36);
  });

  it('looks up a range quickly', async () => {
    await getPassage(db, record, parseRef('gen 1 1')!); // warm the connection
    const t0 = performance.now();
    const p = await getPassage(db, record, parseRef('1 cor 13 4-7')!);
    expect(performance.now() - t0).toBeLessThan(50);
    expect(p.reference).toBe('1 Corinthians 13:4–7');
    expect(p.verses.map((v) => v.verse)).toEqual([4, 5, 6, 7]);
    expect(p.verses[0]!.text).toMatch(/^Charity suffereth long/);
  });

  it('marks verses that are missing from a translation', async () => {
    const p = await getPassage(db, { ...record, code: 'KJV' }, parseRef('jn 3 16')!);
    expect(p.verses[0]!.missing).toBe(false);
  });

  it('removes a translation and its verses', { timeout: 60_000 }, async () => {
    await removeTranslation(db, 'KJV');
    expect(await db.verses.where('code').equals('KJV').count()).toBe(0);
    expect(await db.translations.get('KJV')).toBeUndefined();
  });
});

describe('search helpers', () => {
  it('parses quoted and plain queries', () => {
    expect(parseQuery('"so loved"')).toEqual({ query: 'so loved', phrase: 'so loved' });
    expect(parseQuery('shepherd')).toEqual({ query: 'shepherd', phrase: null });
  });

  it('highlights matched words without HTML', () => {
    const runs = highlightRuns('For God so loved the world', ['loved', 'world']);
    expect(runs.filter((r) => r.hit).map((r) => r.text)).toEqual(['loved', 'world']);
    expect(runs.map((r) => r.text).join('')).toBe('For God so loved the world');
  });
});
