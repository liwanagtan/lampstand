import { readFileSync } from 'node:fs';
import { fromOsis } from '@/features/bible/ref';
import { notesByVerse, notesForRange, type BookNotes } from './studyNotes';

const john = JSON.parse(readFileSync('public/notes/JHN.json', 'utf8')) as BookNotes;

describe('study notes', () => {
  it('has notes, a summary and an introduction for every book', () => {
    for (const code of ['GEN', 'PSA', 'JHN', 'REV']) {
      const b = JSON.parse(readFileSync(`public/notes/${code}.json`, 'utf8')) as BookNotes;
      expect(b.notes.length).toBeGreaterThan(10);
      expect(b.intro).toBeTruthy();
      expect(b.summary).toBeTruthy();
    }
  });

  it('finds the notes that start at a verse and the ones that cover a passage', () => {
    expect(notesByVerse(john, 3).get(16)?.length).toBeGreaterThan(0);
    const range = fromOsis('JHN.3.16-JHN.3.18')!;
    expect(notesForRange(john, range).length).toBeGreaterThan(0);
    expect(notesForRange(john, fromOsis('ROM.8.28')!)).toEqual([]);
  });

  it('keeps only simple, safe markup', () => {
    const html = john.notes.map((n) => n.html).join('');
    expect(html).not.toMatch(/<(script|style|img|iframe)/i);
    expect(html).not.toMatch(/ on\w+=/i);
    expect(html).toMatch(/<a href="#" data-ref="[1-3A-Z]{3}\.\d+\.\d+">/);
  });
});
