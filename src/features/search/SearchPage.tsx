import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, CalendarCheck, NotebookPen, Search, Sparkles, StickyNote } from 'lucide-react';
import { Input } from '@/design-system/components';
import { paths } from '@/app/paths';
import type { MarkRecord } from '@/db/types';
import { getTranslation, useBible } from '@/features/bible/bibleStore';
import { formatRef, fromOsis, parseRefDetailed, type RefRange } from '@/features/bible/ref';
import { searchVerses } from '@/features/bible/search';
import { highlightRuns, type SearchHit } from '@/features/bible/searchCore';
import { verseCountsFor } from '@/features/bible/versification';
import { planMeta, searchPlans } from '@/features/bible-app/discover';
import { entryPreview, useEntries } from '@/features/bible-app/journal';
import { EntrySheet } from '@/features/bible-app/JournalEntrySheet';
import { buildTimeline, isEntryItem, searchTimeline } from '@/features/bible-app/journalTimeline';
import { useAllMarks } from '@/features/bible-app/marks';
import { NoteDialog } from '@/features/bible-app/NoteDialog';
import { usePlans } from '@/features/bible-app/plans';
import { useReader } from '@/features/bible-app/readerStore';
import { useOpenInReader } from '@/features/bible-app/useOpenInReader';
import { useSettings } from '@/features/settings/settingsStore';
import styles from './SearchPage.module.css';

const TRY = ['John 3:16', 'peace', 'anxiety', 'Psalm 23'];
const LIMIT = { verses: 12, plans: 6, journey: 8 };

/** One box over the Bible, plans and your own journey (docs/PRD-ADDENDUM-GROW.md, M21). */
export function SearchPage() {
  const [value, setValue] = useState('');
  const text = value.trim();
  const translation = useReader((s) => s.translation);
  const codes = useBible((s) => s.translations.map((t) => t.code).join(','));
  const features = useSettings((s) => s.features);
  const plans = usePlans();
  const entries = useEntries();
  const marks = useAllMarks();
  const openInReader = useOpenInReader();
  const [hits, setHits] = useState<{ q: string; hits: SearchHit[] } | null>(null);
  const [entry, setEntry] = useState<{ id: string } | null>(null);
  const [note, setNote] = useState<{ range: RefRange; note: MarkRecord | null } | null>(null);

  const parsed = useMemo(() => {
    if (!text) return null;
    return parseRefDetailed(text, {
      knownTranslations: codes.split(','),
      verseCounts: verseCountsFor(getTranslation(translation)),
    });
  }, [text, codes, translation]);
  const isRef = Boolean(parsed?.ok);
  const wordQuery = text.length >= 3 && !isRef ? text.replace(/["“”‘’]/g, '') : '';

  useEffect(() => {
    if (!wordQuery) return;
    let alive = true;
    const id = setTimeout(() => {
      void searchVerses(translation, wordQuery, LIMIT.verses).then(
        (h) => alive && setHits({ q: wordQuery, hits: h }),
      );
    }, 120);
    return () => {
      alive = false;
      clearTimeout(id);
    };
  }, [wordQuery, translation]);

  const verses = wordQuery && hits?.q === wordQuery ? hits.hits : [];
  const planHits =
    features.plans && text.length >= 2
      ? searchPlans(plans ?? [], text, 'all').slice(0, LIMIT.plans)
      : [];
  const timeline = useMemo(
    () => buildTimeline(entries ?? [], features.marks ? (marks ?? []) : []),
    [entries, marks, features.marks],
  );
  const journey = text.length >= 2 ? searchTimeline(timeline, text).slice(0, LIMIT.journey) : [];
  const nothing =
    text.length >= 3 &&
    !isRef &&
    hits?.q === wordQuery &&
    verses.length === 0 &&
    planHits.length === 0 &&
    journey.length === 0;

  return (
    <div className={styles.page} data-enter>
      <h1 className="visually-hidden">Search</h1>
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

      {!text && (
        <div className={styles.try}>
          <p className={styles.muted}>
            Try a reference, a word, a feeling, or something you wrote.
          </p>
          <div className={styles.chips}>
            {TRY.map((t) => (
              <button key={t} type="button" className={styles.chip} onClick={() => setValue(t)}>
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {parsed?.ok && (
        <Group title="Passage">
          <ResultButton
            icon={<BookOpen size={16} />}
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

      {journey.length > 0 && (
        <Group title="Your journey">
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

      {planHits.length > 0 && (
        <Group title="Plans">
          {planHits.map((p) => (
            <li key={p.id}>
              <Link to={paths.planPage(p.id)} className={styles.result}>
                <span className={styles.icon} aria-hidden>
                  <CalendarCheck size={16} />
                </span>
                <span className={styles.text}>
                  <span className={styles.title}>{p.name}</span>
                  <span className={styles.detail}>{planMeta(p)}</span>
                </span>
              </Link>
            </li>
          ))}
        </Group>
      )}

      {verses.length > 0 && (
        <Group title={`Bible · ${translation}`}>
          {verses.map((h) => {
            const r = fromOsis(h.osis);
            if (!r) return null;
            return (
              <ResultButton
                key={h.osis}
                icon={<BookOpen size={16} />}
                title={formatRef(r)}
                detail={highlightRuns(h.text, h.terms).map((run, n) =>
                  run.hit ? <mark key={n}>{run.text}</mark> : <span key={n}>{run.text}</span>,
                )}
                onClick={() => openInReader(r)}
              />
            );
          })}
        </Group>
      )}

      {nothing && <p className={styles.muted}>Nothing found for “{text}”. Try another word.</p>}

      <EntrySheet target={entry} onClose={() => setEntry(null)} />
      <NoteDialog target={note} onClose={() => setNote(null)} />
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={styles.group} aria-label={title}>
      <h2 className={styles.groupTitle}>{title}</h2>
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
  icon: React.ReactNode;
  title: string;
  detail?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <li>
      <button type="button" className={styles.result} onClick={onClick}>
        <span className={styles.icon} aria-hidden>
          {icon}
        </span>
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
