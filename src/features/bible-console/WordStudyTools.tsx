// Word study for the class (Screen › Show the Bible): tap a word of the live passage to put it,
// with its Hebrew or Greek, on the TV; hide it to ask first, step through the words, and show
// another verse that uses it.
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, EyeOff, MonitorPlay } from 'lucide-react';
import { Button, IconButton, Tooltip } from '@/design-system/components';
import { BOOKS } from '@/features/bible/books';
import { formatRef } from '@/features/bible/ref';
import { showOnTv } from '@/features/bible-app/tvActions';
import {
  WORD_STUDY_CREDIT,
  WORD_STUDY_TRANSLATION,
  splitVerse,
  useBookWords,
  useWord,
  verseWords,
} from '@/features/bible-app/wordStudy';
import { fromVerseKey, strongLabel } from '@/features/bible-app/wordStudyCodes';
import { WordRuns } from '@/features/bible-app/WordStudyPanel';
import { useControl } from '@/features/present/live/controlStore';
import type { LiveWord } from '@/features/present/live/types';
import { usePassage } from '@/slides/usePassage';
import { overlayHas, parseVerse, showWord, useLastWord } from './wordOnTv';
import styles from './WordStudyTools.module.css';

export function WordStudyTools() {
  const overlay = useControl((s) => s.live.overlay)!;
  const word = useControl((s) => s.live.word ?? null);
  const last = useLastWord((s) => s.word);
  // Only a word from this passage comes back.
  const shown = word ?? (last && overlayHas(overlay.ref, last.verse) ? last : null);

  const { passage } = usePassage(overlay.ref, WORD_STUDY_TRANSLATION);
  const verses = useMemo(() => passage?.verses.filter((v) => !v.missing) ?? [], [passage]);
  const book = verses[0] ? parseVerse(verses[0].osis).book : null;
  const words = useBookWords(book);

  // Every studyable word of the passage, in reading order, for Previous and Next.
  const all = useMemo(
    () =>
      verses.flatMap((v) => {
        const at = parseVerse(v.osis);
        return verseWords(words, at.chapter, at.verse).map((s) => ({
          strong: s.strong,
          verse: v.osis,
          text: v.text.slice(s.start, s.start + s.length),
        }));
      }),
    [verses, words],
  );
  const index = shown
    ? all.findIndex((w) => w.verse === shown.verse && w.strong === shown.strong)
    : -1;

  const show = showWord;
  const hide = () => useControl.getState().dispatch({ type: 'hideWord' });
  const step = (dir: 1 | -1) => {
    const next = all[index < 0 ? (dir > 0 ? 0 : all.length - 1) : index + dir];
    if (next) show(next);
  };

  return (
    <section className={styles.section} aria-label="Word study">
      <div className={styles.head}>
        <h2 className={styles.title}>Words</h2>
        <span className={styles.hint}>
          {word ? 'On the TV now' : 'Tap a word to study it with the class'}
        </span>
      </div>

      <div className={styles.controls} role="group" aria-label="Word on the TV">
        <Tooltip content="Previous word">
          <IconButton
            label="Previous word"
            icon={<ChevronLeft size={16} />}
            size="sm"
            onClick={() => step(-1)}
            disabled={all.length === 0 || index === 0}
          />
        </Tooltip>
        {word ? (
          <Button size="sm" icon={<EyeOff size={14} />} onClick={hide} shortcut="W">
            Hide word
          </Button>
        ) : (
          <Button
            size="sm"
            icon={<Eye size={14} />}
            onClick={() => shown && show(shown)}
            disabled={!shown}
            shortcut="W"
          >
            Show word again
          </Button>
        )}
        <Tooltip content="Next word">
          <IconButton
            label="Next word"
            icon={<ChevronRight size={16} />}
            size="sm"
            onClick={() => step(1)}
            disabled={all.length === 0 || index === all.length - 1}
          />
        </Tooltip>
      </div>

      <div className={styles.verses}>
        {verses.map((v) => {
          const at = parseVerse(v.osis);
          return (
            <p key={v.osis} className={styles.verse}>
              <sup className={styles.num}>{at.verse}</sup>
              <WordRuns
                text={v.text}
                spans={verseWords(words, at.chapter, at.verse)}
                active={word && word.verse === v.osis ? word.strong : null}
                onPick={(strong) => {
                  const span = verseWords(words, at.chapter, at.verse).find(
                    (s) => s.strong === strong,
                  )!;
                  show({
                    strong,
                    verse: v.osis,
                    text: v.text.slice(span.start, span.start + span.length),
                  });
                }}
              />
            </p>
          );
        })}
        {overlay.translation !== WORD_STUDY_TRANSLATION && (
          <p className={styles.note}>
            Words from the Berean Standard Bible; the TV keeps {overlay.translation}.
          </p>
        )}
      </div>

      {shown && <Entry word={shown} translation={overlay.translation} />}
    </section>
  );
}

/** What the teacher sees about the word: enough to explain it, and other verses to show. */
function Entry({ word, translation }: { word: LiveWord; translation: string }) {
  const entry = useWord(word.strong);
  const [more, setMore] = useState(false);
  if (!entry)
    return (
      <p className={styles.note}>
        {entry === undefined ? 'Loading…' : 'Not available offline yet.'}
      </p>
    );
  const uses = entry.r.slice(0, more ? 30 : 6);
  return (
    <div className={styles.entry}>
      <p className={styles.lemma}>
        <span lang={word.strong >= 10000 ? 'grc' : 'he'}>{entry.w}</span>{' '}
        <em className={styles.translit}>{entry.t}</em>
      </p>
      <p className={styles.gloss}>{entry.g}</p>
      <p className={styles.meta}>
        {[word.strong >= 10000 ? 'Greek' : 'Hebrew', entry.p, strongLabel(word.strong)]
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
      <h3 className={styles.usesTitle}>Used in {entry.r.length} verses</h3>
      <ul className={styles.uses}>
        {uses.map((key) => {
          const { bookIndex, chapter, verse } = fromVerseKey(key);
          const at = { book: BOOKS[bookIndex]!.code, chapter, verse };
          const osis = `${at.book}.${chapter}.${verse}`;
          return (
            <li key={key} className={styles.use}>
              <span className={styles.useRef}>{formatRef({ start: at, end: at })}</span>
              <UseText osis={osis} strong={word.strong} />
              <Button
                size="sm"
                variant="ghost"
                icon={<MonitorPlay size={14} />}
                className={styles.useShow}
                aria-label={`Show ${formatRef({ start: at, end: at })} on screen`}
                onClick={() => void showOnTv(osis, translation)}
              >
                Show
              </Button>
            </li>
          );
        })}
      </ul>
      {entry.r.length > uses.length && !more && (
        <Button size="sm" variant="ghost" onClick={() => setMore(true)}>
          Show more
        </Button>
      )}
      <p className={styles.credit}>{WORD_STUDY_CREDIT}</p>
    </div>
  );
}

function UseText({ osis, strong }: { osis: string; strong: number }) {
  const { passage } = usePassage(osis, WORD_STUDY_TRANSLATION);
  const at = parseVerse(osis);
  const words = useBookWords(at.book);
  const text = passage?.verses[0]?.text;
  if (!text) return <span className={styles.useText}>…</span>;
  const spans = verseWords(words, at.chapter, at.verse).filter((s) => s.strong === strong);
  return (
    <span className={styles.useText}>
      {splitVerse(text, spans).map((run, i) =>
        'word' in run ? <mark key={i}>{run.text}</mark> : run.text,
      )}
    </span>
  );
}
