// Tyndale Open Study Notes as "About this passage" in the reader and plan days
// (docs/DECISIONS.md 2026-10-19). Source: tyndale_open-studynotes.zip (CC BY-SA 4.0,
// © 2022 Tyndale House Publishers), cached in scripts/.cache/tyndale. Run: npx tsx scripts/build-notes.ts
//
// Changes we make (the licence asks us to say so): notes, book introductions and summaries are
// split into one file per book, their markup is reduced to paragraphs, emphasis and links, and
// cross-references link into Lampstand's reader. The wording is unchanged.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BOOKS } from '../src/features/bible/books';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIR = join(ROOT, 'scripts/.cache/tyndale/x/Tyndale Open Study Notes');
const OUT = join(ROOT, 'public/notes');

/** Tyndale's book abbreviations, in canonical order, as used in note names. */
const TYNDALE = 'Gen Exod Lev Num Deut Josh Judg Ruth ISam IISam IKgs IIKgs IChr IIChr Ezra Neh Esth Job Ps Pr Eccl Song Isa Jer Lam Ezek Dan Hos Joel Amos Obad Jon Mic Nah Hab Zeph Hagg Zech Mal Matt Mark Luke John Acts Rom ICor IICor Gal Eph Phil Col IThes IIThes ITim IITim Titus Phlm Heb Jas IPet IIPet IJn IIJn IIIJn Jude Rev'.split(
  ' ',
);
const CODE = new Map(TYNDALE.map((t, i) => [t, BOOKS[i]!.code]));
/** Links write numbered books with digits (1Sam); names use roman numerals (ISam). */
const bookCode = (abbr: string) =>
  CODE.get(abbr) ?? CODE.get(abbr.replace(/^3/, 'III').replace(/^2/, 'II').replace(/^1/, 'I'));

/** "Gen.1.3-2.4" → start and end [chapter, verse]; a bare chapter covers the whole chapter. */
function range(raw: string): { book: string; s: [number, number]; e: [number, number] } | null {
  // Part of a verse ("2 Peter 2:10a") counts as the whole verse.
  const ref = raw.replace(/(\d)[a-z](?=$|[-.])/g, '$1');
  const [a, b] = ref.split('-');
  // Psalm headings ("Ps.7.title") belong to verse 1, where the reader shows them.
  const m = /^([1-3I]*[A-Za-z]+)\.(\d+)(?:\.(\d+|title))?$/.exec((a ?? '').replace(/\.title$/, '.1'));
  const book = m && bookCode(m[1]!);
  if (!m || !book) return null;
  const c = Number(m[2]);
  const v = m[3] ? Number(m[3]) : 1;
  let e: [number, number] = [c, m[3] ? v : 999];
  if (b) {
    const parts = b.replace(/title/, '1').split('.').map(Number);
    e = parts.length === 2 ? [parts[0]!, parts[1]!] : m[3] ? [c, parts[0]!] : [parts[0]!, 999];
  }
  return { book, s: [c, v], e };
}

/** Markup reduced to <p>, <strong>, <em>, <span class="sc"> and reader links. */
function clean(html: string): string {
  return html
    .replace(/<a href="\?bref=([^"]+)">([\s\S]*?)<\/a>/g, (_, ref: string, text: string) => {
      const r = range(ref.split('_')[0]!);
      return r ? `<a href="#" data-ref="${r.book}.${r.s[0]}.${r.s[1]}">${text}</a>` : text;
    })
    .replace(/<span class="(sn-excerpt[^"]*|sn-ref[^"]*|bold[^"]*|ital-bold)">([\s\S]*?)<\/span>/g, '<strong>$2</strong>')
    .replace(/<span class="(ital|hebrew|greek|latin|aramaic|divine-name-ital)">([\s\S]*?)<\/span>/g, '<em>$2</em>')
    .replace(/<span class="(divine-name|sc|sn-ref-sc|era|bold-era|intro-h2-era)">([\s\S]*?)<\/span>/g, '<span class="sc">$2</span>')
    .replace(/<span class="(sup)">([\s\S]*?)<\/span>/g, '<sup>$2</sup>')
    .replace(/<span class="(sub)">([\s\S]*?)<\/span>/g, '<sub>$2</sub>')
    .replace(/<span(?! class="sc")[^>]*>([\s\S]*?)<\/span>/g, '$1')
    .replace(/<p class="(intro-h1|intro-sidebar-h1|intro-title)">([\s\S]*?)<\/p>/g, '<h3>$2</h3>')
    .replace(/<p class="intro-h2">([\s\S]*?)<\/p>/g, '<h4>$1</h4>')
    .replace(/<p[^>]*>/g, '<p>')
    .replace(/\s+/g, ' ')
    .trim();
}

interface Item {
  name: string;
  refs: string;
  body: string;
}
const items = (file: string): Item[] =>
  [...readFileSync(join(DIR, file), 'utf8').matchAll(/<item name="([^"]+)"[^>]*>([\s\S]*?)<\/item>/g)].map(
    (m) => ({
      name: m[1]!,
      refs: /<refs>([^<]+)<\/refs>/.exec(m[2]!)?.[1] ?? '',
      body: /<body>([\s\S]*?)<\/body>/.exec(m[2]!)?.[1] ?? '',
    }),
  );

interface BookNotes {
  book: string;
  summary: string | null;
  intro: string | null;
  notes: { s: [number, number]; e: [number, number]; html: string }[];
}
const books = new Map<string, BookNotes>(
  BOOKS.map((b) => [b.code, { book: b.code, summary: null, intro: null, notes: [] }]),
);

for (const it of items('StudyNotes.xml')) {
  const r = range(it.name);
  if (!r) throw new Error(`unreadable note ${it.name}`);
  books.get(r.book)!.notes.push({ s: r.s, e: r.e, html: clean(it.body) });
}
for (const it of items('BookIntros.xml')) {
  const r = range(it.refs);
  if (r) books.get(r.book)!.intro = clean(it.body);
}
for (const it of items('BookIntroSummaries.xml')) {
  const r = range(it.refs);
  if (r) books.get(r.book)!.summary = clean(it.body);
}

mkdirSync(OUT, { recursive: true });
let total = 0;
let bytes = 0;
for (const b of books.values()) {
  const json = JSON.stringify(b);
  writeFileSync(join(OUT, `${b.book}.json`), json);
  total += b.notes.length;
  bytes += json.length;
}
writeFileSync(
  join(OUT, 'index.json'),
  JSON.stringify({
    title: 'Tyndale Open Study Notes',
    license: 'CC BY-SA 4.0',
    credit:
      'Adapted from Tyndale Open Study Notes. The original work by Tyndale House Publishers is available for free at http://www.tyndaleopenresources.com.',
    books: [...books.values()].map((b) => ({ book: b.book, notes: b.notes.length })),
  }),
);
console.log(`Wrote ${total} notes for ${books.size} books (${(bytes / 1e6).toFixed(1)} MB)`);
