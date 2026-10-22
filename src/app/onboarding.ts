// First run (docs/PRD-ADDENDUM-GROW.md, Onboarding). Kept in localStorage so the very first
// paint can decide, without waiting for the database.
const KEY = 'lampstand.onboarded';
let accountId: string | null = null;
const key = () => accountId ? `${KEY}.${accountId}` : KEY;

export function selectOnboardingAccount(userId: string | null): void {
  accountId = userId;
}

export function isOnboarded(): boolean {
  try {
    return localStorage.getItem(key()) !== null;
  } catch {
    return true; // Storage blocked: never trap anyone in the welcome flow.
  }
}

export function markOnboarded(): void {
  try {
    localStorage.setItem(key(), String(Date.now()));
  } catch {
    // Nothing to remember it in; the flow simply shows again next time.
  }
}

/** When the person finished onboarding (epoch ms), or null. */
export function onboardedAt(): number | null {
  try {
    const v = Number(localStorage.getItem(key()));
    return Number.isFinite(v) && v > 1 ? v : null;
  } catch {
    return null;
  }
}
