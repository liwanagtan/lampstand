// Devotion journal (Bible app): one entry per local day, answering a few simple prompts.
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { JournalRecord } from '@/db/types';

export const JOURNAL_MAX = 4000;

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
  {
    id: 'respond',
    label: 'How will you respond today?',
    placeholder: 'One small, concrete step.',
  },
  {
    id: 'prayer',
    label: 'A prayer',
    placeholder: 'Talk to God about it in your own words.',
  },
  {
    id: 'thanks',
    label: 'Something you’re thankful for',
    placeholder: 'Big or small.',
  },
];

export const hasContent = (e: JournalRecord | undefined) =>
  Boolean(e && Object.values(e.answers).some((a) => a.trim()));

/** Saves one day's answers. An entry with nothing written is removed. */
export async function saveEntry(
  date: string,
  answers: Record<string, string>,
  ref?: string,
): Promise<void> {
  const clean = Object.fromEntries(
    Object.entries(answers).map(([k, v]) => [k, v.slice(0, JOURNAL_MAX)]),
  );
  const prev = await db.journal.get(date);
  if (!Object.values(clean).some((v) => v.trim())) {
    if (prev) await db.journal.delete(date);
    return;
  }
  const now = Date.now();
  await db.journal.put({
    date,
    ref: prev?.ref ?? ref,
    answers: clean,
    createdAt: prev?.createdAt ?? now,
    updatedAt: now,
  });
}

export function useJournalEntry(date: string): JournalRecord | null | undefined {
  return useLiveQuery(async () => (await db.journal.get(date)) ?? null, [date]);
}

export function useJournalDates(): JournalRecord[] | undefined {
  return useLiveQuery(() => db.journal.orderBy('date').reverse().toArray(), []);
}
