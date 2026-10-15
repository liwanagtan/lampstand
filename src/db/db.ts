import Dexie, { type EntityTable } from 'dexie';
import type {
  AssetRecord,
  HistoryRecord,
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
  }
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
