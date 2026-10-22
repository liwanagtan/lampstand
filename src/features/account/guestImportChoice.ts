const choiceKey = (userId: string) => `lampstand.guestImport.${userId}`;

/** Whether this account already brought in, or set aside, this device's guest data. */
export function guestImportDecided(userId: string): boolean {
  try {
    return localStorage.getItem(choiceKey(userId)) !== null;
  } catch {
    return true; // Without storage, never ask on every visit; Settings still offers it.
  }
}

export function decideGuestImport(userId: string, choice: 'imported' | 'later'): void {
  try {
    localStorage.setItem(choiceKey(userId), choice);
  } catch {
    // Asked again next time.
  }
}
