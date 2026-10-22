import { create } from 'zustand';
import { isAuthRetryableFetchError, type User } from '@supabase/supabase-js';
import { accountClient } from './client';
import { reloadApp } from './reload';

type Status = 'loading' | 'guest' | 'signed-in';

interface AccountState {
  status: Status;
  user: User | null;
  /** Signed in from the last known account because the session could not be refreshed offline. */
  offline: boolean;
  error: string | null;
  init: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

// The last signed-in account, so an offline start opens that person's profile, not the guest one.
const LAST_KEY = 'lampstand.account.last';

function rememberUser(user: User): void {
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify(user));
  } catch {
    // Without storage an offline start falls back to the guest profile.
  }
}

function rememberedUser(): User | null {
  try {
    const value = JSON.parse(localStorage.getItem(LAST_KEY) ?? 'null') as User | null;
    return value && typeof value.id === 'string' ? value : null;
  } catch {
    return null;
  }
}

function forgetUser(): void {
  try {
    localStorage.removeItem(LAST_KEY);
  } catch {
    // Nothing was remembered.
  }
}

let subscribed = false;
// The account whose local profile this page opened (null for guest); undefined until opened.
let openedProfile: string | null | undefined;

/** Called once the database and storage for this account are selected. */
export function markProfileOpened(userId: string | null): void {
  openedProfile = userId;
}

export const useAccount = create<AccountState>((set) => ({
  status: 'loading',
  user: null,
  offline: false,
  error: null,
  init: async () => {
    const client = accountClient;
    if (!client) {
      set({ status: 'guest' });
      return;
    }
    if (!subscribed) {
      subscribed = true;
      client.auth.onAuthStateChange((event, session) => {
        const user = session?.user ?? null;
        // A refresh that failed for lack of a connection is not a sign-out.
        if (!user && event !== 'SIGNED_OUT') return;
        const next = user?.id ?? null;
        if (openedProfile !== undefined && next !== openedProfile) {
          // Signed in or out elsewhere: reopen so no records cross between profiles.
          reloadApp();
          return;
        }
        if (user) rememberUser(user);
        set({ user, status: user ? 'signed-in' : 'guest', offline: false });
      });
    }
    const { data, error } = await client.auth.getSession();
    const user = data.session?.user ?? null;
    if (user) {
      rememberUser(user);
      set({ user, status: 'signed-in', offline: false, error: null });
      return;
    }
    const last = rememberedUser();
    if (error && isAuthRetryableFetchError(error) && last) {
      set({ user: last, status: 'signed-in', offline: true, error: null });
      window.addEventListener('online', () => void client.auth.getSession(), { once: true });
      return;
    }
    forgetUser();
    set({ user: null, status: 'guest', offline: false, error: error?.message ?? null });
  },
  signInWithGoogle: async () => {
    if (!accountClient) {
      set({ error: 'Google sign-in is not configured for this preview.' });
      return;
    }
    set({ error: null });
    const { error } = await accountClient.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) set({ error: error.message });
  },
  signOut: async () => {
    if (!accountClient) return;
    const { error } = await accountClient.auth.signOut();
    if (error) set({ error: error.message });
    else {
      forgetUser();
      window.location.assign('/');
    }
  },
}));
