import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/** The publishable browser key is safe only with ownership RLS on every exposed table. */
export const accountClient =
  url && key
    ? createClient(url, key, {
        auth: {
          flowType: 'pkce',
          detectSessionInUrl: true,
          autoRefreshToken: true,
          persistSession: true,
        },
      })
    : null;

/**
 * Google sign-in and account sync are offered only when switched on (VITE_ACCOUNTS=on).
 * Off for now: the app is finished first, then accounts (docs/BACKLOG.md). Anonymous usage
 * counts still use the client above.
 */
export const accountsConfigured = Boolean(accountClient) && import.meta.env.VITE_ACCOUNTS === 'on';
