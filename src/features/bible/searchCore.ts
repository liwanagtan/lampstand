// Word search over one translation (PRD §6 Word search). Pure functions so they run in the
// worker and in tests.
import MiniSearch from 'minisearch';

export interface SearchDoc {
  id: string; // OSIS verse id
  text: string;
}

export interface SearchHit {
  osis: string;
  text: string;
  terms: string[];
  score: number;
  exact: boolean;
}

const STOP = new Set([
  'a',
  'an',
  'and',
  'the',
  'of',
  'to',
  'in',
  'that',
  'he',
  'it',
  'is',
  'be',
  'for',
  'unto',
  'shall',
  'his',
  'they',
  'them',
  'him',
  'was',
  'with',
  'all',
  'i',
  'my',
  'me',
  'not',
  'which',
  'thou',
  'thy',
  'thee',
  'ye',
  'you',
  'your',
  'are',
  'were',
  'have',
  'hath',
  'had',
  'their',
  'from',
  'but',
  'as',
  'by',
  'on',
  'this',
  'there',
  'at',
  'when',
  'will',
  'into',
  'out',
  'up',
  'we',
  'us',
  'our',
  'or',
]);

export function processTerm(term: string): string | null {
  const t = term.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[’‘']/g, '');
  if (!t || STOP.has(t)) return null;
  return t;
}

export function createIndex(): MiniSearch<SearchDoc> {
  return new MiniSearch<SearchDoc>({
    fields: ['text'],
    storeFields: ['text'],
    processTerm,
    tokenize: (s) => s.split(/[^\p{L}\p{N}’']+/u),
  });
}

export function buildIndex(docs: SearchDoc[]): MiniSearch<SearchDoc> {
  const index = createIndex();
  index.addAll(docs);
  return index;
}

/** Parses `"so loved"` (quoted) or `so loved` into terms and an optional exact phrase. */
export function parseQuery(input: string): { query: string; phrase: string | null } {
  const trimmed = input.trim();
  const quoted = /^["“”'‘](.+?)["“”'’]?$/.exec(trimmed);
  const query = (quoted ? quoted[1]! : trimmed).trim();
  return { query, phrase: query.split(/\s+/).length > 1 ? query.toLowerCase() : null };
}

const normalize = (s: string) => s.toLowerCase().replace(/[’‘']/g, '').replace(/\s+/g, ' ');

export function searchIndex(index: MiniSearch<SearchDoc>, input: string, limit = 30): SearchHit[] {
  const { query, phrase } = parseQuery(input);
  if (query.length < 2) return [];
  const results = index.search(query, {
    combineWith: 'AND',
    prefix: (_term, i, terms) => i === terms.length - 1,
    fuzzy: (term) => (term.length > 5 ? 0.15 : 0),
  });
  const wanted = phrase ? normalize(phrase) : null;
  const hits = results.map((r) => {
    const text = (r as unknown as { text: string }).text;
    const exact = wanted ? normalize(text).includes(wanted) : false;
    return {
      osis: r.id as string,
      text,
      terms: r.terms,
      score: r.score + (exact ? 1000 : 0),
      exact,
    };
  });
  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, limit);
}

/** Splits text into plain and highlighted runs for safe rendering (never HTML). */
export function highlightRuns(text: string, terms: string[]): { text: string; hit: boolean }[] {
  const clean = terms
    .filter((t) => t.length > 1)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (clean.length === 0) return [{ text, hit: false }];
  const re = new RegExp(`\\b(${clean.join('|')})[\\p{L}’']*`, 'giu');
  const runs: { text: string; hit: boolean }[] = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) runs.push({ text: text.slice(last, m.index), hit: false });
    runs.push({ text: m[0], hit: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) runs.push({ text: text.slice(last), hit: false });
  return runs;
}
