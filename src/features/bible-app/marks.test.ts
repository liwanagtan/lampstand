import { db } from '@/db/db';
import { fromOsis } from '@/features/bible/ref';
import { deleteMarks, saveNote, setHighlight, toggleBookmark } from './marks';

const range = (id: string) => fromOsis(id)!;

describe('Bible marks', () => {
  beforeEach(() => db.marks.clear());

  it('highlights each verse, recolours and clears', async () => {
    await setHighlight(range('JHN.3.16-JHN.3.18'), 'yellow');
    expect(await db.marks.where('[book+chapter]').equals(['JHN', 3]).count()).toBe(3);
    await setHighlight(range('JHN.3.17'), 'blue');
    expect((await db.marks.get('h:JHN.3.17'))?.color).toBe('blue');
    await setHighlight(range('JHN.3.16-JHN.3.18'), null);
    expect(await db.marks.count()).toBe(0);
  });

  it('toggles bookmarks', async () => {
    expect(await toggleBookmark(range('PSA.23.1-PSA.23.3'))).toBe(true);
    expect(await toggleBookmark(range('PSA.23.1-PSA.23.3'))).toBe(false);
    expect(await db.marks.count()).toBe(0);
  });

  it('saves, edits and deletes notes; an empty note deletes it', async () => {
    const id = await saveNote(null, range('ROM.8.28'), 'All things');
    expect(id).toMatch(/^n:/);
    await saveNote(id, range('ROM.8.28'), 'All things work together');
    expect((await db.marks.get(id!))?.text).toBe('All things work together');
    expect(await saveNote(id, range('ROM.8.28'), '   ')).toBeNull();
    expect(await db.marks.count()).toBe(0);
  });

  it('undoes a delete', async () => {
    await toggleBookmark(range('GEN.1.1'));
    const undo = await deleteMarks(['b:GEN.1.1']);
    expect(await db.marks.count()).toBe(0);
    await undo();
    expect(await db.marks.get('b:GEN.1.1')).toBeTruthy();
  });
});
