import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import { Button, IconButton, cx } from '@/design-system/components';
import { db } from '@/db/db';
import { getTranslation } from '@/features/bible/bibleStore';
import { BOOKS } from '@/features/bible/books';
import { getPassage } from '@/features/bible/passage';
import { formatRef } from '@/features/bible/ref';
import { useOpenInReader } from './useOpenInReader';
import {
  WORD_STUDY_CREDIT,
  WORD_STUDY_TRANSLATION,
  splitVerse,
  useBookWords,
  useWord,
  verseWords,
  type WordSpan,
} from './wordStudy';
import { fromVerseKey, strongLabel } from './wordStudyCodes';
import styles from './WordStudyPanel.module.css';

interface VerseAt {
  book: string;
  chapter: number;
  verse: number;
}

const refOf = (v: VerseAt) => formatRef({ start: v, end: v });

/** First shown, then this many more each time: a long list stays readable (Miller's law). */
const USES_STEP = 5;

/**
 * Word study for one verse: tap an underlined word (in the reader, or in the verse shown here) to
 * see the Hebrew or Greek behind it, what it means, and where else the Bible uses it. Not a
 * dialog: the reader stays live above or beside it, so words in the text can still be tapped.
 */
export function WordStudyPanel({
  verse,
  translation,
  strong,
  onPick,
  onClose,
  docked,
}: {
  verse: VerseAt;
  /** The reader's translation: other than the BSB, the verse is shown here in the BSB. */
  translation: string;
  strong: number | null;
  onPick: (strong: number | null) => void;
  onClose: () => void;
  /** Phones: docked at the bottom of the reader. Laptops: the side column. */
  docked: boolean;
}) {
  const openInReader = useOpenInReader();
  // Verses opened from "Used in", so Back returns to where you were.
  const [trail, setTrail] = useState<{ at: VerseAt; strong: number | null }[]>([]);
  const shown = trail.length ? trail[trail.length - 1]!.at : verse;
  const inText = translation === WORD_STUDY_TRANSLATION && trail.length === 0;
  const entry = useWord(strong);
  const body = useRef<HTMLDivElement>(null);
  // How many verses of "Used in" are shown, for this word in this verse.
  const usesKey = `${strong}|${shown.book}.${shown.chapter}.${shown.verse}`;
  const [shownUses, setShownUses] = useState({ key: usesKey, n: USES_STEP });
  const uses = shownUses.key === usesKey ? shownUses.n : USES_STEP;

  useEffect(() => {
    body.current?.scrollTo?.({ top: 0 });
  }, [usesKey]);

  // The entry stays open: the word is underlined and highlighted in the verse you opened.
  const open = (at: VerseAt) => setTrail((t) => [...t, { at, strong }].slice(-20));
  const back = () => {
    const previous = trail[trail.length - 1];
    setTrail((t) => t.slice(0, -1));
    if (previous) onPick(previous.strong);
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    e.stopPropagation();
    if (trail.length) back();
    else onClose();
  };

  return (
    <aside
      className={cx(styles.panel, docked && styles.docked)}
      aria-label="Word study"
      onKeyDown={onKeyDown}
    >
      <header className={styles.header}>
        {trail.length > 0 ? (
          <Button variant="ghost" size="sm" icon={<ArrowLeft size={16} />} onClick={back}>
            Back to {refOf(trail.length > 1 ? trail[trail.length - 2]!.at : verse)}
          </Button>
        ) : (
          <div>
            <p className={styles.eyebrow}>Word study</p>
            <h2 className={styles.title}>{refOf(verse)}</h2>
          </div>
        )}
        <IconButton label="Close word study" icon={<X size={18} />} onClick={onClose} />
      </header>
      <div className={styles.body} ref={body}>
        {!inText && (
          <section className={styles.verseBox} aria-label={refOf(shown)}>
            {trail.length > 0 && <h2 className={styles.title}>{refOf(shown)}</h2>}
            <StudyVerse at={shown} strong={strong} onPick={onPick} />
            {trail.length > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onClose();
                  openInReader({ start: shown, end: shown });
                }}
              >
                Read {refOf(shown)} in the Bible
              </Button>
            ) : (
              <p className={styles.note}>Words from the Berean Standard Bible.</p>
            )}
          </section>
        )}
        {strong === null ? (
          <p className={styles.hint}>
            {inText ? 'Tap an underlined word in the verse.' : 'Tap an underlined word.'}
          </p>
        ) : entry === undefined ? (
          <p className={styles.hint} aria-busy="true">
            Loading…
          </p>
        ) : entry === null ? (
          <p className={styles.hint}>Word study is available when you’re back online.</p>
        ) : (
          <article className={styles.entry} aria-live="polite">
            <p className={styles.original}>
              <span
                lang={strong >= 10000 ? 'grc' : 'he'}
                dir={strong >= 10000 ? 'ltr' : 'rtl'}
                className={styles.lemma}
              >
                {entry.w}
              </span>
              <span className={styles.translit}>{entry.t}</span>
            </p>
            <h3 className={styles.gloss}>{entry.g}</h3>
            <p className={styles.meta}>
              {[strong >= 10000 ? 'Greek' : 'Hebrew', entry.p, strongLabel(strong)]
                .filter(Boolean)
                .join(' · ')}
            </p>
            {entry.m.length > 0 && (
              <ul className={styles.meanings}>
                {entry.m.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            )}
            <h3 className={styles.usesTitle}>
              Used in {entry.r.length} {entry.r.length === 1 ? 'verse' : 'verses'}
            </h3>
            <ol className={styles.uses}>
              {entry.r.slice(0, uses).map((key) => {
                const { bookIndex, chapter, verse: v } = fromVerseKey(key);
                const at = { book: BOOKS[bookIndex]!.code, chapter, verse: v };
                const here =
                  at.book === shown.book &&
                  at.chapter === shown.chapter &&
                  at.verse === shown.verse;
                return (
                  <li key={key}>
                    <button
                      type="button"
                      className={styles.use}
                      aria-current={here || undefined}
                      onClick={() => !here && open(at)}
                    >
                      <span className={styles.useRef}>{refOf(at)}</span>
                      <UseText at={at} strong={strong} />
                    </button>
                  </li>
                );
              })}
            </ol>
            {entry.r.length > uses && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShownUses({ key: usesKey, n: uses + USES_STEP * 2 })}
              >
                Show more ({entry.r.length - uses} left)
              </Button>
            )}
          </article>
        )}
        <p className={styles.credit}>{WORD_STUDY_CREDIT}</p>
      </div>
    </aside>
  );
}

/** One verse of the BSB, by reference: undefined while loading. */
function useVerseText(at: VerseAt): string | null | undefined {
  const key = `${at.book}.${at.chapter}.${at.verse}`;
  const [state, setState] = useState<{ key: string; text: string | null } | null>(null);
  useEffect(() => {
    const t = getTranslation(WORD_STUDY_TRANSLATION);
    if (!t) return;
    let alive = true;
    void getPassage(db, t, { start: at, end: at })
      .then((p) => {
        const v = p.verses[0];
        if (alive) setState({ key, text: v && !v.missing ? v.text : null });
      })
      .catch(() => alive && setState({ key, text: null }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state?.key === key ? state.text : undefined;
}

/** A BSB verse with its studyable words underlined (the panel's own copy of the text). */
function StudyVerse({
  at,
  strong,
  onPick,
}: {
  at: VerseAt;
  strong: number | null;
  onPick: (strong: number) => void;
}) {
  const text = useVerseText(at);
  const words = useBookWords(at.book);
  if (text === undefined) return <p className={styles.hint}>Loading…</p>;
  if (text === null) return <p className={styles.hint}>This verse isn’t available.</p>;
  return (
    <p className={styles.verse}>
      <WordRuns
        text={text}
        spans={verseWords(words, at.chapter, at.verse)}
        active={strong}
        onPick={onPick}
      />
    </p>
  );
}

/** A verse from "Used in", with the word picked out. */
function UseText({ at, strong }: { at: VerseAt; strong: number }) {
  const text = useVerseText(at);
  const words = useBookWords(at.book);
  if (!text) return <span className={styles.useText}>{text === null ? '' : '…'}</span>;
  const spans = verseWords(words, at.chapter, at.verse).filter((s) => s.strong === strong);
  return (
    <span className={styles.useText}>
      {splitVerse(text, spans).map((run, i) =>
        'word' in run ? (
          <mark key={i} className={styles.useMark}>
            {run.text}
          </mark>
        ) : (
          run.text
        ),
      )}
    </span>
  );
}

/**
 * A verse's text with its studyable words as buttons: dotted underlines, the chosen word
 * highlighted. Used by the reader (in place of the selected verse) and by the panel.
 */
export function WordRuns({
  text,
  spans,
  active,
  onPick,
}: {
  text: string;
  spans: WordSpan[];
  active: number | null;
  onPick: (strong: number) => void;
}) {
  return (
    <>
      {splitVerse(text, spans).map((run, i) =>
        'word' in run ? (
          <span
            key={i}
            role="button"
            tabIndex={0}
            className={styles.word}
            data-word-active={run.word.strong === active || undefined}
            aria-pressed={run.word.strong === active}
            onClick={(e) => {
              e.stopPropagation();
              onPick(run.word.strong);
            }}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' && e.key !== ' ') return;
              e.preventDefault();
              e.stopPropagation();
              onPick(run.word.strong);
            }}
          >
            {run.text}
          </span>
        ) : (
          <span key={i}>{run.text}</span>
        ),
      )}
    </>
  );
}
