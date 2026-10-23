import Dexie from 'dexie';
import { DB_NAME, db } from '@/db/db';

let currentUserId: string | null = null;

export function selectAccountStorage(userId: string | null): void {
  currentUserId = userId;
}

/** Guest keys retain their existing names so no existing reading position is lost. */
export function accountStorageKey(key: string): string {
  return currentUserId ? `${key}.account.${currentUserId}` : key;
}

/** Removes one account's downloaded records from this device (never the guest profile). */
export async function removeAccountCopy(userId: string): Promise<void> {
  const name = `${DB_NAME}-account-${userId}`;
  if (db.name === name) db.close();
  await Dexie.delete(name);
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.endsWith(`.account.${userId}`) || key.endsWith(`.${userId}`))
        localStorage.removeItem(key);
    }
  } catch {
    // The records themselves are gone; leftover positions are harmless.
  }
}
