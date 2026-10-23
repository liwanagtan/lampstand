import { readFileSync } from 'node:fs';
import type { Page, Route } from '@playwright/test';

// A stored session stands in for Google sign-in. Requests to Supabase never reach it: auth calls
// are cut (the app treats that like being offline) and the records table can be served by
// fakeRecords(), so the fake token is never checked.
function supabaseHost(): string | null {
  try {
    const env = readFileSync('.env.local', 'utf8');
    // Accounts are switched off until the app is finished (src/features/account/client.ts).
    if (!/^VITE_ACCOUNTS=on\s*$/m.test(env)) return null;
    const url = /^VITE_SUPABASE_URL=(.+)$/m.exec(env)?.[1]?.trim();
    return url ? new URL(url).hostname : null;
  } catch {
    return null;
  }
}
export const host = supabaseHost();

export const USER = { id: '00000000-0000-4000-8000-000000000001', email: 'reader@example.com' };

/** The localStorage entry supabase-js reads its session from. */
export function storedSession(): { name: string; value: string } {
  const now = Math.floor(Date.now() / 1000);
  return {
    name: `sb-${host!.split('.')[0]}-auth-token`,
    value: JSON.stringify({
      access_token: 'test',
      refresh_token: 'test',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: now + 3600,
      user: {
        ...USER,
        aud: 'authenticated',
        app_metadata: {},
        user_metadata: {},
        created_at: '',
      },
    }),
  };
}

/** Signs this page in; the account's records come from `server` (an empty one by default). */
export async function signIn(page: Page, server = fakeRecords()) {
  await page.route(`https://${host}/**`, server.handler);
  await page.evaluate(({ name, value }) => localStorage.setItem(name, value), storedSession());
}

interface Row {
  kind: string;
  record_id: string;
  data: unknown;
  deleted: boolean;
  updated_at: string;
}

/** An in-memory user_records table, shared by every page routed to it (two "devices"). */
export function fakeRecords() {
  const rows = new Map<string, Row>();
  let clock = 0;
  const handler = async (route: Route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (!url.pathname.endsWith('/rest/v1/user_records')) return route.abort();
    if (req.method() === 'GET') {
      const since = url.searchParams.get('updated_at')?.replace(/^gt\./, '');
      const offset = Number(url.searchParams.get('offset') ?? 0);
      const limit = Number(url.searchParams.get('limit') ?? 1000);
      const list = [...rows.values()]
        .filter((r) => !since || r.updated_at > since)
        .sort((a, b) => a.updated_at.localeCompare(b.updated_at))
        .slice(offset, offset + limit);
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(list),
      });
    }
    if (req.method() === 'POST') {
      for (const r of req.postDataJSON() as Row[]) {
        clock += 1;
        const updated_at = new Date(Date.now() + clock).toISOString();
        rows.set(`${r.kind}/${r.record_id}`, { ...r, updated_at });
      }
      return route.fulfill({ status: 201, body: '' });
    }
    return route.fulfill({ status: 204, body: '' });
  };
  return { rows, handler };
}
