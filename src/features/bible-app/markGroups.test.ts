import type { MarkRecord } from '@/db/types';
import { groupMarks } from './markGroups';

const mark = (id: string, kind: MarkRecord['kind'], ref: string, extra: Partial<MarkRecord> = {}) =>
  ({
    id,
    kind,
    ref,
    book: ref.slice(0, 3),
    chapter: 1,
    createdAt: 1,
    updatedAt: 1,
    ...extra,
  }) as MarkRecord;

describe('groupMarks', () => {
  it('merges neighbouring verses highlighted in one colour', () => {
    const items = groupMarks([
      mark('h:JHN.3.17', 'highlight', 'JHN.3.17', { color: 'yellow' }),
      mark('h:JHN.3.16', 'highlight', 'JHN.3.16', { color: 'yellow' }),
      mark('h:JHN.3.18', 'highlight', 'JHN.3.18', { color: 'blue' }),
      mark('h:JHN.3.20', 'highlight', 'JHN.3.20', { color: 'blue' }),
    ]);
    expect(items.map((i) => [i.ids.length, i.color])).toEqual([
      [2, 'yellow'],
      [1, 'blue'],
      [1, 'blue'],
    ]);
    expect(items[0]!.range.end.verse).toBe(17);
  });

  it('keeps bookmarks and notes as their own items and skips bad refs', () => {
    const items = groupMarks([
      mark('b:PSA.23.1', 'bookmark', 'PSA.23.1'),
      mark('n:1', 'note', 'ROM.8.28', { text: 'Hope' }),
      mark('n:2', 'note', 'nope'),
    ]);
    expect(items.map((i) => i.kind)).toEqual(['bookmark', 'note']);
    expect(items[1]!.note?.text).toBe('Hope');
  });
});
