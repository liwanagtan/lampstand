import { useReader } from '@/features/bible-app/readerStore';
import { accountStorageKey } from '@/features/account/storage';

const KEYS = [
  'lampstand.reader',
  'lampstand.recentChapters',
  'lampstand.recentPlanDay.v1',
  'lampstand.biblePosition.v1',
  'lampstand.planScroll.v1',
] as const;

export type LocalReadingBackup = Partial<Record<(typeof KEYS)[number], string>>;

function valid(key: (typeof KEYS)[number], raw: string): boolean {
  if (raw.length > 100_000) return false;
  try {
    const value: unknown = JSON.parse(raw);
    if (key === 'lampstand.recentChapters')
      return (
        Array.isArray(value) &&
        value.length <= 6 &&
        value.every(
          (item) =>
            item &&
            typeof item.book === 'string' &&
            Number.isInteger(item.chapter) &&
            item.chapter > 0,
        )
      );
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const record = value as Record<string, unknown>;
    if (key === 'lampstand.reader')
      return (
        typeof record.book === 'string' &&
        Number.isInteger(record.chapter) &&
        Number(record.chapter) > 0 &&
        typeof record.translation === 'string' &&
        (record.parallel === null || typeof record.parallel === 'string') &&
        typeof record.size === 'number'
      );
    if (key === 'lampstand.recentPlanDay.v1')
      return (
        typeof record.planId === 'string' && Number.isInteger(record.day) && Number(record.day) > 0
      );
    return (
      Object.keys(record).length <= 100 &&
      Object.entries(record).every(
        ([path, top]) =>
          path.length <= 160 && typeof top === 'number' && Number.isFinite(top) && top >= 0,
      )
    );
  } catch {
    return false;
  }
}

export function captureLocalReading(): LocalReadingBackup {
  const result: LocalReadingBackup = {};
  try {
    for (const key of KEYS) {
      const raw = localStorage.getItem(accountStorageKey(key));
      if (raw && valid(key, raw)) result[key] = raw;
    }
  } catch {
    // A disabled local store must not block the IndexedDB backup.
  }
  return result;
}

/** Read legacy guest positions while an account is active, without changing the active reader. */
export function captureGuestReading(): LocalReadingBackup {
  const result: LocalReadingBackup = {};
  try {
    for (const key of KEYS) {
      const raw = localStorage.getItem(key);
      if (raw && valid(key, raw)) result[key] = raw;
    }
  } catch {
    // IndexedDB import can still proceed.
  }
  return result;
}

/** Current positions take precedence; importing a backup fills positions missing on this device. */
export function restoreLocalReading(value: unknown): number {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 0;
  const data = value as Record<string, unknown>;
  let restored = 0;
  try {
    for (const key of KEYS) {
      const raw = data[key];
      if (typeof raw !== 'string' || !valid(key, raw) || localStorage.getItem(accountStorageKey(key)) !== null)
        continue;
      localStorage.setItem(accountStorageKey(key), raw);
      restored++;
    }
    if (restored) useReader.getState().reloadFromStorage();
  } catch {
    // Reading position is optional when the browser refuses local storage.
  }
  return restored;
}
