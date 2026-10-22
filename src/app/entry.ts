const KEY = 'lampstand.entrySeen';

/** Remember a browser visitor's choice without affecting a separately installed iOS app. */
export function hasPassedInstallLanding(): boolean {
  try {
    return localStorage.getItem(KEY) !== null;
  } catch {
    return false;
  }
}

export function markInstallLandingPassed(): void {
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    // The current visit can continue even when storage is unavailable.
  }
}
