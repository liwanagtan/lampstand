// When sync runs and how it went, for Settings › Account. Sync runs at start, a few seconds after
// a local change, when the app comes back into view or online, and every few minutes while open.
import { create } from 'zustand';
import { isAuthRetryableFetchError } from '@supabase/supabase-js';
import { db } from '@/db/db';
import { useSettings } from '@/features/settings/settingsStore';
import { useReader } from '@/features/bible-app/readerStore';
import { accountClient } from './client';
import { supabaseRemote } from './supabaseRemote';
import { isApplyingRemote, syncOnce, type SyncRemote, type SyncResult } from './sync';

type Status = 'off' | 'idle' | 'syncing' | 'offline' | 'error';

interface SyncState {
  status: Status;
  lastSyncedAt: number | null;
  error: string | null;
  syncNow: () => Promise<SyncResult | null>;
}

const AFTER_CHANGE_MS = 4000;
const EVERY_MS = 3 * 60 * 1000;

let remote: SyncRemote | null = null;
let lastKey = '';
let timer: ReturnType<typeof setTimeout> | undefined;
let running: Promise<SyncResult | null> | null = null;
let again = false;

function readLast(): number | null {
  try {
    const v = Number(localStorage.getItem(lastKey));
    return v > 0 ? v : null;
  } catch {
    return null;
  }
}

function describe(err: unknown): { status: Status; error: string | null } {
  if (
    (typeof navigator !== 'undefined' && navigator.onLine === false) ||
    isAuthRetryableFetchError(err) ||
    // supabase-js reports a failed request as an error whose message names the fetch failure.
    /fetch|network|load failed/i.test(String((err as { message?: unknown } | null)?.message ?? ''))
  )
    return { status: 'offline', error: null };
  const code = (err as { code?: string } | null)?.code;
  if (code === '42P01' || code === 'PGRST205')
    return { status: 'error', error: 'Sync is not set up on the server yet.' };
  if (code === 'PGRST301' || code === '401' || code === '42501')
    return { status: 'error', error: 'Please sign in again to sync.' };
  return { status: 'error', error: 'Sync did not finish. Your records are safe on this device.' };
}

export const useSync = create<SyncState>((set) => ({
  status: 'off',
  lastSyncedAt: null,
  error: null,
  syncNow: async () => {
    if (!remote) return null;
    if (running) {
      again = true;
      return running;
    }
    const target = remote;
    set({ status: 'syncing' });
    running = (async () => {
      try {
        const result = await syncOnce(target);
        const at = Date.now();
        try {
          localStorage.setItem(lastKey, String(at));
        } catch {
          // Shown for this visit only.
        }
        set({ status: 'idle', lastSyncedAt: at, error: null });
        if (result.settingsChanged) await useSettings.getState().load();
        if (result.readingChanged) useReader.getState().reloadFromStorage();
        return result;
      } catch (err) {
        set(describe(err));
        return null;
      } finally {
        running = null;
        if (again) {
          again = false;
          schedule(0);
        }
      }
    })();
    return running;
  },
}));

function schedule(delay = AFTER_CHANGE_MS) {
  if (!remote) return;
  clearTimeout(timer);
  timer = setTimeout(() => void useSync.getState().syncNow(), delay);
}

function onLocalChange(this: unknown, ...args: unknown[]) {
  if (isApplyingRemote()) return;
  const tx = args[args.length - 1] as { on?: (e: 'complete', fn: () => void) => void } | undefined;
  if (tx?.on) tx.on('complete', () => schedule());
  else schedule();
}

/** Starts syncing the signed-in account's profile; call once its database is open. */
export function startSync(userId: string, custom?: SyncRemote): void {
  const r = custom ?? (accountClient ? supabaseRemote(accountClient, userId) : null);
  if (!r || remote) return;
  remote = r;
  lastKey = `lampstand.lastSynced.${userId}`;
  useSync.setState({ status: 'idle', lastSyncedAt: readLast() });
  for (const table of [db.plans, db.entries, db.marks, db.settings]) {
    table.hook('creating', onLocalChange);
    table.hook('updating', onLocalChange);
    table.hook('deleting', onLocalChange);
  }
  window.addEventListener('online', () => schedule(0));
  document.addEventListener('visibilitychange', () => schedule(0));
  setInterval(() => document.visibilityState === 'visible' && schedule(0), EVERY_MS);
}

/** Stops sync before the account's local copy is removed (account deletion). */
export function stopSync(): void {
  remote = null;
  clearTimeout(timer);
  useSync.setState({ status: 'off' });
}
