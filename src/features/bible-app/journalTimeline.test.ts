import type { JournalEntryRecord, MarkRecord } from '@/db/types';
import { buildTimeline } from './journalTimeline';

const day = (d: number) => new Date(2026, 9, d, 12).getTime();
const mark = (id: string, kind: MarkRecord['kind'], ref: string, t: number, extra = {}) =>
  ({
    id,
    kind,
    ref,
    book: ref.slice(0, 3),
    chapter: 1,
    createdAt: t,
    updatedAt: t,
    ...extra,
  }) as MarkRecord;
const entry = (id: string, date: string, t: number, body = 'x') =>
  ({ id, date, kind: 'journal', body, createdAt: t, updatedAt: t }) as JournalEntryRecord;

describe('journal timeline', () => {
  it('puts entries and marks together, newest day first, skipping empty entries', () => {
    const items = buildTimeline(
      [entry('a', '2026-10-15', day(15)), entry('empty', '2026-10-17', day(17), '  ')],
      [
        mark('b:JHN.3.16', 'bookmark', 'JHN.3.16', day(16)),
        mark('h:PSA.23.1', 'highlight', 'PSA.23.1', day(14), { color: 'yellow' }),
        mark('h:PSA.23.2', 'highlight', 'PSA.23.2', day(14), { color: 'yellow' }),
      ],
    );
    expect(items.map((i) => i.kind)).toEqual(['bookmark', 'journal', 'highlight']);
    // Neighbouring highlights in one colour are one item.
    const hl = items[2]!;
    expect(hl.kind === 'highlight' && hl.mark.ids).toHaveLength(2);
  });
});
