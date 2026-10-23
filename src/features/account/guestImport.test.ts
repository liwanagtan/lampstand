import { DB_NAME, LampstandDB, db, selectAccountDatabase } from '@/db/db';
import { importGuestData, mergeGuestPlan } from './guestImport';

afterEach(() => selectAccountDatabase(null));

it('unites plan completions from guest and account', () => {
  expect(
    mergeGuestPlan(
      { planId: 'gospels', startedAt: 2, done: [2], doneAt: { 2: 20 }, updatedAt: 20 },
      { planId: 'gospels', startedAt: 1, done: [1], doneAt: { 1: 10 }, updatedAt: 10 },
    ),
  ).toMatchObject({ startedAt: 1, done: [1, 2], doneAt: { 1: 10, 2: 20 } });
});

it('keeps both journal versions and leaves guest records untouched', async () => {
  const guest = new LampstandDB(DB_NAME);
  await guest.entries.put({
    id: 'shared',
    date: '2026-10-23',
    kind: 'journal',
    body: 'Guest reflection',
    createdAt: 1,
    updatedAt: 2,
  });
  selectAccountDatabase('import-test');
  await db.entries.put({
    id: 'shared',
    date: '2026-10-23',
    kind: 'journal',
    body: 'Account reflection',
    createdAt: 1,
    updatedAt: 3,
  });

  const result = await importGuestData();
  expect(result.entries).toBe(1);
  expect((await db.entries.get('shared'))?.body).toBe('Account reflection');
  expect((await db.entries.get('guest:shared'))?.body).toBe('Guest reflection');
  expect((await guest.entries.get('shared'))?.body).toBe('Guest reflection');
  expect((await importGuestData()).entries).toBe(0);
  guest.close();
});

it('lets the newer highlight win instead of keeping a copy', async () => {
  const guest = new LampstandDB(DB_NAME);
  const mark = (color: 'yellow' | 'green', updatedAt: number) => ({
    id: 'h:JHN.3.16',
    kind: 'highlight' as const,
    ref: 'JHN.3.16',
    book: 'JHN',
    chapter: 3,
    color,
    createdAt: 1,
    updatedAt,
  });
  await guest.marks.put(mark('green', 5));
  selectAccountDatabase('import-marks');
  await db.marks.put(mark('yellow', 3));
  await importGuestData();
  expect((await db.marks.get('h:JHN.3.16'))?.color).toBe('green');
  expect(await db.marks.get('guest:h:JHN.3.16')).toBeUndefined();
  await guest.marks.clear();
  guest.close();
});
