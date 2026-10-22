let currentUserId: string | null = null;

export function selectAccountStorage(userId: string | null): void {
  currentUserId = userId;
}

/** Guest keys retain their existing names so no existing reading position is lost. */
export function accountStorageKey(key: string): string {
  return currentUserId ? `${key}.account.${currentUserId}` : key;
}
