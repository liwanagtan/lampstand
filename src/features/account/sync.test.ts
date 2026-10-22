import { db, selectAccountDatabase } from '@/db/db';
import type { JournalEntryRecord, PlanProgressRecord } from '@/db/types';
import { selectAccountStorage } from './storage';
import { fingerprint, stableStringify, syncOnce, type RemoteRow, type SyncRemote } from './sync';

/** The server: rows keyed by kind/id, with change times it assigns itself. */
class FakeServer {
  rows = new Map<string, RemoteRow>();
  private clock = 0;
  failPush = false;
  remote: SyncRemote = {
    pull: async (since) =>
      [...this.rows.values()]
        .filter((r) => !since || r.updated_at > since)
        .sort((a, b) => a.updated_at.localeCompare(b.updated_at))
        .map((r) => structuredClone(r)),
    push: async (rows) => {
      if (this.failPush) throw new TypeError('Failed to fetch');
      for (const r of rows) {
        this.clock += 1;
        const updated_at = new Date(Date.UTC(2026, 9, 23) + this.clock * 60_000).toISOString();
        this.rows.set(`${r.kind}/${r.record_id}`, structuredClone({ ...r, updated_at }));
      }
    },
  };
}

let server: FakeServer;
let run = 0;
const device = (name: 'a' | 'b') => {
  selectAccountDatabase(`sync-${run}-${name}`);
  selectAccountStorage(`sync-${run}-${name}`);
};
const sync = () => syncOnce(server.remote);

const entry = (id: string, body: string, updatedAt = 1): JournalEntryRecord => ({
  id,
  date: '2026-10-23',
  kind: 'journal',
  body,
  createdAt: 1,
  updatedAt,
});
const plan = (done: number[], startedAt = 1, updatedAt = 1): PlanProgressRecord => ({
  planId: 'gospels',
  startedAt,
  done,
  doneAt: Object.fromEntries(done.map((d) => [d, d * 10])),
  updatedAt,
});

beforeEach(() => {
  server = new FakeServer();
  run++;
});
afterEach(() => {
  selectAccountDatabase(null);
  selectAccountStorage(null);
});

it('compares records by content, not key order', () => {
  expect(stableStringify({ b: 1, a: [1, { d: undefined, c: 2 }] })).toBe('{"a":[1,{"c":2}],"b":1}');
  expect(fingerprint({ a: 1, b: 2 })).toBe(fingerprint({ b: 2, a: 1 }));
  expect(fingerprint({ a: 1 })).not.toBe(fingerprint({ a: 2 }));
});

it('brings a returning person’s records and choices to a new device', async () => {
  device('a');
  await db.entries.put(entry('e-1', 'Psalm 23 tonight'));
  await db.plans.put(plan([1, 2]));
  await db.marks.put({
    id: 'h:JHN.3.16',
    kind: 'highlight',
    ref: 'JHN.3.16',
    book: 'JHN',
    chapter: 3,
    color: 'green',
    createdAt: 1,
    updatedAt: 1,
  });
  await db.settings.put({ key: 'profile', value: { name: 'Grace' } });
  await db.settings.put({ key: 'reminders', value: { enabled: true, time: '06:00', lastNotified: null } });
  localStorage.setItem(
    `lampstand.reader.account.sync-${run}-a`,
    JSON.stringify({ book: 'PSA', chapter: 23, translation: 'BSB', parallel: null, size: 18 }),
  );
  expect((await sync()).pushed).toBe(5);
  expect((await sync()).pushed).toBe(0);

  device('b');
  await db.settings.put({ key: 'profile', value: { name: '' } });
  await sync();
  expect((await db.entries.get('e-1'))?.body).toBe('Psalm 23 tonight');
  expect((await db.plans.get('gospels'))?.done).toEqual([1, 2]);
  expect((await db.marks.get('h:JHN.3.16'))?.chapters).toEqual(['JHN.3']);
  expect((await db.settings.get('profile'))?.value).toEqual({ name: 'Grace' });
  // Reminder times belong to each device.
  expect(await db.settings.get('reminders')).toBeUndefined();
  expect(JSON.parse(localStorage.getItem(`lampstand.reader.account.sync-${run}-b`)!)).toMatchObject({
    book: 'PSA',
    chapter: 23,
  });
  expect((await sync()).pushed).toBe(0);
});

it('combines plan days read on two devices while offline', async () => {
  device('a');
  await db.plans.put(plan([1]));
  await sync();
  device('b');
  await sync();

  device('a');
  await db.plans.put(plan([1, 2], 1, 2));
  device('b');
  await db.plans.put(plan([1, 3], 1, 3));

  device('a');
  await sync();
  device('b');
  await sync();
  device('a');
  await sync();
  for (const d of ['a', 'b'] as const) {
    device(d);
    expect((await db.plans.get('gospels'))?.done).toEqual([1, 2, 3]);
  }
});

it('lets a restarted plan replace the older run', async () => {
  device('a');
  await db.plans.put(plan([1, 2, 3]));
  await sync();
  device('b');
  await sync();
  device('a');
  await db.plans.put(plan([4], 1, 5));
  device('b');
  await db.plans.put({ planId: 'gospels', startedAt: 9, done: [], updatedAt: 9 });
  await sync();
  device('a');
  await sync();
  expect(await db.plans.get('gospels')).toMatchObject({ startedAt: 9, done: [] });
});

it('keeps both versions when the same entry is edited on two devices', async () => {
  device('a');
  await db.entries.put(entry('e-1', 'First draft'));
  await sync();
  device('b');
  await sync();

  device('a');
  await db.entries.put(entry('e-1', 'Edited on the phone', 2));
  await sync();
  device('b');
  await db.entries.put(entry('e-1', 'Edited on the laptop', 3));
  const result = await sync();

  expect(result.copies).toBe(1);
  expect((await db.entries.get('e-1'))?.body).toBe('Edited on the phone');
  expect((await db.entries.get('device:e-1'))?.body).toBe('Edited on the laptop');
  device('a');
  await sync();
  expect((await db.entries.get('device:e-1'))?.body).toBe('Edited on the laptop');
});

it('sends deletions to other devices without bringing them back', async () => {
  device('a');
  await db.entries.bulkPut([entry('e-1', 'Keep'), entry('e-2', 'Remove')]);
  await sync();
  device('b');
  await sync();
  device('a');
  await db.entries.delete('e-2');
  await sync();
  device('b');
  await sync();
  expect(await db.entries.get('e-2')).toBeUndefined();
  await sync();
  device('a');
  await sync();
  expect((await db.entries.toArray()).map((e) => e.id)).toEqual(['e-1']);
  expect(server.rows.get('entry/e-2')?.deleted).toBe(true);
});

it('keeps writing that another device deleted meanwhile', async () => {
  device('a');
  await db.entries.put(entry('e-1', 'Original'));
  await sync();
  device('b');
  await sync();
  device('a');
  await db.entries.delete('e-1');
  await sync();
  device('b');
  await db.entries.put(entry('e-1', 'Added a prayer', 2));
  await sync();
  device('a');
  await sync();
  expect((await db.entries.get('e-1'))?.body).toBe('Added a prayer');
});

it('keeps local records when the upload fails, and sends them next time', async () => {
  device('a');
  await db.entries.put(entry('e-1', 'Written offline'));
  server.failPush = true;
  await expect(sync()).rejects.toThrow('Failed to fetch');
  expect((await db.entries.get('e-1'))?.body).toBe('Written offline');
  server.failPush = false;
  expect((await sync()).pushed).toBe(1);
  expect(server.rows.has('entry/e-1')).toBe(true);
});

it('ignores rows that do not have the shape the app reads', async () => {
  server.rows.set('entry/bad', {
    kind: 'entry',
    record_id: 'bad',
    data: { id: 'bad', body: 3 },
    deleted: false,
    updated_at: '2026-10-23T00:00:00.000Z',
  });
  device('a');
  await sync();
  expect(await db.entries.get('bad')).toBeUndefined();
});
