// Journal timeline (docs/PRD-ADDENDUM-GROW.md, M14): what you wrote and what you marked,
// newest first, in one list.
import type { JournalEntryRecord, MarkRecord } from '@/db/types';
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
