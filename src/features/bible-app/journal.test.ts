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

  it('keeps a plan reflection and its passage separate from reading completion', async () => {
    await db.plans.put({ planId: 'gospels-40', startedAt: 100, done: [1], updatedAt: 200 });
    const draft = {
      id: 'plan-reflection',
      date: '2026-10-22',
      kind: 'reflection' as const,
      ref: 'MRK.1.1-MRK.1.45',
      planId: 'gospels-40',
      planDay: 2,
      title: 'The Gospels · Day 2',
      body: 'I noticed Jesus made time to pray.',
    };
    await saveEntry(draft);
    await saveEntry({ ...draft, body: 'I want to make time for prayer.' });
    expect(await db.entries.get(draft.id)).toMatchObject({
      ref: draft.ref,
      planId: draft.planId,
      planDay: 2,
      body: 'I want to make time for prayer.',
    });
    expect((await db.plans.get('gospels-40'))?.done).toEqual([1]);
    await db.plans.clear();
  });

  it('saves and edits a reflection without a network connection', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('offline'))),
    );
    try {
      const draft = {
        id: 'offline-reflection',
        date: '2026-10-22',
        kind: 'reflection' as const,
        ref: 'JHN.1.1',
        chapterBook: 'JHN',
        chapterNumber: 1,
        body: 'The light shines.',
      };
      await saveEntry(draft);
      await saveEntry({ ...draft, body: 'The light still shines.' });
      expect((await db.entries.get(draft.id))?.body).toBe('The light still shines.');
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('does not keep an empty reflection just because it has a prefilled title', async () => {
    const draft = {
      id: 'untouched-reflection',
      date: '2026-10-22',
      kind: 'reflection' as const,
      ref: 'JHN.1.1',
      title: 'John 1',
      body: '',
    };
    await saveEntry(draft);
    expect(await db.entries.get(draft.id)).toBeUndefined();
    await saveEntry({ ...draft, body: 'A thought.' });
    await saveEntry(draft);
    expect(await db.entries.get(draft.id)).toBeUndefined();
  });
});
