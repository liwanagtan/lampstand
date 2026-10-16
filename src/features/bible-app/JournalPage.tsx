import { useMemo, useState } from 'react';
import { BookOpen, NotebookPen, Plus, Search, Sparkles, Trash2 } from 'lucide-react';
import {
  Button,
  EmptyState,
  IconButton,
  Input,
  Sheet,
  Tooltip,
  cx,
  toast,
} from '@/design-system/components';
import type { JournalEntryRecord } from '@/db/types';
import { formatRef, fromOsis, parseRefDetailed, toOsis } from '@/features/bible/ref';
import { usePassage } from '@/slides/usePassage';
import { localDate } from './dailyVerses';
import { EntryEditor } from './EntryEditor';
import {
  deleteEntry,
  entryHasContent,
  entryPreview,
  newEntryId,
  useEntries,
  useEntry,
  type EntryDraft,
} from './journal';
import { useReader } from './readerStore';
import { useOpenInReader } from './useOpenInReader';
import styles from './Journal.module.css';

type Filter = 'all' | 'reflection' | 'journal';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'reflection', label: 'Reflections' },
  { value: 'journal', label: 'Journal' },
];

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

/** Every reflection and journal entry, with search; new or open ones edit in a side panel. */
export function JournalPage() {
  const entries = useEntries();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<{ id: string; draft?: EntryDraft } | null>(null);

  const q = query.trim().toLowerCase();
  const shown = useMemo(
    () =>
      (entries ?? [])
        .filter((e) => entryHasContent(e))
        .filter((e) => filter === 'all' || e.kind === filter)
        .filter(
          (e) =>
            !q ||
            [e.title, e.body, refLabel(e.ref), ...Object.values(e.answers ?? {})]
              .filter(Boolean)
              .some((t) => t!.toLowerCase().includes(q)),
        ),
    [entries, filter, q],
  );

  const groups = useMemo(() => {
    const out: { month: string; items: JournalEntryRecord[] }[] = [];
    for (const e of shown) {
      const month = monthFormat.format(parseDate(e.date));
      const last = out[out.length - 1];
      if (last?.month === month) last.items.push(e);
      else out.push({ month, items: [e] });
    }
    return out;
  }, [shown]);

  const startNew = () =>
    setOpen({
      id: newEntryId(),
      draft: { id: '', date: localDate(), kind: 'journal', body: '' },
    });

  const any = (entries ?? []).some((e) => entryHasContent(e));

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <p className={styles.eyebrow}>Journal</p>
          <h1 className={styles.title}>Your journal</h1>
          <p className={styles.lede}>
            Reflections and notes from your time in the Word. They stay on this computer.
          </p>
        </div>
        <Button variant="primary" icon={<Plus size={16} />} onClick={startNew}>
          New entry
        </Button>
      </div>

      {entries && !any ? (
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
          from the Today tab appear here too.
        </EmptyState>
      ) : (
        <>
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
          {shown.length === 0 && entries ? (
            <p className={styles.none}>Nothing matches.</p>
          ) : (
            groups.map((g) => (
              <section key={g.month} className={styles.month} aria-label={g.month}>
                <h2 className={styles.monthTitle}>{g.month}</h2>
                <ul className={styles.list}>
                  {g.items.map((e) => (
                    <li key={e.id}>
                      <button
                        type="button"
                        className={styles.item}
                        onClick={() => setOpen({ id: e.id })}
                      >
                        <span className={styles.itemDate}>
                          {dayFormat.format(parseDate(e.date))}
                        </span>
                        <span className={styles.itemMain}>
                          <span className={styles.itemTop}>
                            {e.kind === 'reflection' && (
                              <span className={styles.kind}>
                                <Sparkles size={12} aria-hidden /> Reflection
                              </span>
                            )}
                            {refLabel(e.ref) && (
                              <span className={styles.itemRef}>{refLabel(e.ref)}</span>
                            )}
                          </span>
                          {e.title && <span className={styles.itemTitle}>{e.title}</span>}
                          <span className={styles.itemPreview}>{entryPreview(e)}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </>
      )}

      <EntrySheet target={open} onClose={() => setOpen(null)} />
    </div>
  );
}

function EntrySheet({
  target,
  onClose,
}: {
  target: { id: string; draft?: EntryDraft } | null;
  onClose: () => void;
}) {
  const saved = useEntry(target && !target.draft ? target.id : null);
  const entry: JournalEntryRecord | EntryDraft | null | undefined = target?.draft
    ? { ...target.draft, id: target.id }
    : saved;

  return (
    <Sheet
      open={Boolean(target)}
      onOpenChange={(o) => !o && onClose()}
      eyebrow={entry?.kind === 'reflection' ? 'Reflection' : 'Journal'}
      title={entry ? dayFormat.format(parseDate(entry.date)) : 'Entry'}
      description="Saved as you type."
      actions={
        entry &&
        !target?.draft && (
          <Tooltip content="Delete entry">
            <IconButton
              label="Delete entry"
              icon={<Trash2 size={16} />}
              size="sm"
              onClick={() =>
                void deleteEntry(entry.id).then((undo) => {
                  onClose();
                  toast({
                    title: 'Entry deleted',
                    action: { label: 'Undo', onClick: () => void undo() },
                  });
                })
              }
            />
          </Tooltip>
        )
      }
    >
      {entry && <EntryForm key={entry.id} entry={entry} />}
    </Sheet>
  );
}

/** The verse chooser plus the editor for one entry. */
function EntryForm({ entry }: { entry: JournalEntryRecord | EntryDraft }) {
  const [text, setText] = useState(() => refLabel(entry.ref) ?? '');
  const [verse, setVerse] = useState(entry.ref ?? '');
  const [error, setError] = useState<string | null>(null);

  const commit = () => {
    const t = text.trim();
    if (!t) {
      setVerse('');
      setError(null);
      return;
    }
    const r = parseRefDetailed(t);
    if (!r.ok) return setError(r.hint);
    setError(null);
    setVerse(toOsis(r.range));
    setText(formatRef(r.range));
  };

  return (
    <EntryEditor
      entry={entry}
      showTitle
      verse={verse}
      autoFocus={!entry.ref}
      bodyPlaceholder={
        entry.kind === 'reflection'
          ? 'What is God saying to you through this verse?'
          : 'What’s on your heart today?'
      }
      header={
        <div className={styles.verseField}>
          <Input
            label="Verse"
            placeholder="Choose a verse (optional) — e.g. Psalm 23:1"
            icon={<BookOpen size={16} />}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commit();
              }
            }}
            error={error ?? undefined}
          />
          {verse && <VersePreview osis={verse} />}
        </div>
      }
    />
  );
}

function VersePreview({ osis }: { osis: string }) {
  const translation = useReader((s) => s.translation);
  const open = useOpenInReader();
  const { passage } = usePassage(osis, translation);
  const range = fromOsis(osis);
  const text = passage?.verses
    .filter((v) => !v.missing)
    .map((v) => v.text)
    .join(' ');
  return (
    <blockquote className={cx(styles.quote)}>
      <span className={styles.quoteText}>{text ?? ' '}</span>
      <footer>
        {passage?.reference ?? (range ? formatRef(range) : '')} · {translation}
        {range && (
          <Button size="sm" variant="ghost" onClick={() => open(range)} className={styles.push}>
            Open in reader
          </Button>
        )}
      </footer>
    </blockquote>
  );
}
