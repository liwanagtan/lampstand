// Notes page grouping (Bible app): marks as list items in Bible order.
import type { HighlightColor, MarkRecord } from '@/db/types';
import { BOOK_INDEX } from '@/features/bible/books';
import { fromOsis, type RefRange } from '@/features/bible/ref';

export interface MarkItem {
  key: string;
  kind: MarkRecord['kind'];
  range: RefRange;
  ids: string[];
  color?: HighlightColor;
  note?: MarkRecord;
  updatedAt: number;
}

export const markOrder = (r: RefRange) =>
  (BOOK_INDEX.get(r.start.book) ?? 0) * 1e6 + r.start.chapter * 1e3 + r.start.verse;

/** Turns marks into list items; neighbouring verses highlighted in one colour become one item. */
export function groupMarks(marks: MarkRecord[]): MarkItem[] {
  const items: MarkItem[] = [];
  const highlights: { m: MarkRecord; r: RefRange }[] = [];
  for (const m of marks) {
    const r = fromOsis(m.ref);
    if (!r) continue;
    if (m.kind === 'highlight') highlights.push({ m, r });
    else
      items.push({
        key: m.id,
        kind: m.kind,
        range: r,
        ids: [m.id],
        note: m.kind === 'note' ? m : undefined,
        updatedAt: m.updatedAt,
      });
  }
  highlights.sort((a, b) => markOrder(a.r) - markOrder(b.r));
  for (const { m, r } of highlights) {
    const last = items[items.length - 1];
    if (
      last?.kind === 'highlight' &&
      last.color === m.color &&
      last.range.end.book === r.start.book &&
      last.range.end.chapter === r.start.chapter &&
      last.range.end.verse + 1 === r.start.verse
    ) {
      last.range = { start: last.range.start, end: r.end };
      last.ids.push(m.id);
      last.updatedAt = Math.max(last.updatedAt, m.updatedAt);
    } else {
      items.push({
        key: m.id,
        kind: 'highlight',
        range: r,
        ids: [m.id],
        color: m.color,
        updatedAt: m.updatedAt,
      });
    }
  }
  return items;
}
