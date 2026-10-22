// Copies kept when the same journal entry or note differs in two places: `guest:` from guest
// use on this device (guestImport.ts), `device:` from this device during sync (sync.ts).
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { JournalEntryRecord, MarkRecord } from '@/db/types';
import { newEntryId } from '@/features/bible-app/journal';

export type CopySource = 'guest' | 'device';

export function copyId(source: CopySource, id: string): string {
  return `${source}:${id}`;
}

export function copyOf(id: string): { original: string; source: CopySource } | null {
  const m = /^(guest|device):(.+)$/.exec(id);
  return m ? { source: m[1] as CopySource, original: m[2]! } : null;
}

export type Duplicate =
  | { table: 'entries'; source: CopySource; original: JournalEntryRecord; copy: JournalEntryRecord }
  | { table: 'marks'; source: CopySource; original: MarkRecord; copy: MarkRecord };

/** Copies whose original still exists. A copy without one is simply a record of its own. */
export async function findDuplicates(): Promise<Duplicate[]> {
  const found: Duplicate[] = [];
  for (const copy of await db.entries.toArray()) {
    const c = copyOf(copy.id);
    const original = c && (await db.entries.get(c.original));
    if (c && original) found.push({ table: 'entries', source: c.source, original, copy });
  }
  for (const copy of await db.marks.where('kind').equals('note').toArray()) {
    const c = copyOf(copy.id);
    const original = c && (await db.marks.get(c.original));
    if (c && original) found.push({ table: 'marks', source: c.source, original, copy });
  }
  return found;
}

export function useDuplicates(): Duplicate[] | undefined {
  return useLiveQuery(findDuplicates, []);
}

/** Keep the version already in place and drop the copy. */
export async function keepOriginal(d: Duplicate): Promise<void> {
  await db.table(d.table).delete(d.copy.id);
}

/** Keep the copy's version in the original's place. */
export async function keepCopy(d: Duplicate): Promise<void> {
  await db.transaction('rw', db.entries, db.marks, async () => {
    await db.table(d.table).put({ ...d.copy, id: d.original.id, updatedAt: Date.now() });
    await db.table(d.table).delete(d.copy.id);
  });
}

/** Keep both as separate records, so the copy no longer counts as a duplicate. */
export async function keepBoth(d: Duplicate): Promise<void> {
  const id = d.table === 'entries' ? newEntryId() : `n:${crypto.randomUUID()}`;
  await db.transaction('rw', db.entries, db.marks, async () => {
    await db.table(d.table).put({ ...d.copy, id, updatedAt: Date.now() });
    await db.table(d.table).delete(d.copy.id);
  });
}
