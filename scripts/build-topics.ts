// "Verses for…" in Search (docs/DECISIONS.md 2026-10-18): a small, curated index of everyday
// topics and the passages readers rank highest for them, from the OpenBible.info Topical Bible
// (CC BY 4.0, www.openbible.info/topics). Source cached in scripts/.cache/openbible.
// Run: npx tsx scripts/build-topics.ts
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BOOK_BY_OSIS } from '../src/features/bible/books';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SOURCE = join(ROOT, 'scripts/.cache/openbible/topic-scores.txt');
const OUT = join(ROOT, 'src/features/search/topics.json');
const PER_TOPIC = 6;
/** Passages that rank under a topic for reasons that don't help someone looking for comfort. */
const SKIP = new Set(['Lev.20.13']);

/** Our label → the OpenBible topics merged into it (the first word people type matches too). */
const TOPICS: Record<string, string[]> = {
  Anxiety: ['anxiety', 'anxious', 'worry'],
  Fear: ['fear', 'courage'],
  Stress: ['stress', 'overwhelmed'],
  Anger: ['anger'],
  Grief: ['grief', 'mourning', 'death of a loved one'],
  Loneliness: ['loneliness', 'lonely'],
  Depression: ['depression', 'discouragement'],
  Healing: ['healing', 'sickness'],
  Comfort: ['comfort'],
  'Letting go': ['letting go', 'moving on'],
  Forgiveness: ['forgiveness', 'forgiving others'],
  Guilt: ['guilt', 'shame'],
  Hope: ['hope'],
  Peace: ['peace'],
  Joy: ['joy'],
  Love: ['love', 'gods love'],
  Gratitude: ['thankfulness', 'gratitude'],
  Money: ['money', 'finances'],
  Contentment: ['contentment'],
  Temptation: ['temptation'],
  Pride: ['pride'],
  Humility: ['humility'],
  Doubt: ['doubt'],
  Faith: ['faith'],
  Trust: ['trust', 'trusting god'],
  Strength: ['strength'],
  Patience: ['patience', 'waiting'],
  Guidance: ['guidance', 'decisions'],
  Wisdom: ['wisdom'],
  Prayer: ['prayer'],
  Rest: ['rest'],
  Purpose: ['purpose'],
  Grace: ['grace'],
  Salvation: ['salvation'],
  Encouragement: ['encouragement'],
  Kindness: ['kindness'],
  Jealousy: ['jealousy', 'envy'],
  Marriage: ['marriage'],
  Parenting: ['parenting'],
  Friendship: ['friendship', 'friends'],
  Work: ['work'],
  Serving: ['serving others', 'service'],
  Faithfulness: ['faithfulness'],
  Protection: ['protection'],
  'New beginnings': ['new beginnings'],
};

/** OpenBible's OSIS ("Phil.4.6-Phil.4.7") → Lampstand's canonical ref ("PHP.4.6-PHP.4.7"). */
function canonical(osis: string): string | null {
  const parts = osis.split('-').map((p) => {
    const m = /^([1-3]?[A-Za-z]+)\.(\d+)\.(\d+)$/.exec(p);
    const book = m && BOOK_BY_OSIS.get(m[1]!);
    return m && book ? `${book.code}.${m[2]}.${m[3]}` : null;
  });
  return parts.every(Boolean) ? parts.join('-') : null;
}

const scores = new Map<string, Map<string, number>>();
for (const line of readFileSync(SOURCE, 'utf8').split(/\r?\n/).slice(1)) {
  const [topic, osis, score] = line.split('\t');
  if (!topic || !osis || !score) continue;
  const t = scores.get(topic) ?? new Map<string, number>();
  t.set(osis, Number(score));
  scores.set(topic, t);
}

const out: { label: string; terms: string[]; refs: string[] }[] = [];
for (const [label, names] of Object.entries(TOPICS)) {
  const merged = new Map<string, number>();
  for (const n of names) {
    const t = scores.get(n);
    if (!t) {
      console.warn(`  no OpenBible topic "${n}"`);
      continue;
    }
    for (const [osis, s] of t) merged.set(osis, (merged.get(osis) ?? 0) + s);
  }
  const refs = [...merged]
    .filter(([osis, s]) => s >= 2 && !SKIP.has(osis))
    .sort((a, b) => b[1] - a[1])
    .map(([osis]) => canonical(osis))
    .filter((r): r is string => r !== null)
    .slice(0, PER_TOPIC);
  if (refs.length < 3) {
    console.warn(`  skipping ${label}: only ${refs.length} passages`);
    continue;
  }
  out.push({ label, terms: names, refs });
}

writeFileSync(
  OUT,
  JSON.stringify(
    {
      source: 'OpenBible.info Topical Bible, www.openbible.info/topics',
      license: 'CC BY 4.0',
      topics: out,
    },
    null,
    1,
  ) + '\n',
);
console.log(`Wrote ${out.length} topics to ${OUT}`);
