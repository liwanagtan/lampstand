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

// Set when a guest chose "Continue with Google" to keep what they have: that is the choice to
// bring it in, so the account imports it without asking again.
const AFTER_SIGN_IN_KEY = 'lampstand.guestImport.afterSignIn';

export function requestImportAfterSignIn(): void {
  try {
    localStorage.setItem(AFTER_SIGN_IN_KEY, '1');
  } catch {
    // The account asks instead.
  }
}

/** Reads and clears the request. */
export function takeImportAfterSignIn(): boolean {
  try {
    const asked = localStorage.getItem(AFTER_SIGN_IN_KEY) !== null;
    localStorage.removeItem(AFTER_SIGN_IN_KEY);
    return asked;
  } catch {
    return false;
  }
}
