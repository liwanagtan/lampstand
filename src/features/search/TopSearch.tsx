import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  CalendarCheck,
  Heart,
  NotebookPen,
  Search,
  Sparkles,
  StickyNote,
} from 'lucide-react';
import { Kbd, cx } from '@/design-system/components';
import { paths } from '@/app/paths';
import type { MarkRecord } from '@/db/types';
import { formatRef, fromOsis, type RefRange } from '@/features/bible/ref';
import { highlightRuns } from '@/features/bible/searchCore';
import { snippetRuns } from './snippet';
import { planMeta } from '@/features/bible-app/discover';
import { entryPreview } from '@/features/bible-app/journal';
import { EntrySheet } from '@/features/bible-app/JournalEntrySheet';
import { isEntryItem } from '@/features/bible-app/journalTimeline';
import { NoteDialog } from '@/features/bible-app/NoteDialog';
import { useReader } from '@/features/bible-app/readerStore';
import { useOpenInReader } from '@/features/bible-app/useOpenInReader';
import { RefText } from './RefText';
import styles from './TopSearch.module.css';
import { useUniversalSearch } from './useUniversalSearch';

const LIMIT = { verses: 4, plans: 3, journey: 3 };

interface Item {
  key: string;
  group: string;
  /** Shown once, beside the group's heading. */
  icon: ReactNode;
  /** Only where one group mixes kinds (your journey), and on "See all". */
  rowIcon?: ReactNode;
  title: string;
  detail?: ReactNode;
  go: () => void;
}

/**
 * Laptops: search in the top bar. Results drop down as you type — a passage, your journey,
 * plans, verses — with "See all" for the Search page. `/` jumps here from anywhere.
 */
export function TopSearch() {
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const openInReader = useOpenInReader();
  const [entry, setEntry] = useState<{ id: string } | null>(null);
  const [note, setNote] = useState<{ range: RefRange; note: MarkRecord | null } | null>(null);
  const { text, translation, parsed, verses, planHits, journey, topics, nothing } =
    useUniversalSearch(value, LIMIT);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, [contenteditable="true"]')) return;
      e.preventDefault();
      input.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const items: Item[] = [];
  if (parsed?.ok) {
    items.push({
      key: 'ref',
      group: 'Passage',
      icon: <BookOpen size={15} />,
      title: formatRef(parsed.range),
      detail: parsed.translation ? `Open in ${parsed.translation}` : 'Open in the Bible',
      go: () => {
        if (parsed.translation) useReader.getState().setTranslation(parsed.translation);
        openInReader(parsed.range);
      },
    });
  }
  // Verses for a feeling or topic people search for (OpenBible.info, CC BY 4.0).
  for (const topic of topics) {
    for (const osis of topic.refs.slice(0, 3)) {
      const r = fromOsis(osis);
      if (!r) continue;
      items.push({
        key: `${topic.label}-${osis}`,
        group: `Verses for ${topic.label.toLowerCase()}`,
        icon: <Heart size={15} />,
        title: formatRef(r),
        detail: <RefText osis={osis} translation={translation} />,
        go: () => openInReader(r),
      });
    }
  }
  for (const i of journey) {
    if (isEntryItem(i)) {
      const ref = i.entry.ref ? fromOsis(i.entry.ref) : null;
      items.push({
        key: i.key,
        group: 'Your journey',
        icon: <NotebookPen size={15} />,
        rowIcon: i.kind === 'reflection' ? <Sparkles size={15} /> : <NotebookPen size={15} />,
        title: i.entry.title || (ref ? formatRef(ref) : 'Journal entry'),
        detail: entryPreview(i.entry),
        go: () => setEntry({ id: i.entry.id }),
      });
    } else {
      const m = i.mark;
      items.push({
        key: i.key,
        group: 'Your journey',
        icon: <NotebookPen size={15} />,
        rowIcon: <StickyNote size={15} />,
        title: `${i.kind === 'note' ? 'Note' : i.kind === 'highlight' ? 'Highlight' : 'Bookmark'} · ${formatRef(m.range)}`,
        detail: m.note?.text,
        go: () => (m.note ? setNote({ range: m.range, note: m.note }) : openInReader(m.range)),
      });
    }
  }
  for (const p of planHits) {
    items.push({
      key: p.id,
      group: 'Plans',
      icon: <CalendarCheck size={15} />,
      title: p.name,
      detail: planMeta(p),
      go: () => navigate(paths.planPage(p.id)),
    });
  }
  for (const h of verses) {
    const r = fromOsis(h.osis);
    if (!r) continue;
    items.push({
      key: h.osis,
      group: `Bible · ${translation}`,
      icon: <BookOpen size={15} />,
      title: formatRef(r),
      detail: snippetRuns(highlightRuns(h.text, h.terms)).map((run, n) =>
        run.hit ? <mark key={n}>{run.text}</mark> : <span key={n}>{run.text}</span>,
      ),
      go: () => openInReader(r),
    });
  }
  const seeAll: Item | null =
    text.length >= 2
      ? {
          key: 'all',
          group: '',
          icon: null,
          rowIcon: <ArrowRight size={15} />,
          title: `See all results for “${text}”`,
          go: () => navigate(`${paths.search}?q=${encodeURIComponent(text)}`),
        }
      : null;
  const all = seeAll ? [...items, seeAll] : items;

  const pick = (i: number) => {
    const it = all[i];
    if (!it) return;
    it.go();
    setValue('');
    setOpen(false);
    input.current?.blur();
  };

  return (
    <div className={styles.root}>
      <label className={styles.box}>
        <Search size={16} aria-hidden />
        <input
          ref={input}
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-label="Search Lampstand"
          aria-expanded={open && Boolean(text)}
          aria-controls="top-search-results"
          placeholder="Search verses, plans, your journey"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, all.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              pick(active);
            } else if (e.key === 'Escape') {
              setValue('');
              input.current?.blur();
            }
            e.stopPropagation();
          }}
        />
        {!value && <Kbd>/</Kbd>}
      </label>
      {open && text && (
        <ul
          id="top-search-results"
          className={styles.results}
          role="listbox"
          aria-label="Search results"
        >
          {parsed &&
            !parsed.ok &&
            parsed.problem !== 'unrecognized' &&
            parsed.problem !== 'empty' && <li className={styles.hint}>{parsed.hint}</li>}
          {all.map((it, i) => (
            <li key={it.key} role="presentation">
              {it.group && it.group !== all[i - 1]?.group && (
                <p className={styles.group}>
                  <span className={styles.groupIcon} aria-hidden>
                    {it.icon}
                  </span>
                  {it.group}
                </p>
              )}
              <button
                type="button"
                role="option"
                aria-selected={i === active}
                className={cx(
                  styles.item,
                  i === active && styles.active,
                  it.key === 'all' && styles.all,
                )}
                onMouseDown={(e) => e.preventDefault()}
                // Only a mouse that moves picks a row; results appearing under a still pointer don't.
                onMouseMove={() => active !== i && setActive(i)}
                onClick={() => pick(i)}
              >
                {it.rowIcon && (
                  <span className={styles.icon} aria-hidden>
                    {it.rowIcon}
                  </span>
                )}
                <span className={styles.text}>
                  <span className={styles.title}>{it.title}</span>
                  {it.detail && <span className={styles.detail}>{it.detail}</span>}
                </span>
              </button>
            </li>
          ))}
          {nothing && <li className={styles.hint}>Nothing found yet. Try another word.</li>}
        </ul>
      )}
      <EntrySheet target={entry} onClose={() => setEntry(null)} />
      <NoteDialog target={note} onClose={() => setNote(null)} />
    </div>
  );
}
