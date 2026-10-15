// Reference parsing (PRD §6 References). Wraps bible-passage-reference-parser (English).
import { bcv_parser } from 'bible-passage-reference-parser/esm/bcv_parser.js';
import * as en from 'bible-passage-reference-parser/esm/lang/en.js';
import { BOOK_BY_CODE, BOOK_BY_OSIS, BOOK_INDEX, BOOKS, type Book } from './books';

export interface VersePoint {
  book: string; // canonical code, e.g. JHN
  chapter: number;
  verse: number;
}

export interface RefRange {
  start: VersePoint;
  end: VersePoint;
}

export type RefProblem = 'empty' | 'unrecognized' | 'chapter' | 'verse' | 'order' | 'multiple';

export type RefParseResult =
  | { ok: true; range: RefRange; translation?: string }
  | { ok: false; problem: RefProblem; hint: string };

/** Verse counts per chapter, by canonical book code. KJV versification from the parser. */
export type VerseCounts = (code: string) => readonly number[] | undefined;

let parser: bcv_parser | null = null;
let kjvCounts: Map<string, number[]> | null = null;

function getParser(): bcv_parser {
  if (!parser) {
    parser = new bcv_parser(en);
    parser.set_options({
      osis_compaction_strategy: 'bcv',
      invalid_passage_strategy: 'include',
      invalid_sequence_strategy: 'include',
      passage_existence_strategy: 'b',
      book_alone_strategy: 'ignore',
      sequence_combination_strategy: 'separate',
    });
  }
  return parser;
}

/** Built-in versification (KJV), used when no translation data is supplied. */
export const defaultVerseCounts: VerseCounts = (code) => {
  if (!kjvCounts) {
    const info = getParser().translation_info('kjv');
    kjvCounts = new Map();
    for (const b of BOOKS) {
      const counts = info.chapters[b.osis];
      if (counts) kjvCounts.set(b.code, counts);
    }
  }
  return kjvCounts.get(code);
};

/** Codes recognized as a trailing translation in the command bar (PRD §6 grammar). */
export const TRANSLATION_ALIASES: Record<string, string> = { DARBY: 'DBY' };

export function splitTranslation(
  input: string,
  knownCodes: readonly string[],
): { text: string; translation?: string } {
  const m = /^(.*?)[\s,]+([A-Za-z][A-Za-z0-9]{1,7})\s*$/.exec(input.trim());
  if (!m) return { text: input.trim() };
  const raw = m[2]!.toUpperCase();
  const code = TRANSLATION_ALIASES[raw] ?? raw;
  if (knownCodes.includes(code)) return { text: m[1]!.trim(), translation: code };
  return { text: input.trim() };
}

function bookFromOsis(osis: string): Book | undefined {
  return BOOK_BY_OSIS.get(osis);
}

interface RawEntity {
  type?: string;
  start: { b: string; c?: number; v?: number };
  end: { b: string; c?: number; v?: number };
}

function collectEntities(input: string): RawEntity[] {
  const entities = getParser().parse(input).parsed_entities() as { entities: RawEntity[] }[];
  return entities.flatMap((e) => e.entities);
}

export function comparePoints(a: VersePoint, b: VersePoint): number {
  return (
    (BOOK_INDEX.get(a.book) ?? 0) - (BOOK_INDEX.get(b.book) ?? 0) ||
    a.chapter - b.chapter ||
    a.verse - b.verse
  );
}

function checkPoint(p: VersePoint, counts: VerseCounts, isEnd: boolean): RefParseResult | null {
  const book = BOOK_BY_CODE.get(p.book)!;
  const chapters = counts(p.book);
  if (!chapters)
    return { ok: false, problem: 'unrecognized', hint: `${book.name} isn't available.` };
  if (p.chapter < 1 || p.chapter > chapters.length) {
    return {
      ok: false,
      problem: 'chapter',
      hint:
        chapters.length === 1
          ? `${book.name} has 1 chapter.`
          : `${book.name} has ${chapters.length} chapters.`,
    };
  }
  const verses = chapters[p.chapter - 1]!;
  if (p.verse < 1 || p.verse > verses) {
    if (isEnd && p.verse > verses) return null; // clamp handled by caller
    return {
      ok: false,
      problem: 'verse',
      hint: `${book.refName} ${p.chapter} has ${verses} verses.`,
    };
  }
  return null;
}

/**
 * Parse a human reference ("jn 3 16", "1 cor 13 4-7", "ps 23 asv") into one canonical range.
 * Returns a plain-language hint when it can't.
 */
export function parseRefDetailed(
  input: string,
  options: { knownTranslations?: readonly string[]; verseCounts?: VerseCounts } = {},
): RefParseResult {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, problem: 'empty', hint: 'Type a reference like jn 3 16.' };
  const { text, translation } = splitTranslation(trimmed, options.knownTranslations ?? []);
  const counts = options.verseCounts ?? defaultVerseCounts;

  const entities = collectEntities(text);
  if (entities.length === 0) {
    return {
      ok: false,
      problem: 'unrecognized',
      hint: `"${trimmed}" isn't a recognized reference.`,
    };
  }
  if (entities.length > 1) {
    return {
      ok: false,
      problem: 'multiple',
      hint: 'Use one passage at a time, e.g. "John 3:16-18".',
    };
  }
  const e = entities[0]!;
  const sBook = bookFromOsis(e.start.b);
  const eBook = bookFromOsis(e.end.b);
  if (!sBook || !eBook) {
    return { ok: false, problem: 'unrecognized', hint: `"${trimmed}" isn't in the 66-book canon.` };
  }

  const start: VersePoint = { book: sBook.code, chapter: e.start.c ?? 1, verse: e.start.v ?? 1 };
  const endChapter = e.end.c ?? start.chapter;
  let endVerse = e.end.v;

  const startProblem = checkPoint(start, counts, false);
  if (startProblem) return startProblem;

  const endChapters = counts(eBook.code);
  if (!endChapters || endChapter < 1 || endChapter > endChapters.length) {
    return {
      ok: false,
      problem: 'chapter',
      hint: `${eBook.name} has ${endChapters?.length ?? 0} chapters.`,
    };
  }
  const endChapterVerses = endChapters[endChapter - 1]!;
  // A whole chapter ("ps 23") or an end past the last verse resolves to the chapter's end.
  if (endVerse === undefined || endVerse > endChapterVerses) endVerse = endChapterVerses;
  if (e.start.v === undefined && e.end.v === undefined) {
    start.verse = 1;
  }
  const end: VersePoint = { book: eBook.code, chapter: endChapter, verse: endVerse };
  if (comparePoints(end, start) < 0) {
    return { ok: false, problem: 'order', hint: 'The end of the range comes before the start.' };
  }
  return { ok: true, range: { start, end }, translation };
}

/** PRD §6: `parseRef(input): RefRange | null`. */
export function parseRef(input: string): RefRange | null {
  const r = parseRefDetailed(input);
  return r.ok ? r.range : null;
}

const pointId = (p: VersePoint) => `${p.book}.${p.chapter}.${p.verse}`;

/** Canonical id, e.g. "JHN.3.16" or "JHN.3.16-JHN.3.18". */
export function toOsis(range: RefRange): string {
  const s = pointId(range.start);
  const e = pointId(range.end);
  return s === e ? s : `${s}-${e}`;
}

export function fromOsis(id: string): RefRange | null {
  const parts = id.split('-');
  const parse = (s: string): VersePoint | null => {
    const m = /^([1-3A-Z]{3})\.(\d+)\.(\d+)$/.exec(s);
    if (!m || !BOOK_BY_CODE.has(m[1]!)) return null;
    return { book: m[1]!, chapter: Number(m[2]), verse: Number(m[3]) };
  };
  const start = parse(parts[0] ?? '');
  const end = parts[1] ? parse(parts[1]) : start;
  if (!start || !end || parts.length > 2) return null;
  return { start, end };
}

/** Human form for display: "John 3:16", "John 3:16–18", "Psalm 23", "John 3:16–4:2". */
export function formatRef(range: RefRange, counts: VerseCounts = defaultVerseCounts): string {
  const { start, end } = range;
  const sb = BOOK_BY_CODE.get(start.book)!;
  const eb = BOOK_BY_CODE.get(end.book)!;
  const single = (counts(sb.code)?.length ?? 0) === 1;
  const sameChapter = start.book === end.book && start.chapter === end.chapter;
  const chapterLen = counts(start.book)?.[start.chapter - 1];
  const name = start.book === end.book && !sameChapter ? sb.name : sb.refName;

  if (sameChapter && start.verse === 1 && end.verse === chapterLen && !single) {
    return `${sb.refName} ${start.chapter}`;
  }
  const s = single ? `${name} ${start.verse}` : `${name} ${start.chapter}:${start.verse}`;
  if (pointId(start) === pointId(end)) return s;
  if (sameChapter) return `${s}–${end.verse}`;
  if (start.book === end.book) return `${s}–${end.chapter}:${end.verse}`;
  return `${s} – ${eb.refName} ${end.chapter}:${end.verse}`;
}

/** Every verse id in a range, in order, using the given versification. */
export function versesInRange(range: RefRange, counts: VerseCounts = defaultVerseCounts): string[] {
  const out: string[] = [];
  const startIdx = BOOK_INDEX.get(range.start.book)!;
  const endIdx = BOOK_INDEX.get(range.end.book)!;
  for (let bi = startIdx; bi <= endIdx; bi++) {
    const book = BOOKS[bi]!;
    const chapters = counts(book.code) ?? [];
    const c0 = bi === startIdx ? range.start.chapter : 1;
    const c1 = bi === endIdx ? range.end.chapter : chapters.length;
    for (let c = c0; c <= c1; c++) {
      const v0 = bi === startIdx && c === range.start.chapter ? range.start.verse : 1;
      const v1 =
        bi === endIdx && c === range.end.chapter ? range.end.verse : (chapters[c - 1] ?? 0);
      for (let v = v0; v <= v1; v++) out.push(`${book.code}.${c}.${v}`);
    }
  }
  return out;
}

export function verseCountInRange(
  range: RefRange,
  counts: VerseCounts = defaultVerseCounts,
): number {
  return versesInRange(range, counts).length;
}
