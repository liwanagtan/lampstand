import type { LampstandDB } from '@/db/db';
import type { TranslationRecord } from '@/db/types';
import { formatRef, toOsis, versesInRange, type RefRange } from './ref';
import { verseCountsFor } from './versification';

export interface PassageVerse {
  osis: string;
  chapter: number;
  verse: number;
  text: string;
  /** The verse is not part of this translation (omitted, or versified elsewhere). */
  missing: boolean;
}

export interface Passage {
  range: RefRange;
  osis: string;
  reference: string;
  translation: string;
  verses: PassageVerse[];
}

const MAX_CACHE = 200;
const cache = new Map<string, Passage>();

export function clearPassageCache(): void {
  cache.clear();
}

export async function getPassage(
  db: LampstandDB,
  t: TranslationRecord,
  range: RefRange,
): Promise<Passage> {
  const osis = toOsis(range);
  const key = `${t.code}|${osis}`;
  const hit = cache.get(key);
  if (hit) {
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }
  const counts = verseCountsFor(t);
  const ids = versesInRange(range, counts);
  const rows = await db.verses.bulkGet(ids.map((id) => [t.code, id] as [string, string]));
  const verses = ids.map((id, i) => {
    const [, c, v] = id.split('.');
    const text = rows[i]?.text ?? '';
    return { osis: id, chapter: Number(c), verse: Number(v), text, missing: !text.trim() };
  });
  const passage: Passage = {
    range,
    osis,
    reference: formatRef(range, counts),
    translation: t.code,
    verses,
  };
  cache.set(key, passage);
  if (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value!);
  return passage;
}
