// Writes a translation file into IndexedDB in one transaction, so a crash never leaves a
// half-installed translation (PRD §10 reliability).
import Dexie from 'dexie';
import type { LampstandDB } from '@/db/db';
import type { TranslationRecord, VerseRecord } from '@/db/types';
import type { TranslationFile } from '@/schema/translation';

const CHUNK = 4000;

/** Deletes by primary-key range, which IndexedDB does in one operation. */
function deleteVerses(db: LampstandDB, code: string) {
  return db.verses
    .where('[code+osis]')
    .between([code, Dexie.minKey], [code, Dexie.maxKey])
    .delete();
}

export function toRecords(file: TranslationFile, bundled: boolean, hash?: string) {
  const verses: VerseRecord[] = [];
  const books = file.books.map((b) => {
    b.chapters.forEach((chapter, ci) =>
      chapter.forEach((text, vi) =>
        verses.push({ code: file.code, osis: `${b.osis}.${ci + 1}.${vi + 1}`, text }),
      ),
    );
    return { osis: b.osis, name: b.name, verseCounts: b.chapters.map((c) => c.length) };
  });
  const record: TranslationRecord = {
    code: file.code,
    name: file.name,
    language: file.language,
    license: file.license,
    source: file.source,
    bundled,
    hash,
    books,
    verseCount: verses.length,
    importedAt: Date.now(),
  };
  return { record, verses };
}

export async function installTranslation(
  db: LampstandDB,
  file: TranslationFile,
  opts: { bundled: boolean; hash?: string; onProgress?: (fraction: number) => void },
): Promise<TranslationRecord> {
  const { record, verses } = toRecords(file, opts.bundled, opts.hash);
  await db.transaction('rw', db.translations, db.verses, async () => {
    await deleteVerses(db, file.code);
    for (let i = 0; i < verses.length; i += CHUNK) {
      await db.verses.bulkPut(verses.slice(i, i + CHUNK));
      opts.onProgress?.(Math.min(1, (i + CHUNK) / verses.length));
    }
    await db.translations.put(record);
  });
  return record;
}

export async function removeTranslation(db: LampstandDB, code: string): Promise<void> {
  await db.transaction('rw', db.translations, db.verses, async () => {
    await deleteVerses(db, code);
    await db.translations.delete(code);
  });
}
