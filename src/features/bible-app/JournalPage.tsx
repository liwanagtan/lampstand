import { useMemo, useState } from 'react';
import {
  BookOpen,
  Bookmark,
  Highlighter,
  NotebookPen,
  Plus,
  Search,
  Sparkles,
  StickyNote,
  Trash2,
} from 'lucide-react';
import {
  Button,
  EmptyState,
  IconButton,
  Input,
  Tooltip,
  cx,
  toast,
} from '@/design-system/components';
import type { JournalEntryRecord, MarkRecord } from '@/db/types';
import { formatRef, fromOsis, toOsis, type RefRange } from '@/features/bible/ref';
import { useSettings } from '@/features/settings/settingsStore';
import { usePassage } from '@/slides/usePassage';
import { localDate } from './dailyVerses';
import { entryPreview, newEntryId, useEntries, type EntryDraft } from './journal';
import { EntrySheet } from './JournalEntrySheet';
import { buildTimeline, isEntryItem, type Kind, type TimelineItem } from './journalTimeline';
import type { MarkItem } from './markGroups';
import { deleteMarks, useAllMarks } from './marks';
import { NoteDialog } from './NoteDialog';
import { useReader } from './readerStore';
import { useOpenInReader } from './useOpenInReader';
import styles from './Journal.module.css';

type Filter = 'all' | Kind;

const FILTERS: { value: Filter; label: string; marks?: boolean }[] = [
  { value: 'all', label: 'All' },
  { value: 'reflection', label: 'Reflections' },
  { value: 'journal', label: 'Journal' },
  { value: 'note', label: 'Notes', marks: true },
  { value: 'highlight', label: 'Highlights', marks: true },
  { value: 'bookmark', label: 'Bookmarks', marks: true },
];

const KIND_LABEL: Record<Kind, string> = {
  reflection: 'Reflection',
  journal: 'Journal',
  note: 'Note',
  highlight: 'Highlight',
  bookmark: 'Bookmark',
};

const parseDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
};
const dayFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});
const monthFormat = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });
const refLabel = (ref?: string) => {
  const r = ref ? fromOsis(ref) : null;
  return r ? formatRef(r) : null;
};

function searchText(item: TimelineItem): string {
  if (isEntryItem(item)) {
    const e = item.entry;
    return [e.title, e.body, refLabel(e.ref), ...Object.values(e.answers ?? {})]
      .filter(Boolean)
      .join(' ');
  }
  return [formatRef(item.mark.range), item.mark.note?.text].filter(Boolean).join(' ');
}

/**
 * Journal: one timeline of everything you have written or marked — reflections, journal
 * entries, notes, highlights and bookmarks — with filters and search.
 */
export function JournalPage() {
  const entries = useEntries();
  const allMarks = useAllMarks();
  const marksOn = useSettings((s) => s.features.marks);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<{ id: string; draft?: EntryDraft } | null>(null);
  const [note, setNote] = useState<{ range: RefRange; note: MarkRecord | null } | null>(null);

  const timeline = useMemo(
    () => buildTimeline(entries ?? [], marksOn ? (allMarks ?? []) : []),
    [entries, allMarks, marksOn],
  );
  const counts = useMemo(() => {
    const c: Record<Filter, number> = {
      all: timeline.length,
      reflection: 0,
      journal: 0,
      note: 0,
      highlight: 0,
      bookmark: 0,
    };
    for (const i of timeline) c[i.kind]++;
    return c;
  }, [timeline]);

  const q = query.trim().toLowerCase();
  const shown = timeline
    .filter((i) => filter === 'all' || i.kind === filter)
    .filter((i) => !q || searchText(i).toLowerCase().includes(q));

  const groups: { month: string; items: TimelineItem[] }[] = [];
  for (const i of shown) {
    const month = monthFormat.format(parseDate(i.date));
    const last = groups[groups.length - 1];
    if (last?.month === month) last.items.push(i);
    else groups.push({ month, items: [i] });
  }

  const startNew = () =>
    setOpen({ id: newEntryId(), draft: { id: '', date: localDate(), kind: 'journal', body: '' } });

  const loaded = entries !== undefined && allMarks !== undefined;

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <p className={styles.eyebrow}>Journal</p>
          <h1 className={styles.title}>Your journal</h1>
          <p className={styles.lede}>
            What you have written and marked in the Word, in one place. It stays on this device.
          </p>
        </div>
        <Button variant="primary" icon={<Plus size={16} />} onClick={startNew}>
          New entry
        </Button>
      </div>

      {loaded && timeline.length === 0 ? (
        <EmptyState
          icon={<NotebookPen size={28} />}
          title="Start your journal"
          actions={
            <Button variant="primary" icon={<Plus size={16} />} onClick={startNew}>
              Write your first entry
            </Button>
          }
        >
          Write about a verse that speaks to you, a prayer, or what you are learning. Reflections
          from Today, and the notes, highlights and bookmarks you make while reading, appear here
          too.
        </EmptyState>
      ) : (
        <>
          <div className={styles.bar}>
            <div className={styles.filters} role="radiogroup" aria-label="Show">
              {FILTERS.filter((f) => marksOn || !f.marks).map((f) => (
                <button
                  key={f.value}
                  type="button"
                  role="radio"
                  aria-checked={filter === f.value}
                  className={styles.filter}
                  onClick={() => setFilter(f.value)}
                >
                  {f.label}
                  <span className={styles.count}>{counts[f.value]}</span>
                </button>
              ))}
            </div>
            <Input
              label="Search the journal"
              hideLabel
              placeholder="Search your journal"
              icon={<Search size={16} />}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={styles.search}
            />
          </div>
          {loaded && shown.length === 0 ? (
            <p className={styles.none}>Nothing matches.</p>
          ) : (
            groups.map((g) => (
              <section key={g.month} className={styles.month} aria-label={g.month}>
                <h2 className={styles.monthTitle}>{g.month}</h2>
                <ul className={styles.list} aria-label={`${g.month} entries`}>
                  {g.items.map((i) => (
                    <li key={i.key}>
                      {isEntryItem(i) ? (
                        <EntryRow entry={i.entry} onOpen={() => setOpen({ id: i.entry.id })} />
                      ) : (
                        <MarkRow
                          kind={i.kind}
                          date={i.date}
                          item={i.mark}
                          onEditNote={(n) => setNote({ range: i.mark.range, note: n })}
                        />
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </>
      )}

      <EntrySheet target={open} onClose={() => setOpen(null)} />
      <NoteDialog target={note} onClose={() => setNote(null)} />
    </div>
  );
}

function KindChip({ kind, color }: { kind: Kind; color?: string }) {
  const Icon =
    kind === 'reflection'
      ? Sparkles
      : kind === 'journal'
        ? NotebookPen
        : kind === 'note'
          ? StickyNote
          : kind === 'bookmark'
            ? Bookmark
            : Highlighter;
  return (
    <span className={cx(styles.kind, styles[`kind-${kind}`])} data-color={color}>
      <Icon size={12} aria-hidden /> {KIND_LABEL[kind]}
    </span>
  );
}

function EntryRow({ entry: e, onOpen }: { entry: JournalEntryRecord; onOpen: () => void }) {
  return (
    <button type="button" className={styles.item} onClick={onOpen}>
      <span className={styles.itemDate}>{dayFormat.format(parseDate(e.date))}</span>
      <span className={styles.itemMain}>
        <span className={styles.itemTop}>
          <KindChip kind={e.kind} />
          {refLabel(e.ref) && <span className={styles.itemRef}>{refLabel(e.ref)}</span>}
        </span>
        {e.title && <span className={styles.itemTitle}>{e.title}</span>}
        <span className={styles.itemPreview}>{entryPreview(e)}</span>
      </span>
    </button>
  );
}

function MarkRow({
  kind,
  date,
  item,
  onEditNote,
}: {
  kind: 'note' | 'highlight' | 'bookmark';
  date: string;
  item: MarkItem;
  onEditNote: (note: MarkRecord) => void;
}) {
  const translation = useReader((s) => s.translation);
  const openInReader = useOpenInReader();
  const ref = toOsis(item.range);
  const { passage } = usePassage(ref, translation);
  const label = formatRef(item.range);
  const text = passage?.verses
    .filter((v) => !v.missing)
    .map((v) => v.text)
    .join(' ');

  return (
    <div className={cx(styles.item, styles.markItem)}>
      <span className={styles.itemDate}>{dayFormat.format(parseDate(date))}</span>
      <span className={styles.itemMain}>
        <span className={styles.itemTop}>
          <KindChip kind={kind} color={item.color} />
          <button
            type="button"
            className={styles.itemRefLink}
            onClick={() => openInReader(item.range)}
          >
            {label}
          </button>
        </span>
        {item.note && (
          <button type="button" className={styles.noteText} onClick={() => onEditNote(item.note!)}>
            {item.note.text}
          </button>
        )}
        {text && (
          <span className={cx(styles.itemPreview, styles.verseText)}>
            {kind === 'highlight' ? (
              <mark className={styles.hl} data-color={item.color}>
                {text}
              </mark>
            ) : (
              text
            )}
          </span>
        )}
      </span>
      <span className={styles.rowActions}>
        <Tooltip content="Open in the reader">
          <IconButton
            label={`Open ${label}`}
            icon={<BookOpen size={16} />}
            size="sm"
            onClick={() => openInReader(item.range)}
          />
        </Tooltip>
        <Tooltip content="Delete">
          <IconButton
            label={`Delete ${KIND_LABEL[kind].toLowerCase()} on ${label}`}
            icon={<Trash2 size={16} />}
            size="sm"
            onClick={() =>
              void deleteMarks(item.ids).then((undo) =>
                toast({
                  title: `${KIND_LABEL[kind]} on ${label} deleted`,
                  action: { label: 'Undo', onClick: () => void undo() },
                }),
              )
            }
          />
        </Tooltip>
      </span>
    </div>
  );
}
