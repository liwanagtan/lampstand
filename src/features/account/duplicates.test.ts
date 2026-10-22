import { db, selectAccountDatabase } from '@/db/db';
import { copyOf, findDuplicates, keepBoth, keepCopy, keepOriginal } from './duplicates';

const entry = (id: string, body: string) => ({
  id,
  date: '2026-10-23',
  kind: 'journal' as const,
  body,
  createdAt: 1,
  updatedAt: 2,
});

beforeEach(async () => {
  selectAccountDatabase(`dupes-${crypto.randomUUID()}`);
  await db.entries.bulkPut([
    entry('e-1', 'Mine'),
    entry('guest:e-1', 'Guest'),
    entry('guest:e-2', 'Alone'),
  ]);
});
afterEach(() => selectAccountDatabase(null));

it('reads copy ids', () => {
  expect(copyOf('device:n:abc')).toEqual({ source: 'device', original: 'n:abc' });
  expect(copyOf('e-1')).toBeNull();
});

it('lists only copies whose original still exists', async () => {
  const found = await findDuplicates();
  expect(found.map((d) => d.copy.id)).toEqual(['guest:e-1']);
});

it('keeps the original, the copy, or both', async () => {
  const [d] = await findDuplicates();
  await keepCopy(d!);
  expect((await db.entries.get('e-1'))?.body).toBe('Guest');
  expect(await db.entries.get('guest:e-1')).toBeUndefined();

  await db.entries.put(entry('guest:e-1', 'Again'));
  await keepOriginal((await findDuplicates())[0]!);
  expect((await db.entries.get('e-1'))?.body).toBe('Guest');
  expect(await findDuplicates()).toEqual([]);

  await db.entries.put(entry('guest:e-1', 'Both'));
  await keepBoth((await findDuplicates())[0]!);
  expect(await findDuplicates()).toEqual([]);
  expect((await db.entries.toArray()).map((e) => e.body).sort()).toEqual([
    'Alone',
    'Both',
    'Guest',
  ]);
});
