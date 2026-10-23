// The Words column of Show the Bible, opened from Live's header: choose a word of the passage on
// the TV, see its word card in a preview, then Show on screen. Like Preview and Live: nothing
// reaches the TV until it is sent.
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, EyeOff, MonitorPlay, X } from 'lucide-react';
import { Button, IconButton, Tooltip, cx } from '@/design-system/components';
import { BOOKS } from '@/features/bible/books';
import { formatRef, fromOsis } from '@/features/bible/ref';
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
import { LiveScreen } from '@/features/present/LiveScreen';
import { useControl } from '@/features/present/live/controlStore';
import type { LiveSnapshot, LiveWord } from '@/features/present/live/types';
import frame from '@/features/present/PresentPage.module.css';
import { usePassage } from '@/slides/usePassage';
import { overlayHas, parseVerse, showWord, stageWord, useStagedWord } from './wordOnTv';
import styles from './WordsColumn.module.css';

const same = (a: LiveWord | null | undefined, b: LiveWord | null | undefined) =>
  Boolean(a && b && a.verse === b.verse && a.strong === b.strong);

export function WordsColumn({
  snapshot,
  onClose,
}: {
  snapshot: LiveSnapshot;
  onClose: () => void;
}) {
  const overlay = snapshot.live.overlay;
  return (
    <section className={cx(frame.pane, frame.stack, styles.column)} aria-label="Words">
      <div className={frame.paneHead}>
        <h2 className={frame.paneTitle}>Words</h2>
        <IconButton label="Close words" icon={<X size={16} />} size="sm" onClick={onClose} />
      </div>
      {!overlay ? (
        <p className={styles.hint}>
          Show a passage on the TV, then choose a word here to study it with the class.
        </p>
      ) : overlay.translation !== WORD_STUDY_TRANSLATION ? (
        // Word links follow the BSB's wording: offer to show the passage in it.
        <div className={styles.offer}>
          <p>
            Word study follows the Berean Standard Bible’s wording. The TV is showing{' '}
            {overlay.translation}.
          </p>
          <Button
            size="sm"
            variant="primary"
            onClick={() =>
              useControl
                .getState()
                .dispatch({ type: 'overlayTranslation', translation: WORD_STUDY_TRANSLATION })
            }
          >
            Show {formatRef(fromOsis(overlay.ref)!)} in BSB
          </Button>
        </div>
      ) : (
        <PassageWords key={overlay.ref} snapshot={snapshot} ref_={overlay.ref} />
      )}
    </section>
  );
}

function PassageWords({ snapshot, ref_ }: { snapshot: LiveSnapshot; ref_: string }) {
  const live = snapshot.live;
  const onTv = live.word ?? null;
  const stagedWord = useStagedWord((s) => s.word);
  const staged = stagedWord && overlayHas(ref_, stagedWord.verse) ? stagedWord : null;
  const frozen = useControl((s) => s.frozen);

  const { passage } = usePassage(ref_, WORD_STUDY_TRANSLATION);
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
  const index = staged ? all.findIndex((w) => same(w, staged)) : -1;
  const step = (dir: 1 | -1) => {
    const next = all[index < 0 ? (dir > 0 ? 0 : all.length - 1) : index + dir];
    if (next) stageWord(next);
  };
  const showing = same(onTv, staged);

  return (
    <>
      <div className={cx(frame.paneBody, styles.preview)} data-pane="word-preview">
        {staged ? (
          <LiveScreen
            key={`${staged.verse}|${staged.strong}`}
            snapshot={{ ...snapshot, live: { ...live, screen: 'content', word: staged } }}
            label={`Word preview: ${staged.text}`}
          />
        ) : (
          // What the column is for, until a word is chosen.
          <div className={styles.intro}>
            <strong>Teach the meaning behind a word.</strong>
            <span>
              Underlined words have a Hebrew or Greek entry. Click one on Live to put it beside the
              verse on the TV straight away, or choose one below to preview it here first, then Show
              on screen (W).
            </span>
          </div>
        )}
      </div>
      <div className={frame.sendRow}>
        <Tooltip content="Previous word">
          <IconButton
            label="Previous word"
            icon={<ChevronLeft size={18} />}
            onClick={() => step(-1)}
            disabled={all.length === 0 || index === 0}
          />
        </Tooltip>
        {showing ? (
          <Button
            variant="secondary"
            icon={<EyeOff size={16} />}
            shortcut="W"
            className={frame.sendButton}
            onClick={() => useControl.getState().dispatch({ type: 'hideWord' })}
          >
            Take off screen
          </Button>
        ) : (
          <Button
            variant="primary"
            icon={<MonitorPlay size={16} />}
            shortcut="W"
            className={frame.sendButton}
            onClick={() => staged && showWord(staged)}
            disabled={!staged || Boolean(frozen)}
          >
            Show on screen
          </Button>
        )}
        <Tooltip content="Next word">
          <IconButton
            label="Next word"
            icon={<ChevronRight size={18} />}
            onClick={() => step(1)}
            disabled={all.length === 0 || index === all.length - 1}
          />
        </Tooltip>
      </div>

      <div className={styles.body}>
        <div className={styles.verses} role="group" aria-label="Words in the passage">
          {verses.map((v) => {
            const at = parseVerse(v.osis);
            const spans = verseWords(words, at.chapter, at.verse);
            return (
              <p key={v.osis} className={styles.verse}>
                <sup className={styles.num}>{at.verse}</sup>
                <WordRuns
                  text={v.text}
                  spans={spans}
                  active={staged && staged.verse === v.osis ? staged.strong : null}
                  onPick={(strong) => {
                    const span = spans.find((s) => s.strong === strong)!;
                    stageWord({
                      strong,
                      verse: v.osis,
                      text: v.text.slice(span.start, span.start + span.length),
                    });
                  }}
                />
              </p>
            );
          })}
        </div>
        {staged && <Entry word={staged} />}
      </div>
    </>
  );
}

/** What the teacher sees about the word: enough to explain it, and other verses to show. */
function Entry({ word }: { word: LiveWord }) {
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
                onClick={() => void showOnTv(osis, WORD_STUDY_TRANSLATION, 'fullScreen')}
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
