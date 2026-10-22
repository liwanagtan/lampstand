import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import { accountClient } from './client';

type Status = 'loading' | 'guest' | 'signed-in';

interface AccountState {
  status: Status;
  user: User | null;
  error: string | null;
  init: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

let subscribed = false;

export const useAccount = create<AccountState>((set) => ({
  status: 'loading',
  user: null,
  error: null,
  init: async () => {
    if (!accountClient) {
      set({ status: 'guest' });
      return;
    }
    if (!subscribed) {
      subscribed = true;
      accountClient.auth.onAuthStateChange((_event, session) => {
        set({ user: session?.user ?? null, status: session?.user ? 'signed-in' : 'guest' });
      });
    }
    const { data, error } = await accountClient.auth.getSession();
    set({
      user: data.session?.user ?? null,
      status: data.session?.user ? 'signed-in' : 'guest',
      error: error?.message ?? null,
    });
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
    else window.location.assign('/');
  },
}));
