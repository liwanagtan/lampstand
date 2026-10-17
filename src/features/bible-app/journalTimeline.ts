// Journal timeline (docs/PRD-ADDENDUM-GROW.md, M14): what you wrote and what you marked,
// newest first, in one list.
import type { JournalEntryRecord, MarkRecord } from '@/db/types';
import { formatRef, fromOsis } from '@/features/bible/ref';
import { localDate } from './dailyVerses';
import { entryHasContent } from './journal';
import { groupMarks, type MarkItem } from './markGroups';

export type Kind = 'reflection' | 'journal' | 'note' | 'highlight' | 'bookmark';

export type TimelineItem =
  | {
      kind: 'reflection' | 'journal';
      key: string;
      date: string;
      time: number;
      entry: JournalEntryRecord;
    }
  | {
      kind: 'note' | 'highlight' | 'bookmark';
      key: string;
      date: string;
      time: number;
      mark: MarkItem;
    };

export function buildTimeline(entries: JournalEntryRecord[], marks: MarkRecord[]): TimelineItem[] {
  const items: TimelineItem[] = [];
  for (const e of entries) {
    if (!entryHasContent(e)) continue;
    items.push({ kind: e.kind, key: e.id, date: e.date, time: e.updatedAt, entry: e });
  }
  for (const m of groupMarks(marks)) {
    items.push({
      kind: m.kind,
      key: m.key,
      date: localDate(new Date(m.updatedAt)),
      time: m.updatedAt,
      mark: m,
    });
  }
  return items.sort((a, b) => b.date.localeCompare(a.date) || b.time - a.time);
}

export type EntryItem = Extract<TimelineItem, { entry: JournalEntryRecord }>;
export type MarkTimelineItem = Extract<TimelineItem, { mark: MarkItem }>;

export const isEntryItem = (i: TimelineItem): i is EntryItem => 'entry' in i;

const refLabel = (ref?: string) => {
  const r = ref ? fromOsis(ref) : null;
  return r ? formatRef(r) : null;
};

/** The words an item can be found by: titles, writing, answers, notes and references. */
export function timelineText(item: TimelineItem): string {
  if (isEntryItem(item)) {
    const e = item.entry;
    return [e.title, e.body, refLabel(e.ref), ...Object.values(e.answers ?? {})]
      .filter(Boolean)
      .join(' ');
  }
  return [formatRef(item.mark.range), item.mark.note?.text].filter(Boolean).join(' ');
}

/** Timeline items matching every word of a query. */
export function searchTimeline(items: readonly TimelineItem[], query: string): TimelineItem[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return items.filter((i) => {
    const text = timelineText(i).toLowerCase();
    return words.every((w) => text.includes(w));
  });
}
