// Anonymous usage counts (docs/ACCOUNT-SYNC-ROLLOUT.md, Phase 5; supabase/usage-insights.sql).
// An event is only its name, a random device code and the local date: never a name, email,
// text, search, verse, plan, page address or account id. Settings › Privacy turns it off.
import { accountClient } from '@/features/account/client';
import { useSettings } from '@/features/settings/settingsStore';
import { localDate } from '@/features/bible-app/dailyVerses';

export type InsightEvent =
  | 'welcome_started'
  | 'google_chosen'
  | 'guest_chosen'
  | 'welcome_completed'
  | 'guest_import_started'
  | 'guest_import_completed'
  | 'guest_import_failed'
  | 'plan_started'
  | 'plan_day_completed'
  | 'reading_resumed'
  | 'chapter_read'
  | 'sync_failed'
  | 'sync_recovered'
  | 'account_deleted';

/** Counted once a day per device; the rest are counted each time. */
const ONCE_A_DAY: ReadonlySet<InsightEvent> = new Set(['reading_resumed', 'chapter_read']);

interface Queued {
  name: InsightEvent;
  device: string;
  occurred_on: string;
}

const DEVICE_KEY = 'lampstand.insights.device';
const QUEUE_KEY = 'lampstand.insights.queue';
const SENT_TODAY_KEY = 'lampstand.insights.today';
const MAX_QUEUED = 100;

function deviceCode(): string {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

function readQueue(): Queued[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]');
    return Array.isArray(v) ? (v as Queued[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(q: Queued[]): void {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-MAX_QUEUED)));
}

/** Older than the server accepts (two days back), so not worth sending. */
const stale = (q: Queued, today: string) => {
  const d = new Date(`${today}T12:00:00`);
  d.setDate(d.getDate() - 2);
  return q.occurred_on < localDate(d);
};

/** Tests and automated browsers are never counted. */
const counting = () =>
  import.meta.env.MODE !== 'test' && !(typeof navigator !== 'undefined' && navigator.webdriver);

let sending = false;
let timer: ReturnType<typeof setTimeout> | undefined;

/** Sends what is queued; on failure the events wait for the next try. */
export async function flushInsights(): Promise<void> {
  if (!accountClient || !counting() || sending || !useSettings.getState().insights) return;
  const today = localDate();
  const queue = readQueue().filter((q) => !stale(q, today));
  writeQueue(queue);
  if (!queue.length) return;
  sending = true;
  try {
    const { error } = await accountClient.from('usage_events').insert(queue);
    if (!error) {
      // Keep anything queued while this request was in flight.
      writeQueue(readQueue().slice(queue.length));
    }
  } catch {
    // Offline: try again later.
  } finally {
    sending = false;
  }
}

export function track(name: InsightEvent): void {
  if (!counting() || !useSettings.getState().insights) return;
  try {
    const today = localDate();
    if (ONCE_A_DAY.has(name)) {
      const sent = JSON.parse(localStorage.getItem(SENT_TODAY_KEY) ?? '{}') as Record<
        string,
        string
      >;
      if (sent[name] === today) return;
      localStorage.setItem(SENT_TODAY_KEY, JSON.stringify({ ...sent, [name]: today }));
    }
    writeQueue([...readQueue(), { name, device: deviceCode(), occurred_on: today }]);
  } catch {
    return; // No storage, no counting.
  }
  clearTimeout(timer);
  timer = setTimeout(() => void flushInsights(), 3000);
}

/** Turning insights off also drops anything not yet sent. */
export function clearPendingInsights(): void {
  try {
    localStorage.removeItem(QUEUE_KEY);
  } catch {
    // Nothing was stored.
  }
}

/** Sends leftovers at start and whenever the connection returns. */
export function startInsights(): void {
  window.addEventListener('online', () => void flushInsights());
  setTimeout(() => void flushInsights(), 5000);
}
