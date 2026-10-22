// Devotion journal (Bible app): reflections on the verse of the day and free journal entries.
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { JournalEntryRecord } from '@/db/types';

export const JOURNAL_MAX = 4000;
export const TITLE_MAX = 100;

export const PROMPTS: { id: string; label: string; placeholder: string }[] = [
  {
    id: 'notice',
    label: 'What stands out to you?',
    placeholder: 'A word, a phrase, a picture — whatever caught your attention.',
  },
  {
    id: 'god',
    label: 'What does this show you about God?',
    placeholder: 'His character, His promises, what He has done…',
  },
  { id: 'respond', label: 'How will you respond today?', placeholder: 'One small, concrete step.' },
  { id: 'prayer', label: 'A prayer', placeholder: 'Talk to God about it in your own words.' },
  { id: 'thanks', label: 'Something you’re thankful for', placeholder: 'Big or small.' },
];

export type EntryDraft = Omit<JournalEntryRecord, 'createdAt' | 'updatedAt'>;

export const entryHasContent = (
  e: Pick<JournalEntryRecord, 'title' | 'body' | 'answers'> | null | undefined,
) =>
  Boolean(
    e &&
    ((e.title ?? '').trim() ||
      e.body.trim() ||
      Object.values(e.answers ?? {}).some((a) => a.trim())),
  );

const entryHasWriting = (e: Pick<JournalEntryRecord, 'body' | 'answers'>) =>
  Boolean(e.body.trim() || Object.values(e.answers ?? {}).some((answer) => answer.trim()));

/** First line of an entry, for lists. */
export function entryPreview(e: JournalEntryRecord): string {
  const parts = [e.body, ...PROMPTS.map((p) => e.answers?.[p.id] ?? '')];
  return parts.map((p) => p.trim()).find(Boolean) ?? '';
}

export function newEntryId(): string {
  return `e-${crypto.randomUUID()}`;
}

/** Saves an entry. An entry with nothing written is removed. */
export async function saveEntry(draft: EntryDraft): Promise<void> {
  const clean: EntryDraft = {
    ...draft,
    title: draft.title?.slice(0, TITLE_MAX) || undefined,
    body: draft.body.slice(0, JOURNAL_MAX),
    answers: draft.answers
      ? Object.fromEntries(
          Object.entries(draft.answers).map(([k, v]) => [k, v.slice(0, JOURNAL_MAX)]),
        )
      : undefined,
  };
  await db.transaction('rw', db.entries, async () => {
    const prev = await db.entries.get(draft.id);
    // A prefilled passage title is context, not a written response.
    if (!(clean.kind === 'reflection' ? entryHasWriting(clean) : entryHasContent(clean))) {
      if (prev) await db.entries.delete(draft.id);
      return;
    }
    const now = Date.now();
    await db.entries.put({ ...clean, createdAt: prev?.createdAt ?? now, updatedAt: now });
  });
}

/** Deletes an entry and returns a function that puts it back (for Undo). */
export async function deleteEntry(id: string): Promise<() => Promise<void>> {
  const prev = await db.entries.get(id);
  await db.entries.delete(id);
  return async () => {
    if (prev) await db.entries.put(prev);
  };
}

/** Every entry, newest day first. */
export function useEntries(): JournalEntryRecord[] | undefined {
  return useLiveQuery(async () => {
    const all = await db.entries.toArray();
    return all.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  }, []);
}

export function useEntry(id: string | null): JournalEntryRecord | null | undefined {
  return useLiveQuery(async () => (id ? ((await db.entries.get(id)) ?? null) : null), [id]);
}

/** A saved response to one plan reading, independent of the reading's completion state. */
export function usePlanReflection(
  planId: string,
  planDay: number,
): JournalEntryRecord | null | undefined {
  return useLiveQuery(async () => {
    if (!planId || !Number.isInteger(planDay) || planDay < 1) return null;
    const entries = await db.entries.where('[planId+planDay]').equals([planId, planDay]).toArray();
    return (
      entries
        .filter((entry) => entry.kind === 'reflection')
        .sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null
    );
  }, [planId, planDay]);
}

/** Most recent reflection for a Bible chapter (outside a plan). */
export function useChapterReflection(
  book: string,
  chapter: number,
): JournalEntryRecord | null | undefined {
  return useLiveQuery(async () => {
    const entries = await db.entries
      .where('[chapterBook+chapterNumber]')
      .equals([book, chapter])
      .toArray();
    return (
      entries
        .filter((entry) => entry.kind === 'reflection')
        .sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null
    );
  }, [book, chapter]);
}

/** Today's reflection on the verse of the day, if one was written. */
export function useReflection(date: string): JournalEntryRecord | null | undefined {
  return useLiveQuery(
    async () =>
      (await db.entries
        .where('date')
        .equals(date)
        .filter((e) => e.kind === 'reflection')
        .first()) ?? null,
    [date],
  );
}
