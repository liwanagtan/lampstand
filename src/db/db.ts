import Dexie, { type EntityTable } from 'dexie';
import type {
  AssetRecord,
  HistoryRecord,
  JournalEntryRecord,
  JournalRecord,
  MarkRecord,
  PlanDefRecord,
  PlanProgressRecord,
  PresentationRecord,
  SettingRecord,
  TranslationRecord,
  VerseRecord,
} from './types';

export const DB_NAME = 'lampstand';

export class LampstandDB extends Dexie {
  presentations!: EntityTable<PresentationRecord, 'id'>;
  assets!: EntityTable<AssetRecord, 'id'>;
  translations!: EntityTable<TranslationRecord, 'code'>;
  verses!: Dexie.Table<VerseRecord, [string, string]>;
  settings!: EntityTable<SettingRecord, 'key'>;
  history!: EntityTable<HistoryRecord, 'id'>;
  marks!: EntityTable<MarkRecord, 'id'>;
  plans!: EntityTable<PlanProgressRecord, 'planId'>;
  journal!: EntityTable<JournalRecord, 'date'>;
  planDefs!: EntityTable<PlanDefRecord, 'id'>;
  entries!: EntityTable<JournalEntryRecord, 'id'>;

  constructor(name = DB_NAME) {
    super(name);
    // Add new versions below; never edit a shipped version (PRD §10 reliability).
    this.version(1).stores({
      presentations: 'id, title, speaker, createdAt, updatedAt, lastPresentedAt',
      assets: 'id, createdAt',
      translations: 'code',
      verses: '[code+osis], code',
      settings: 'key',
      history: '++id, shownAt',
    });
    // Bible app: personal marks, reading plan progress and the devotion journal.
    this.version(2).stores({
      marks: 'id, kind, [book+chapter], updatedAt',
      plans: 'planId',
      journal: 'date, updatedAt',
    });
    // Imported reading plans (e.g. Sunday-school lesson plans).
    this.version(3).stores({ planDefs: 'id, importedAt' });
    // Journal entries: several per day, each with its own verse. Old per-day entries move over.
    this.version(4)
      .stores({ entries: 'id, date, kind, updatedAt' })
      .upgrade(async (tx) => {
        const old = (await tx.table('journal').toArray()) as JournalRecord[];
        await tx.table('entries').bulkPut(old.map(journalToEntry));
      });
  }
}

/** A version-2 per-day journal row as a version-4 entry. */
export function journalToEntry(j: JournalRecord): JournalEntryRecord {
  return {
    id: `j-${j.date}`,
    date: j.date,
    kind: 'reflection',
    ref: j.ref,
    body: '',
    answers: j.answers,
    createdAt: j.createdAt,
    updatedAt: j.updatedAt,
  };
}

export const db = new LampstandDB();

/** Ask Chrome not to evict our data (PRD §10 offline). */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return true;
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
