// Personal study marks (Bible app): highlights, bookmarks and notes, kept in IndexedDB.
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { HighlightColor, MarkRecord } from '@/db/types';
import { fromOsis, toOsis, type RefRange } from '@/features/bible/ref';

export const HIGHLIGHT_COLORS: { color: HighlightColor; label: string }[] = [
  { color: 'yellow', label: 'Yellow' },
  { color: 'green', label: 'Green' },
  { color: 'blue', label: 'Blue' },
  { color: 'pink', label: 'Pink' },
  { color: 'purple', label: 'Purple' },
];
export const NOTE_MAX = 5000;

const verseIds = (range: RefRange) => {
  const out: string[] = [];
  for (let v = range.start.verse; v <= range.end.verse; v++)
    out.push(`${range.start.book}.${range.start.chapter}.${v}`);
  return out;
};

const base = (kind: MarkRecord['kind'], id: string, ref: string, range: RefRange) => {
  const now = Date.now();
  return {
    id,
    kind,
    ref,
    book: range.start.book,
    chapter: range.start.chapter,
    createdAt: now,
    updatedAt: now,
  };
};

/** Highlights every verse of a (single-chapter) range in a colour, or clears it with null. */
export async function setHighlight(range: RefRange, color: HighlightColor | null): Promise<void> {
  const ids = verseIds(range);
  if (!color) {
    await db.marks.bulkDelete(ids.map((v) => `h:${v}`));
    return;
  }
  const existing = await db.marks.bulkGet(ids.map((v) => `h:${v}`));
  await db.marks.bulkPut(
    ids.map((v, i) => {
      const r = fromOsis(v)!;
      const prev = existing[i];
      return {
        ...base('highlight', `h:${v}`, v, r),
        ...(prev ? { createdAt: prev.createdAt } : {}),
        color,
      };
    }),
  );
}

/** Adds a bookmark for the range, or removes it if it is already bookmarked. */
export async function toggleBookmark(range: RefRange): Promise<boolean> {
  const ref = toOsis(range);
  const id = `b:${ref}`;
  if (await db.marks.get(id)) {
    await db.marks.delete(id);
    return false;
  }
  await db.marks.put(base('bookmark', id, ref, range));
  return true;
}

/** Saves a note on a range. An empty note deletes it. Returns the note id (or null). */
export async function saveNote(
  id: string | null,
  range: RefRange,
  text: string,
): Promise<string | null> {
  const clean = text.slice(0, NOTE_MAX);
  if (!clean.trim()) {
    if (id) await db.marks.delete(id);
    return null;
  }
  const prev = id ? await db.marks.get(id) : undefined;
  const ref = toOsis(range);
  const record: MarkRecord = prev
    ? { ...prev, text: clean, updatedAt: Date.now() }
    : { ...base('note', id ?? `n:${crypto.randomUUID()}`, ref, range), text: clean };
  await db.marks.put(record);
  return record.id;
}

/** Deletes marks and returns a function that puts them back (for Undo). */
export async function deleteMarks(ids: string[]): Promise<() => Promise<void>> {
  const removed = (await db.marks.bulkGet(ids)).filter((m): m is MarkRecord => Boolean(m));
  await db.marks.bulkDelete(ids);
  return async () => {
    await db.marks.bulkPut(removed);
  };
}

export interface ChapterMarks {
  highlights: Map<number, HighlightColor>;
  /** Verse number → bookmark ids that start there. */
  bookmarks: Map<number, MarkRecord[]>;
  /** Verse number → notes whose range ends there (shown after that verse). */
  notes: Map<number, MarkRecord[]>;
}

const EMPTY: ChapterMarks = { highlights: new Map(), bookmarks: new Map(), notes: new Map() };

function push<K, V>(m: Map<K, V[]>, k: K, v: V) {
  const list = m.get(k);
  if (list) list.push(v);
  else m.set(k, [v]);
}

/** Live marks for one chapter. */
export function useChapterMarks(book: string, chapter: number): ChapterMarks {
  return (
    useLiveQuery(async () => {
      const rows = await db.marks.where('[book+chapter]').equals([book, chapter]).toArray();
      const out: ChapterMarks = { highlights: new Map(), bookmarks: new Map(), notes: new Map() };
      for (const m of rows) {
        const r = fromOsis(m.ref);
        if (!r) continue;
        if (m.kind === 'highlight' && m.color) out.highlights.set(r.start.verse, m.color);
        else if (m.kind === 'bookmark') push(out.bookmarks, r.start.verse, m);
        else if (m.kind === 'note') push(out.notes, r.end.verse, m);
      }
      return out;
    }, [book, chapter]) ?? EMPTY
  );
}

/** Every mark, newest first, for the Notes page. */
export function useAllMarks(): MarkRecord[] | undefined {
  return useLiveQuery(() => db.marks.orderBy('updatedAt').reverse().toArray(), []);
}
