// Word study in the Bible reader (docs/WORD-STUDY.md). Sources, cached in scripts/.cache:
// - bsb/bsb_tables.tsv: the Berean Standard Bible's word tables, linking each English phrase to
//   the Hebrew or Greek word behind it (public domain since 30 April 2023, berean.bible/terms.htm).
// - stepbible/TBESH and TBESG: STEP Bible's brief lexicons of Hebrew and Greek (CC BY 4.0,
//   www.STEPBible.org).
// Run: npx tsx scripts/build-wordstudy.ts
//
// Changes we make (the licence asks us to say so): lexicon entries are cut to the word, its
// transliteration, part of speech, a gloss and a short meaning, and split into small files.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BOOKS } from '../src/features/bible/books';
import { strongKey, verseKey } from '../src/features/bible-app/wordStudyCodes';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CACHE = join(ROOT, 'scripts/.cache');
const OUT = join(ROOT, 'public/words');

type Bible = { books: { osis: string; chapters: string[][] }[] };
const bsb = JSON.parse(readFileSync(join(ROOT, 'public/bibles/bsb.json'), 'utf8')) as Bible;

// --- Lexicons ------------------------------------------------------------------------------

interface Entry {
  /** Original word, transliteration, part of speech, gloss, short meaning. */
  w: string;
  t: string;
  p: string;
  g: string;
  m: string[];
}

const POS: Record<string, string> = {
  N: 'noun',
  V: 'verb',
  A: 'adjective',
  Adj: 'adjective',
  Adv: 'adverb',
  ADV: 'adverb',
  Prep: 'preposition',
  PREP: 'preposition',
  Conj: 'conjunction',
  CONJ: 'conjunction',
  Pro: 'pronoun',
  P: 'pronoun',
  Prt: 'particle',
  PRT: 'particle',
  Intj: 'interjection',
  INJ: 'interjection',
  T: 'article',
  Art: 'article',
};
const GENDER: Record<string, string> = { M: 'masculine', F: 'feminine', N: 'neuter' };

/** "H:N-M" → "noun, masculine"; "N:N-M-P" (a person's name) → "name". */
function partOfSpeech(morph: string): string {
  const [kind, rest = ''] = morph.split(':');
  if (kind === 'N') return rest.includes('-L') ? 'place name' : 'name';
  const [pos = '', gender] = rest.split('-');
  const word = POS[pos] ?? '';
  return word && gender && GENDER[gender] && word === 'noun' ? `${word}, ${GENDER[gender]}` : word;
}

/** One tidy line: no leading punctuation, no unclosed citation, at most 200 characters. */
function shorten(line: string): string {
  let l = line.replace(/^[\s:;,.]+/, '');
  const open = l.lastIndexOf('(');
  if (open > 0 && l.indexOf(')', open) < 0) l = l.slice(0, open).trim().replace(/[,;]$/, '');
  return l.length > 200 ? `${l.slice(0, 197).replace(/\s+\S*$/, '')}…` : l;
}

/**
 * The lexicon's meaning as at most four short lines of plain text. Hebrew entries are numbered
 * senses already; Greek entries are a scholar's article, so we keep each numbered sense up to its
 * first reference or colon.
 */
function meaning(html: string, lang: 'H' | 'G'): string[] {
  const lines = html
    .split(/<br\s*\/?>/i)
    .map((l) =>
      l
        .replace(/<ref='[^']*'>[\s\S]*?<\/ref>/g, lang === 'G' ? '' : '$&')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/_+/g, '')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter(
      (l) => l && !/^\[in LXX/.test(l) && !/^(Also means|Combined with|Another spelling)/.test(l),
    );
  if (lang === 'H')
    return lines
      .map((l) =>
        l
          .replace(/^\d+[a-z0-9]*\)\s*/, '')
          .replace(/\s*\((?:[HG]\d{4}[A-Z]?|\?)\)/g, '')
          .replace(/[;,]$/, ''),
      )
      .filter((l) => !/^\([A-Za-z ]+\)$/.test(l) && /[a-z]{2}/i.test(l))
      .slice(0, 4)
      .map(shorten);
  const senses = lines
    .filter((l) => /^(\d+|\([a-z]\))\.?\s/.test(l))
    .map((l) =>
      l
        .replace(/^(\d+|\([a-z]\))\.?\s+/, '')
        .split(/[:;]|\s(?:[1-3]?[A-Z][a-z]{1,3}\.\d)/)[0]!
        .replace(/[\s,.(]+$/, '')
        .trim(),
    )
    // Grammar notes ("anarthrous", "more freq., with art.", "c. gen.") aren't meanings.
    .filter(
      (l) =>
        /[a-z]{3}/.test(l) &&
        !/\b(anarthrous|art|freq|absol|gen|acc|dat|pass|mid|pl|sing|c|cf|seq|impers|metaph|pres|aor|pf|fut|subst|neut|masc|fem|w)\.(?=\s|,|$)|\banarthrous\b|\bwith art\b/i.test(
          l,
        ),
    );
  return senses.slice(0, 4).map(shorten);
}

function readLexicon(file: string): Map<number, Entry> {
  const out = new Map<number, Entry>();
  /** Numbers whose entry so far is only a name. */
  const named = new Set<number>();
  for (const line of readFileSync(join(CACHE, 'stepbible', file), 'utf8').split('\n')) {
    const cols = line.split('\t');
    // Extended numbers split some words ("H5216a" and "H5216b" for two spellings of "lamp").
    const m = /^([HG])(\d{4})[a-z]?$/i.exec(cols[0] ?? '');
    if (!m || cols.length < 8) continue;
    const lang = m[1]!.toUpperCase() as 'H' | 'G';
    const key = strongKey(lang, Number(m[2]));
    // A word's own sense wins over names built from it ("shepherd" over "House of Shepherds"):
    // the first row that isn't a name, else the first row.
    const isName = cols[5]!.startsWith('N:') || /a Part of/.test(cols[1] ?? '');
    const seen = out.get(key);
    if (seen && (isName || !named.has(key))) continue;
    if (isName) named.add(key);
    else named.delete(key);
    out.set(key, {
      w: cols[3]!.trim(),
      t: cols[4]!.trim(),
      p: partOfSpeech(cols[5]!.trim()),
      g: cols[6]!.trim(),
      m: meaning(cols[7] ?? '', lang),
    });
  }
  return out;
}

const lexicon = new Map([
  ...readLexicon(
    'TBESH - Translators Brief lexicon of Extended Strongs for Hebrew - STEPBible.org CC BY.txt',
  ),
  ...readLexicon(
    'TBESG - Translators Brief lexicon of Extended Strongs for Greek - STEPBible.org CC BY.txt',
  ),
]);

// --- Linking the BSB's English words to Strong's numbers --------------------------------------

/** Small words that carry no study of their own: underlining stops at the meaningful word. */
const STOP = new Set(
  `a an the and or but nor so yet for to of in on at by with from into onto upon unto as than that this these those
  is are was were be been being am will shall would should could can may might must do does did has have had
  my your his her its our their me you him us them i he she it we they thy thee thine o not no
  who whom whose which what there then also even very`.split(/\s+/),
);

/** Hebrew and Greek parsing that names a word worth studying (not a particle or a preposition). */
const CONTENT = /^(N|V|Adj|A-|Adv(?!-NegPrt)|ADV|Number|Interjection|INJ)/;

type Row = {
  sort: number;
  verse: string;
  heb: string;
  grk: string;
  parsing: string;
  english: string;
};

const rows: Row[] = [];
const lines = readFileSync(join(CACHE, 'bsb/bsb_tables.tsv'), 'utf8')
  .split('\n')
  .slice(1)
  .map((l) => l.split('\t'))
  .filter((c) => c.length >= 19);
// Rows come in Hebrew or Greek word order; only one row per verse names it ("Psalm 119:105"), so
// every row finds its verse through the table's verse number.
const verseName = new Map<string, string>();
for (const c of lines) if (c[12]?.trim()) verseName.set(c[3]!, c[12].trim());
for (const c of lines) {
  rows.push({
    sort: Number(c[2]),
    verse: verseName.get(c[3]!) ?? '',
    heb: c[10]!.trim(),
    grk: c[11]!.trim(),
    parsing: c[8]!.trim(),
    english: c[18]!,
  });
}
rows.sort((a, b) => a.sort - b.sort);

// The tables name books ("Psalm 119:105"); they come in canonical order.
const bookOf = new Map<string, number>();
for (const r of rows) {
  const name = r.verse.replace(/\s+\d+:\d+$/, '');
  if (!bookOf.has(name)) bookOf.set(name, bookOf.size);
}
if (bookOf.size !== BOOKS.length) throw new Error(`expected 66 books, found ${bookOf.size}`);

/** The words worth underlining in one English phrase: trimmed of small words at either end. */
function core(phrase: string): string | null {
  const words = phrase
    .replace(/[[\]{}]/g, ' ')
    .replace(/\bvvv\b/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const plain = (w: string) => w.toLowerCase().replace(/[^a-z']/g, '');
  while (words.length && STOP.has(plain(words[0]!))) words.shift();
  while (words.length && STOP.has(plain(words[words.length - 1]!))) words.pop();
  const text = words.join(' ').replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, '');
  return /[A-Za-z]/.test(text) ? text : null;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Per book: chapters → verses → flat [start, length, strong, …] over the BSB verse text. */
const links = BOOKS.map((_, i) => bsb.books[i]!.chapters.map((ch) => ch.map((): number[] => [])));
const usage = new Map<number, number[]>();
let linked = 0;
let missed = 0;
const cursor = new Map<string, number>();

for (const r of rows) {
  const number = r.heb ? Number(r.heb) : r.grk ? Number(r.grk) : NaN;
  if (!Number.isFinite(number) || !r.english.trim()) continue;
  const segments = r.parsing.split('|').map((s) => s.trim());
  if (!segments.some((s) => CONTENT.test(s))) continue;
  const strong = strongKey(r.heb ? 'H' : 'G', number);
  if (!lexicon.has(strong)) continue;
  const words = core(r.english);
  if (!words) continue;

  const m = /^(.*)\s+(\d+):(\d+)$/.exec(r.verse);
  if (!m) continue;
  const bookIndex = bookOf.get(m[1]!)!;
  const chapter = Number(m[2]);
  const verse = Number(m[3]);
  const text = bsb.books[bookIndex]?.chapters[chapter - 1]?.[verse - 1];
  if (!text) continue;

  // English order follows the BSB sort, so each phrase is found after the one before it.
  const at = cursor.get(r.verse) ?? 0;
  const re = new RegExp(`(?<![A-Za-z])${escape(words)}(?![A-Za-z])`, 'i');
  let found = re.exec(text.slice(at));
  let start = found ? at + found.index : -1;
  if (!found) {
    found = re.exec(text);
    start = found ? found.index : -1;
  }
  if (!found || start < 0) {
    missed++;
    continue;
  }
  cursor.set(r.verse, Math.max(at, start + found[0].length));
  links[bookIndex]![chapter - 1]![verse - 1]!.push(start, found[0].length, strong);
  linked++;

  const key = verseKey(bookIndex, chapter, verse);
  const refs = usage.get(strong) ?? [];
  if (refs[refs.length - 1] !== key) refs.push(key);
  usage.set(strong, refs);
}

// --- Writing ---------------------------------------------------------------------------------

rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'lex'), { recursive: true });
let bytes = 0;
const write = (path: string, data: unknown) => {
  const json = JSON.stringify(data);
  writeFileSync(join(OUT, path), json);
  bytes += json.length;
};

BOOKS.forEach((b, i) => {
  // Within a verse, spans go in text order so the reader can draw them in one pass.
  const chapters = links[i]!.map((ch) =>
    ch.map((flat) => {
      const spans: [number, number, number][] = [];
      for (let k = 0; k < flat.length; k += 3) spans.push([flat[k]!, flat[k + 1]!, flat[k + 2]!]);
      spans.sort((x, y) => x[0] - y[0]);
      return spans.filter((s, k) => k === 0 || s[0] >= spans[k - 1]![0] + spans[k - 1]![1]).flat();
    }),
  );
  write(`${b.code}.json`, { book: b.code, chapters });
});

/** Lexicon entries with their verses, in files of 100 Strong's numbers (H52 = H5200–H5299). */
const chunks = new Map<string, Record<number, Entry & { r: number[] }>>();
for (const [strong, refs] of usage) {
  const entry = lexicon.get(strong)!;
  const name = `${strong >= 10000 ? 'G' : 'H'}${Math.floor((strong % 10000) / 100)}`;
  const chunk = chunks.get(name) ?? {};
  chunk[strong] = { ...entry, r: refs };
  chunks.set(name, chunk);
}
for (const [name, chunk] of chunks) write(`lex/${name}.json`, chunk);

writeFileSync(
  join(OUT, 'index.json'),
  JSON.stringify({
    title: 'Word study',
    sources: [
      'Berean Standard Bible word tables (public domain)',
      'STEP Bible Translators Brief lexicons, www.STEPBible.org (CC BY 4.0)',
    ],
    words: usage.size,
  }),
);
console.log(
  `Linked ${linked} words (${missed} not found in the text), ${usage.size} lexicon entries, ` +
    `${(bytes / 1e6).toFixed(1)} MB`,
);
