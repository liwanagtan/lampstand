import type { SupabaseClient } from '@supabase/supabase-js';
import type { RemoteRow, RowUpdate, SyncRemote } from './sync';

const PAGE = 500;

/** The user_records table (supabase/account-sync.sql); RLS limits every call to the signed-in owner. */
export function supabaseRemote(client: SupabaseClient, userId: string): SyncRemote {
  return {
    async pull(since) {
      const rows: RemoteRow[] = [];
      for (let from = 0; ; from += PAGE) {
        let query = client
          .from('user_records')
          .select('kind, record_id, data, deleted, updated_at')
          .order('updated_at', { ascending: true })
          .order('kind')
          .order('record_id')
          .range(from, from + PAGE - 1);
        if (since) query = query.gt('updated_at', since);
        const { data, error } = await query;
        if (error) throw error;
        rows.push(...(data as RemoteRow[]));
        if (data.length < PAGE) return rows;
      }
    },
    async push(updates: RowUpdate[]) {
      for (let i = 0; i < updates.length; i += PAGE) {
        const { error } = await client.from('user_records').upsert(
          updates.slice(i, i + PAGE).map((u) => ({ ...u, user_id: userId })),
          { onConflict: 'user_id,kind,record_id' },
        );
        if (error) throw error;
      }
    },
  };
}
