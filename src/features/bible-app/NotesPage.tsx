import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bookmark,
  BookOpen,
  Highlighter,
  MonitorPlay,
  Search,
  StickyNote,
  Trash2,
} from 'lucide-react';
import {
  Button,
  EmptyState,
  IconButton,
  Input,
  Select,
  Tooltip,
  cx,
  toast,
} from '@/design-system/components';
import type { MarkRecord } from '@/db/types';
import { formatRef, toOsis, type RefRange } from '@/features/bible/ref';
import { usePassage } from '@/slides/usePassage';
import { groupMarks, markOrder as order, type MarkItem as Item } from './markGroups';
import { deleteMarks, useAllMarks } from './marks';
import { NoteDialog } from './NoteDialog';
import { useReader } from './readerStore';
import { showOnTv } from './tvActions';
import styles from './NotesPage.module.css';

type Filter = 'all' | 'highlight' | 'bookmark' | 'note';
type Sort = 'bible' | 'recent';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'highlight', label: 'Highlights' },
  { value: 'bookmark', label: 'Bookmarks' },
  { value: 'note', label: 'Notes' },
];

const dateFormat = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

/** Everything you have marked in the Bible: highlights, bookmarks and notes. */
export function NotesPage() {
  const marks = useAllMarks();
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('bible');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<{ range: RefRange; note: MarkRecord | null } | null>(null);
  const items = useMemo(() => groupMarks(marks ?? []), [marks]);
  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: items.length, highlight: 0, bookmark: 0, note: 0 };
    for (const i of items) c[i.kind]++;
    return c;
  }, [items]);

  const q = query.trim().toLowerCase();
  const shown = items
    .filter((i) => filter === 'all' || i.kind === filter)
    .filter(
      (i) =>
        !q ||
        formatRef(i.range).toLowerCase().includes(q) ||
        (i.note?.text ?? '').toLowerCase().includes(q),
    )
    .sort((a, b) =>
      sort === 'recent' ? b.updatedAt - a.updatedAt : order(a.range) - order(b.range),
    );

  if (marks && items.length === 0) {
    return (
      <div className={styles.emptyWrap}>
        <EmptyState
          icon={<Highlighter size={28} />}
          title="Nothing marked yet"
          actions={<ReadButton />}
        >
          While reading, select a verse to highlight it, bookmark it or write a note. Everything you
          mark collects here.
        </EmptyState>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Notes &amp; highlights</h1>
      </header>
      <div className={styles.bar}>
        <div className={styles.filters} role="radiogroup" aria-label="Show">
          {FILTERS.map((f) => (
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
        <div className={styles.tools}>
          <Input
            label="Search notes"
            hideLabel
            placeholder="Search notes and references"
            icon={<Search size={16} />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={styles.search}
          />
          <Select
            label="Sort"
            hideLabel
            aria-label="Sort"
            size="sm"
            value={sort}
            onChange={(v) => setSort(v as Sort)}
            options={[
              { value: 'bible', label: 'Bible order' },
              { value: 'recent', label: 'Most recent' },
            ]}
            className={styles.sort}
          />
        </div>
      </div>

      {shown.length === 0 ? (
        <p className={styles.none}>Nothing matches.</p>
      ) : (
        <ul className={styles.list} aria-label="Marked passages">
          {shown.map((i) => (
            <MarkRow key={i.key} item={i} onEdit={(note) => setEditing({ range: i.range, note })} />
          ))}
        </ul>
      )}
      <NoteDialog target={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function ReadButton() {
  const navigate = useNavigate();
  return (
    <Button variant="primary" icon={<BookOpen size={16} />} onClick={() => navigate('/bible')}>
      Open the Bible
    </Button>
  );
}

function MarkRow({ item, onEdit }: { item: Item; onEdit: (note: MarkRecord) => void }) {
  const navigate = useNavigate();
  const translation = useReader((s) => s.translation);
  const ref = toOsis(item.range);
  const { passage } = usePassage(ref, translation);
  const label = formatRef(item.range);
  const text = passage?.verses
    .filter((v) => !v.missing)
    .map((v) => v.text)
    .join(' ');

  const open = () => {
    const r = item.range;
    useReader.getState().goTo(r.start.book, r.start.chapter, {
      start: r.start.verse,
      end: r.end.chapter === r.start.chapter ? r.end.verse : r.start.verse,
    });
    navigate('/bible');
  };

  const Icon =
    item.kind === 'note' ? StickyNote : item.kind === 'bookmark' ? Bookmark : Highlighter;
  const kindLabel =
    item.kind === 'note' ? 'Note' : item.kind === 'bookmark' ? 'Bookmark' : 'Highlight';

  return (
    <li className={styles.row} data-color={item.color}>
      <span className={cx(styles.kind, styles[item.kind])} aria-label={kindLabel} title={kindLabel}>
        <Icon size={15} aria-hidden />
      </span>
      <div className={styles.main}>
        <div className={styles.rowHead}>
          <button type="button" className={styles.ref} onClick={open}>
            {label}
          </button>
          <span className={styles.date}>{dateFormat.format(item.updatedAt)}</span>
        </div>
        {item.note ? (
          <button type="button" className={styles.noteText} onClick={() => onEdit(item.note!)}>
            {item.note.text}
          </button>
        ) : null}
        {text && (
          <p className={cx(styles.verse, item.kind === 'highlight' && styles.lit)}>
            {text}
            <span className={styles.code}> {translation}</span>
          </p>
        )}
      </div>
      <div className={styles.actions}>
        <Tooltip content="Present">
          <IconButton
            label={`Present ${label}`}
            icon={<MonitorPlay size={16} />}
            size="sm"
            onClick={() => void showOnTv(ref, translation)}
          />
        </Tooltip>
        <Tooltip content="Open in the reader">
          <IconButton
            label={`Open ${label}`}
            icon={<BookOpen size={16} />}
            size="sm"
            onClick={open}
          />
        </Tooltip>
        <Tooltip content="Delete">
          <IconButton
            label={`Delete ${kindLabel.toLowerCase()} on ${label}`}
            icon={<Trash2 size={16} />}
            size="sm"
            onClick={() =>
              void deleteMarks(item.ids).then((undo) =>
                toast({
                  title: `${kindLabel} on ${label} deleted`,
                  action: { label: 'Undo', onClick: () => void undo() },
                }),
              )
            }
          />
        </Tooltip>
      </div>
    </li>
  );
}
