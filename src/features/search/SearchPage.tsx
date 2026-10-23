import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  BookOpen,
  CalendarCheck,
  Heart,
  NotebookPen,
  Search,
  Sparkles,
  StickyNote,
} from 'lucide-react';
import { Input } from '@/design-system/components';
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
import styles from './SearchPage.module.css';
import { useUniversalSearch } from './useUniversalSearch';

const TRY = ['John 3:16', 'peace', 'anxiety', 'Psalm 23'];
const LIMIT = { verses: 12, plans: 6, journey: 8 };

/** One box over the Bible, plans and your own journey (docs/PRD-ADDENDUM-GROW.md, M21). */
export function SearchPage() {
  const [params] = useSearchParams();
  const [filter, setFilter] = useState('all');
  const q = params.get('q') ?? '';
  const [value, setValue] = useState(q);
  // A new search from the top bar (See all results) replaces what's in the box.
  const [shownQ, setShownQ] = useState(q);
  if (q !== shownQ) {
    setShownQ(q);
    setValue(q);
  }
  const openInReader = useOpenInReader();
  const [entry, setEntry] = useState<{ id: string } | null>(null);
  const [note, setNote] = useState<{ range: RefRange; note: MarkRecord | null } | null>(null);
  const { text, translation, parsed, verses, planHits, journey, topics, nothing } =
    useUniversalSearch(value, LIMIT);

  return (
    <div className={styles.page} data-enter>
      <h1 className={styles.pageTitle}>Search</h1>
      <Input
        label="Search"
        hideLabel
        autoFocus
        type="search"
        placeholder="Search verses, plans and your journey"
        icon={<Search size={18} />}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={styles.box}
      />

      {text && (
        <div className={styles.filters} role="group" aria-label="Search results filter">
          {[
            ['all', 'All'],
            ['topics', 'Topics'],
            ['plans', 'Plans'],
            ['bible', 'Bible'],
            ['mine', 'Saved'],
          ].map(([id, label]) => (
            <button key={id} aria-pressed={filter === id} onClick={() => setFilter(id!)}>
              {label}
            </button>
          ))}
        </div>
      )}
      {!text && (
        <div className={styles.try}>
          <p className={styles.muted}>
            Find Bible passages, reading plans, reflections and saved verses.
          </p>
          <h2 className={styles.tryTitle}>Try</h2>
          <div className={styles.chips}>
            {TRY.map((t) => (
              <button key={t} type="button" className={styles.chip} onClick={() => setValue(t)}>
                <span className={styles.suggestionIcon} aria-hidden>
                  {/\d/.test(t) ? <BookOpen size={20} /> : <Heart size={20} />}
                </span>
                {t}
                <span className={styles.suggestionKind}>
                  {/\d/.test(t) ? 'Passage' : 'Feeling'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {(filter === 'all' || filter === 'bible') && parsed?.ok && (
        <Group title="Passage" icon={<BookOpen size={16} />}>
          <ResultButton
            title={formatRef(parsed.range)}
            detail={parsed.translation ? `Open in ${parsed.translation}` : 'Open in the Bible'}
            onClick={() => {
              if (parsed.translation) useReader.getState().setTranslation(parsed.translation);
              openInReader(parsed.range);
            }}
          />
        </Group>
      )}
      {!parsed?.ok && parsed && parsed.problem !== 'unrecognized' && parsed.problem !== 'empty' && (
        <p className={styles.muted}>{parsed.hint}</p>
      )}

      {(filter === 'all' || filter === 'topics') &&
        topics.map((topic) => (
          <Group
            key={topic.label}
            title={`Verses for ${topic.label.toLowerCase()}`}
            icon={<Heart size={16} />}
          >
            {topic.refs.map((osis) => {
              const r = fromOsis(osis);
              if (!r) return null;
              return (
                <ResultButton
                  key={osis}
                  title={formatRef(r)}
                  detail={<RefText osis={osis} translation={translation} />}
                  onClick={() => openInReader(r)}
                />
              );
            })}
          </Group>
        ))}

      {(filter === 'all' || filter === 'mine') && journey.length > 0 && (
        <Group title="Saved reflections and verses" icon={<NotebookPen size={16} />}>
          {journey.map((i) =>
            isEntryItem(i) ? (
              <ResultButton
                key={i.key}
                icon={i.kind === 'reflection' ? <Sparkles size={16} /> : <NotebookPen size={16} />}
                title={
                  i.entry.title ||
                  refName(i.entry.ref) ||
                  (i.kind === 'reflection' ? 'Reflection' : 'Journal entry')
                }
                detail={entryPreview(i.entry)}
                onClick={() => setEntry({ id: i.entry.id })}
              />
            ) : (
              <ResultButton
                key={i.key}
                icon={<StickyNote size={16} />}
                title={`${kindName(i.kind)} · ${formatRef(i.mark.range)}`}
                detail={i.mark.note?.text}
                onClick={() =>
                  i.mark.note
                    ? setNote({ range: i.mark.range, note: i.mark.note })
                    : openInReader(i.mark.range)
                }
              />
            ),
          )}
        </Group>
      )}

      {(filter === 'all' || filter === 'plans') && planHits.length > 0 && (
        <Group title="Plans" icon={<CalendarCheck size={16} />}>
          {planHits.map((p) => (
            <li key={p.id}>
              <Link to={paths.planPage(p.id)} className={styles.result}>
                <span className={styles.text}>
                  <span className={styles.title}>{p.name}</span>
                  <span className={styles.detail}>{planMeta(p)}</span>
                </span>
              </Link>
            </li>
          ))}
        </Group>
      )}

      {(filter === 'all' || filter === 'bible') && verses.length > 0 && (
        <Group title={`Bible · ${translation}`} icon={<BookOpen size={16} />}>
          {verses.map((h) => {
            const r = fromOsis(h.osis);
            if (!r) return null;
            return (
              <ResultButton
                key={h.osis}
                title={formatRef(r)}
                detail={snippetRuns(highlightRuns(h.text, h.terms)).map((run, n) =>
                  run.hit ? <mark key={n}>{run.text}</mark> : <span key={n}>{run.text}</span>,
                )}
                onClick={() => openInReader(r)}
              />
            );
          })}
        </Group>
      )}

      {nothing && <p className={styles.muted}>Nothing found for “{text}”. Try another word.</p>}

      {!text && (
        <p className={styles.privacy}>
          Your journal, notes and highlights are searched on this device only.
        </p>
      )}

      <EntrySheet target={entry} onClose={() => setEntry(null)} />
      <NoteDialog target={note} onClose={() => setNote(null)} />
    </div>
  );
}

/** A section of results; its icon says what kind they are, so rows need none of their own. */
function Group({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.group} aria-label={title}>
      <h2 className={styles.groupTitle}>
        <span className={styles.groupIcon} aria-hidden>
          {icon}
        </span>
        {title}
      </h2>
      <ul className={styles.list}>{children}</ul>
    </section>
  );
}

function ResultButton({
  icon,
  title,
  detail,
  onClick,
}: {
  /** Only where one section mixes kinds (your saved reflections, notes and marks). */
  icon?: React.ReactNode;
  title: string;
  detail?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <li>
      <button type="button" className={styles.result} onClick={onClick}>
        {icon && (
          <span className={styles.icon} aria-hidden>
            {icon}
          </span>
        )}
        <span className={styles.text}>
          <span className={styles.title}>{title}</span>
          {detail && <span className={styles.detail}>{detail}</span>}
        </span>
      </button>
    </li>
  );
}

const refName = (ref?: string) => {
  const r = ref ? fromOsis(ref) : null;
  return r ? formatRef(r) : null;
};
const kindName = (k: 'note' | 'highlight' | 'bookmark') =>
  k === 'note' ? 'Note' : k === 'highlight' ? 'Highlight' : 'Bookmark';
