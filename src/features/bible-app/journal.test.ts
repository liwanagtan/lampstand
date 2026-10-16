import { db } from '@/db/db';
import { deleteEntry, entryHasContent, entryPreview, saveEntry } from './journal';

describe('journal entries', () => {
  beforeEach(() => db.entries.clear());

  it('saves, updates and removes an empty entry', async () => {
    const draft = { id: 'e-1', date: '2026-10-16', kind: 'journal' as const, body: 'Be still' };
    await saveEntry({ ...draft, ref: 'PSA.46.10' });
    const first = (await db.entries.get('e-1'))!;
    expect(first).toMatchObject({ ref: 'PSA.46.10', body: 'Be still' });
    await saveEntry({ ...draft, title: 'Quiet', body: 'Be still and know' });
    const second = (await db.entries.get('e-1'))!;
    expect(second.createdAt).toBe(first.createdAt);
    expect(entryHasContent(second)).toBe(true);
    await saveEntry({ ...draft, body: '  ', title: '' });
    expect(await db.entries.get('e-1')).toBeUndefined();
  });

  it('keeps several entries a day and undoes a delete', async () => {
    await saveEntry({
      id: 'a',
      date: '2026-10-16',
      kind: 'reflection',
      body: '',
      answers: { god: 'Faithful' },
    });
    await saveEntry({ id: 'b', date: '2026-10-16', kind: 'journal', body: 'Prayer list' });
    expect(await db.entries.where('date').equals('2026-10-16').count()).toBe(2);
    expect(entryPreview((await db.entries.get('a'))!)).toBe('Faithful');
    const undo = await deleteEntry('b');
    expect(await db.entries.count()).toBe(1);
    await undo();
    expect(await db.entries.count()).toBe(2);
  });
});
