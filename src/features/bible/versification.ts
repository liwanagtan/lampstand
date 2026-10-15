import type { TranslationRecord } from '@/db/types';
import { defaultVerseCounts, type VerseCounts } from './ref';

const cache = new WeakMap<TranslationRecord, VerseCounts>();

/** Verse counts from a translation's own data, falling back to KJV versification. */
export function verseCountsFor(t: TranslationRecord | undefined): VerseCounts {
  if (!t) return defaultVerseCounts;
  let fn = cache.get(t);
  if (!fn) {
    const map = new Map(t.books.map((b) => [b.osis, b.verseCounts]));
    fn = (code) => map.get(code) ?? defaultVerseCounts(code);
    cache.set(t, fn);
  }
  return fn;
}
