import { useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Languages,
  MonitorOff,
  MonitorPlay,
  Play,
  Plus,
  X,
} from 'lucide-react';
import {
  Button,
  ChipButton,
  Dialog,
  FeatureBoundary,
  IconButton,
  Menu,
  ShortcutHint,
  Tooltip,
  cx,
  toast,
} from '@/design-system/components';
import { paths } from '@/app/paths';
import { useBible } from '@/features/bible/bibleStore';
import { BOOKS, BOOK_BY_CODE, BOOK_INDEX } from '@/features/bible/books';
import { formatRef, fromOsis, toOsis, type RefRange } from '@/features/bible/ref';
import { BibleSearch } from '@/features/bible-app/BibleSearch';
import { BookPicker } from '@/features/bible-app/BookPicker';
import { pickSelection, selectionRange, useReader } from '@/features/bible-app/readerStore';
import { showOnTv, stepTv, useBibleTvSession } from '@/features/bible-app/tvActions';
import { useTv } from '@/features/bible-app/tvStore';
import { chapterCount, useChapter } from '@/features/bible-app/useChapter';
import {
  DisconnectedBanner,
  Dock,
  DockButton,
  LivePane,
  OutputStatus,
} from '@/features/present/console/ConsoleParts';
import { LiveScreen } from '@/features/present/LiveScreen';
import { useControl } from '@/features/present/live/controlStore';
import { closeOutput } from '@/features/present/live/outputWindow';
import { startOutput } from '@/features/present/live/startOutput';
import { useShortcuts } from '@/features/present/useShortcuts';
import { useApplyDocumentTheme } from '@/features/settings/theme';
import frame from '@/features/present/PresentPage.module.css';
import { LiveTextContext, type LiveTextTools } from '@/slides/liveTextTools';
import { BackgroundControl } from './TvTools';
import { WordsColumn } from './WordsColumn';
import { EMPHASIS_MAX, toggleWord } from './wordOnTv';

/** The Bible goes on the TV full screen only. */
const FULL = 'fullScreen' as const;
import styles from './BibleConsole.module.css';

const label = (ref: string) => {
  const r = fromOsis(ref);
  return r ? formatRef(r) : ref;
};

/** Selects a found passage in the reader: the console previews whatever is selected. */
function selectFound(r: RefRange) {
  const sameChapter = r.end.book === r.start.book && r.end.chapter === r.start.chapter;
  useReader.getState().goTo(r.start.book, r.start.chapter, {
    start: r.start.verse,
    end: sameChapter ? r.end.verse : r.start.verse,
  });
}

/**
 * Screen › Show the Bible: the same console as presenting a file — Preview and Live, the same
 * dock and keys — with a chapter to pick verses from and a passage queue instead of slides.
 */
export function BibleConsolePage() {
  useApplyDocumentTheme();
  useBibleTvSession();
  const navigate = useNavigate();
  const { book, chapter, translation, selection } = useReader();
  const translations = useBible((s) => s.translations);
  const snapshot = useControl(useShallow((s) => s.snapshot()));
  const frozen = useControl((s) => s.frozen);
  const output = useControl((s) => s.output);
  const presenting = useControl((s) => s.presenting);
  const pages = useControl((s) => s.overlayPageCount);
  const [exitOpen, setExitOpen] = useState(false);
  const [backgroundOpen, setBackgroundOpen] = useState(false);
  // The Words column beside Live, for word study with the class.
  const [wordsOpen, setWordsOpen] = useState(false);
  const { live } = snapshot;
  const overlay = live.overlay;
  const control = useControl.getState;

  // Every word on Live can be clicked to light it up on the TV.
  const liveText: LiveTextTools = {
    onHighlight: (word) => {
      const emphasis = control().live.overlay?.emphasis ?? [];
      const key = word.toLowerCase();
      const lit = emphasis.some((e) => e.toLowerCase() === key);
      const next = lit ? emphasis.filter((e) => e.toLowerCase() !== key) : [...emphasis, word];
      if (next.length > EMPHASIS_MAX) {
        toast({ title: `Up to ${EMPHASIS_MAX} highlighted words at a time.`, tone: 'warning' });
        return;
      }
      control().dispatch({ type: 'overlayEmphasis', emphasis: next });
    },
  };

  const preview = selection ? toOsis(selectionRange(book, chapter, selection)) : null;
  // A class reads the verse, so the Bible goes on the TV full screen (no lower third or panel).
  const send = () => {
    if (preview) void showOnTv(preview, translation, FULL);
  };
  const exit = () => {
    setExitOpen(false);
    control().setPresenting(false);
    closeOutput();
  };
  const requestExit = () => (control().output === 'connected' ? setExitOpen(true) : exit());
  /** ↑ ↓ move the preview one verse within the chapter. */
  const movePreview = (dir: 1 | -1) => {
    const count = useReader.getState().selection;
    const v = Math.max(1, (dir > 0 ? (count?.end ?? 0) : (count?.start ?? 2)) + dir);
    useReader.getState().setSelection({ start: v, end: v });
  };

  useShortcuts({
    Enter: send,
    Space: () => void stepTv(1),
    ArrowRight: () => void stepTv(1),
    PageDown: () => void stepTv(1),
    'Alt+ArrowRight': () => void stepTv(1),
    ArrowLeft: () => void stepTv(-1),
    PageUp: () => void stepTv(-1),
    'Alt+ArrowLeft': () => void stepTv(-1),
    ArrowDown: () => movePreview(1),
    ArrowUp: () => movePreview(-1),
    // Esc puts away a studied word first, then the verse.
    Escape: () =>
      control().dispatch(control().live.word ? { type: 'hideWord' } : { type: 'clearOverlay' }),
    // W sends the word chosen in Words, or takes it off the TV.
    w: toggleWord,
    g: () => setBackgroundOpen(true),
    b: () => control().toggleScreen('blank'),
    l: () => control().toggleScreen('logo'),
    f: () => control().toggleFreeze(),
    '/': () =>
      document.querySelector<HTMLInputElement>('input[aria-label="Search the Bible"]')?.focus(),
  });

  const liveMeta = overlay
    ? [
        `${label(overlay.ref)} · ${overlay.translation}`,
        pages > 1 ? `page ${overlay.page + 1} of ${pages}` : null,
      ]
    : [live.screen === 'blank' ? 'Blank' : live.screen === 'logo' ? 'Logo' : 'Nothing on screen'];

  return (
    <div className={frame.shell} data-atmosphere="screen">
      <header className={frame.top}>
        <IconButton
          label="Back to Screen"
          icon={<ArrowLeft size={20} />}
          onClick={() => navigate(paths.screen)}
        />
        <div className={frame.titleBlock}>
          <h1 className={frame.title}>Show the Bible</h1>
          <p className={frame.subtitle}>
            {BOOK_BY_CODE.get(book)?.name} {chapter} · {translation}
          </p>
        </div>
        <div className={frame.commandSlot}>
          <BibleSearch
            translation={translation}
            onGo={(r, code) => {
              if (code) useReader.getState().setTranslation(code);
              selectFound(r);
            }}
          />
        </div>
        <div className={frame.status}>
          <Menu
            label="Translation"
            align="end"
            trigger={
              <ChipButton
                tone="accent"
                icon={<BookOpen size={14} />}
                aria-label={`Translation: ${translation}`}
              >
                {translation}
              </ChipButton>
            }
            items={translations.map((t) => ({
              label: `${t.code} — ${t.name}`,
              onSelect: () => useReader.getState().setTranslation(t.code),
            }))}
          />
          <OutputStatus
            status={output}
            presenting={presenting}
            onReopen={() => void startOutput()}
          />
          {presenting ? (
            <Button variant="secondary" icon={<MonitorOff size={16} />} onClick={requestExit}>
              Exit Presentation
            </Button>
          ) : (
            <Button variant="primary" icon={<Play size={16} />} onClick={() => void startOutput()}>
              Start Presentation
            </Button>
          )}
        </div>
      </header>

      <DisconnectedBanner status={output} onReopen={() => void startOutput()} />

      <main className={frame.main}>
        <section className={frame.stage} aria-label="Preview and live">
          <div className={frame.canvases}>
            <div className={frame.narrow}>
              <div className={cx(frame.pane, frame.stack, frame.previewStack)}>
                <div className={frame.paneHead}>
                  <h2 className={frame.paneTitle}>Preview</h2>
                  {preview && (
                    <span className={cx(frame.paneMeta, styles.previewMeta)}>
                      {label(preview)} · {translation}
                    </span>
                  )}
                  <Tooltip content="Study a word of the passage with the class">
                    <button
                      type="button"
                      className={styles.liveTool}
                      aria-pressed={wordsOpen}
                      onClick={() => setWordsOpen((o) => !o)}
                    >
                      <Languages size={14} aria-hidden /> Words
                    </button>
                  </Tooltip>
                </div>
                <div className={frame.paneBody} data-pane="preview">
                  {preview ? (
                    <LiveScreen
                      key={`${preview}|${translation}`}
                      snapshot={{
                        ...snapshot,
                        live: {
                          ...live,
                          screen: 'content',
                          overlay: { ref: preview, translation, mode: FULL, page: 0 },
                          // Preview is the next passage: no studied word.
                          word: null,
                        },
                      }}
                      label={`Preview: ${label(preview)}`}
                    />
                  ) : (
                    <div className={frame.endCard}>Choose verses below, or search above</div>
                  )}
                </div>
                <div className={frame.sendRow}>
                  <DockButton
                    label="Previous verse on screen"
                    keys="←"
                    icon={<ChevronLeft size={18} />}
                    onClick={() => void stepTv(-1)}
                    disabled={!overlay}
                    iconOnly
                    showKey={false}
                  />
                  <ShortcutHint id="bible-send" keys="Enter">
                    <Button
                      variant="primary"
                      icon={<MonitorPlay size={16} />}
                      shortcut="Enter"
                      onClick={send}
                      className={frame.sendButton}
                      disabled={!preview || Boolean(frozen)}
                    >
                      Show on screen
                    </Button>
                  </ShortcutHint>
                  <DockButton
                    label="Next verse on screen"
                    keys="→"
                    icon={<ChevronRight size={18} />}
                    onClick={() => void stepTv(1)}
                    disabled={!overlay}
                    iconOnly
                    showKey={false}
                  />
                </div>
              </div>
              <section className={frame.sidePanel} aria-label="Chapter">
                <ChapterPicker />
              </section>
            </div>
            {wordsOpen && (
              <FeatureBoundary name="Word study">
                <WordsColumn snapshot={snapshot} onClose={() => setWordsOpen(false)} />
              </FeatureBoundary>
            )}
            <div className={cx(frame.wide, wordsOpen && styles.wideBesideWords)}>
              <div className={cx(frame.stack, frame.liveStack)}>
                <LivePane meta={liveMeta} frozen={Boolean(frozen)}>
                  {/* Click words on Live to light them up, but never while the TV is frozen. */}
                  <LiveTextContext.Provider value={frozen || !overlay ? null : liveText}>
                    <LiveScreen snapshot={frozen ?? snapshot} label="Live output" />
                  </LiveTextContext.Provider>
                  {overlay && pages > 1 && !frozen && (
                    <div className={styles.pager} role="group" aria-label="Pages of the passage">
                      <IconButton
                        label="Previous page"
                        icon={<ChevronLeft size={16} />}
                        size="sm"
                        onClick={() => control().dispatch({ type: 'overlayPage', delta: -1 })}
                        disabled={overlay.page === 0}
                      />
                      <span className={styles.pagerCount}>
                        {overlay.page + 1} / {pages}
                      </span>
                      <IconButton
                        label="Next page"
                        icon={<ChevronRight size={16} />}
                        size="sm"
                        onClick={() => control().dispatch({ type: 'overlayPage', delta: 1 })}
                        disabled={overlay.page >= pages - 1}
                      />
                    </div>
                  )}
                </LivePane>
                <Dock
                  sermon={false}
                  screen={live.screen}
                  frozen={Boolean(frozen)}
                  hasOverlay={Boolean(overlay)}
                  mode={FULL}
                  modes={false}
                  onScreen={(s) => control().toggleScreen(s)}
                  onFreeze={() => control().toggleFreeze()}
                  onMode={() => undefined}
                  onClear={() => control().dispatch({ type: 'clearOverlay' })}
                  onBackground={() => setBackgroundOpen(true)}
                />
              </div>
            </div>
          </div>
        </section>
      </main>

      <FeatureBoundary name="The passage queue">
        <PassageQueue preview={preview} translation={translation} />
      </FeatureBoundary>

      <Dialog
        open={backgroundOpen}
        onOpenChange={setBackgroundOpen}
        size="sm"
        title="Background"
        description="The picture behind the verses on the TV. A darker, simple picture keeps the words easy to read."
      >
        <BackgroundControl />
      </Dialog>

      <Dialog
        open={exitOpen}
        onOpenChange={setExitOpen}
        size="sm"
        title="Exit presentation?"
        description="The output window closes and the TV goes dark. You can start again at any time."
        footer={
          <>
            <Button variant="ghost" onClick={() => setExitOpen(false)}>
              Keep presenting
            </Button>
            <Button variant="primary" onClick={exit}>
              Exit presentation
            </Button>
          </>
        }
      />
    </div>
  );
}

/** The current chapter, compact: click a verse to preview it, Shift-click to extend. */
function ChapterPicker() {
  const { book, chapter, translation, selection, setSelection, goTo } = useReader();
  const overlayRef = useControl((s) => s.live.overlay?.ref);
  const passage = useChapter(translation, book, chapter);
  const [picking, setPicking] = useState(false);
  const list = useRef<HTMLOListElement>(null);
  const liveRange = overlayRef ? fromOsis(overlayRef) : null;
  const isLive = (v: number) =>
    Boolean(
      liveRange &&
      liveRange.start.book === book &&
      liveRange.start.chapter === chapter &&
      v >= liveRange.start.verse &&
      v <= (liveRange.end.chapter === chapter ? liveRange.end.verse : 999),
    );

  useLayoutEffect(() => {
    if (!selection) return;
    list.current
      ?.querySelector(`[data-verse="${selection.start}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [selection, passage]);

  const step = (dir: 1 | -1) => {
    const count = chapterCount(translation, book);
    if (dir > 0 && chapter < count) return goTo(book, chapter + 1);
    if (dir < 0 && chapter > 1) return goTo(book, chapter - 1);
    const next = BOOKS[(BOOK_INDEX.get(book) ?? 0) + dir];
    if (next) goTo(next.code, dir > 0 ? 1 : chapterCount(translation, next.code));
  };

  return (
    <div className={styles.chapter}>
      <div className={styles.chapterNav}>
        <IconButton
          label="Previous chapter"
          icon={<ChevronLeft size={16} />}
          size="sm"
          onClick={() => step(-1)}
        />
        <Button
          size="sm"
          variant="ghost"
          iconEnd={<ChevronDown size={14} />}
          onClick={() => setPicking(true)}
        >
          {BOOK_BY_CODE.get(book)?.name} {chapter}
        </Button>
        <IconButton
          label="Next chapter"
          icon={<ChevronRight size={16} />}
          size="sm"
          onClick={() => step(1)}
        />
      </div>
      <ol
        ref={list}
        className={styles.verses}
        aria-label={`${BOOK_BY_CODE.get(book)?.name} ${chapter}`}
      >
        {passage?.verses
          .filter((v) => !v.missing)
          .map((v) => {
            const selected = selection && v.verse >= selection.start && v.verse <= selection.end;
            return (
              <li key={v.osis} data-verse={v.verse}>
                <button
                  type="button"
                  className={cx(
                    styles.verse,
                    selected && styles.selected,
                    isLive(v.verse) && styles.live,
                  )}
                  aria-pressed={Boolean(selected)}
                  onClick={(e) => setSelection(pickSelection(selection, v.verse, e.shiftKey))}
                >
                  <span className={styles.num}>{v.verse}</span>
                  <span className={styles.text}>{v.text}</span>
                </button>
              </li>
            );
          })}
      </ol>
      <BookPicker
        open={picking}
        onOpenChange={setPicking}
        translation={translation}
        current={{ book, chapter }}
        onPick={(b, c) => goTo(b, c)}
      />
    </div>
  );
}

/** Passages lined up for the class, in place of the slide strip. */
function PassageQueue({ preview, translation }: { preview: string | null; translation: string }) {
  const lesson = useTv((s) => s.lesson);
  const live = useControl((s) => s.live.overlay);
  const add = () => {
    if (!preview) return;
    const added = useTv.getState().addToLesson({ ref: preview, translation });
    if (!added) toast({ title: `${label(preview)} is already in the queue` });
  };
  return (
    <nav className={cx(frame.strip, styles.queue)} aria-label="Passage queue">
      <Tooltip content={preview ? `Add ${label(preview)}` : 'Select verses to add them'}>
        <Button
          size="sm"
          icon={<Plus size={14} />}
          onClick={add}
          disabled={!preview}
          className={styles.addButton}
        >
          Add to queue
        </Button>
      </Tooltip>
      {lesson.length === 0 ? (
        <p className={styles.queueEmpty}>
          Line up the passages for your class here; click one to preview it, double-click to show
          it.
        </p>
      ) : (
        <ol className={styles.queueList}>
          {lesson.map((item, i) => {
            const isLive = live?.ref === item.ref && live.translation === item.translation;
            return (
              <li key={`${item.ref}|${item.translation}`} className={styles.queueItem}>
                <button
                  type="button"
                  className={cx(styles.passage, isLive && styles.passageLive)}
                  aria-label={`Passage ${i + 1}: ${label(item.ref)} ${item.translation}`}
                  aria-current={isLive || undefined}
                  onClick={() => {
                    const r = fromOsis(item.ref);
                    if (r) selectFound(r);
                    useReader.getState().setTranslation(item.translation);
                  }}
                  onDoubleClick={() => void showOnTv(item.ref, item.translation, FULL)}
                >
                  <span className={styles.passageNum}>{i + 1}</span>
                  <span className={styles.passageRef}>{label(item.ref)}</span>
                  <span className={styles.passageCode}>{item.translation}</span>
                </button>
                <IconButton
                  label={`Remove ${label(item.ref)}`}
                  icon={<X size={12} />}
                  size="sm"
                  className={styles.remove}
                  onClick={() => useTv.getState().removeFromLesson(i)}
                />
              </li>
            );
          })}
        </ol>
      )}
    </nav>
  );
}
