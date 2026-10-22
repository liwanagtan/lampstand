import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/** The publishable browser key is safe only with ownership RLS on every exposed table. */
export const accountClient = url && key
  ? createClient(url, key, {
      auth: { flowType: 'pkce', detectSessionInUrl: true, autoRefreshToken: true, persistSession: true },
    })
  : null;

export const accountsConfigured = Boolean(accountClient);
