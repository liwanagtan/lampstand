import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  MonitorOff,
  MonitorPlay,
  Play,
} from 'lucide-react';
import {
  Button,
  ChipButton,
  Dialog,
  EmptyState,
  FeatureBoundary,
  IconButton,
  Menu,
  ShortcutHint,
  Skeleton,
  Tabs,
  cx,
} from '@/design-system/components';
import { transition } from '@/design-system/motion/presets';
import { useSettings } from '@/features/settings/settingsStore';
import { useApplyDocumentTheme, useReducedMotion } from '@/features/settings/theme';
import { getPresentation, markPresented } from '@/features/library/presentations';
import { presentationTranslation, slideTranslation } from '@/features/library/translation';
import { getTemplate } from '@/templates/templates';
import { SlideFrame } from '@/slides/SlideView';
import type { StoredSlide } from '@/schema/presentation';
import { connectControl, readSavedLive, useControl } from './live/controlStore';
import { closeOutput } from './live/outputWindow';
import { startOutput } from './live/startOutput';
import { LiveScreen } from './LiveScreen';
import { useShortcuts } from './useShortcuts';
import { formatClock } from '@/slides/clock';
import { PosterContext, posterInfoFor } from '@/slides/poster/posterInfo';
import { useBible } from '@/features/bible/bibleStore';
import { CommandBar } from './verses/CommandBar';
import { focusCommandBar } from './verses/commandBarFocus';
import { QueuePanel } from './verses/VersePanels';
import { labelFor, useVerses } from './verses/verseStore';
import { ShortcutSheet } from './ShortcutSheet';
import { CommandPalette, type PaletteCommand } from './CommandPalette';
import type { OverlayMode } from '@/schema/common';
import { ModeIcon } from './OverlayModes';
import { MODES } from './overlayModeList';
import {
  DisconnectedBanner,
  Dock,
  DockButton,
  LivePane,
  OutputStatus,
} from './console/ConsoleParts';
import styles from './PresentPage.module.css';
import { paths } from '@/app/paths';

type RailTab = 'notes' | 'queue';

export function PresentPage() {
  useApplyDocumentTheme(true);
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');
  const defaultTheme = useSettings((s) => s.defaultTheme);
  const logoAssetId = useSettings((s) => s.logoAssetId);

  useEffect(() => connectControl(), []);

  useEffect(() => {
    let alive = true;
    void getPresentation(id).then((r) => {
      if (!alive) return;
      if (!r) {
        setState('missing');
        return;
      }
      useControl.getState().load({
        id,
        presentation: r.data,
        translation: presentationTranslation(r.data),
        logoAssetId: useSettings.getState().logoAssetId,
        theme: r.data.theme ?? defaultTheme,
        restore: readSavedLive(),
        posterAnimated: r.posterAnimated ?? true,
      });
      useVerses
        .getState()
        .init(r.data, presentationTranslation(r.data), useSettings.getState().defaultOverlayMode);
      void markPresented(id);
      setState('ready');
    });
    return () => {
      alive = false;
    };
  }, [id, defaultTheme]);

  const reduceMotion = useSettings((s) => s.reduceMotion);
  useEffect(() => {
    useControl.getState().setLogo(logoAssetId);
  }, [logoAssetId]);
  useEffect(() => {
    useControl.getState().setReduceMotion(reduceMotion);
  }, [reduceMotion]);

  if (state === 'missing') {
    return (
      <div className={styles.center}>
        <EmptyState
          title="Presentation not found"
          actions={<Button onClick={() => navigate(paths.screen)}>Back to Screen</Button>}
        >
          It may have been deleted.
        </EmptyState>
      </div>
    );
  }
  if (state === 'loading') {
    return (
      <div className={styles.loading} aria-busy="true" aria-label="Loading presentation">
        <Skeleton height={48} />
        <div className={styles.loadingPanes}>
          <Skeleton height="auto" radius="md" className={styles.loadingPane} />
          <Skeleton height="auto" radius="md" className={styles.loadingPane} />
        </div>
        <Skeleton height={96} />
      </div>
    );
  }
  return <ControlScreen />;
}

function ControlScreen() {
  const navigate = useNavigate();
  const presentation = useControl((s) => s.presentation)!;
  const live = useControl((s) => s.live);
  const previewIndex = useControl((s) => s.previewIndex);
  const output = useControl((s) => s.output);
  const presenting = useControl((s) => s.presenting);
  const frozen = useControl((s) => s.frozen);
  const translation = useControl((s) => s.translation);
  const dispatch = useControl((s) => s.dispatch);
  const toggleScreen = useControl((s) => s.toggleScreen);
  const toggleFreeze = useControl((s) => s.toggleFreeze);
  const select = useControl((s) => s.select);
  const goLive = useControl((s) => s.goLive);
  const rev = useControl((s) => s.rev);
  const changedAt = useControl((s) => s.changedAt);
  const logoAssetId = useControl((s) => s.logoAssetId);
  const reduceMotion = useControl((s) => s.reduceMotion);
  const posterAnimated = useControl((s) => s.posterAnimated);
  const [rail, setRail] = useState<RailTab>('notes');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const verses = useVerses();
  const translations = useBible((s) => s.translations);
  const overlayPages = useControl((s) => s.overlayPageCount);
  const [ghost, setGhost] = useState<{ key: number; from: DOMRect; to: DOMRect } | null>(null);
  const reduced = useReducedMotion();

  /** Sends Preview live; the preview frame flies into the Live canvas (PRD §9 Going live). */
  const sendPreview = () => {
    const from = document.querySelector('[data-pane="preview"]')?.getBoundingClientRect();
    const to = document.querySelector('[data-pane="live"]')?.getBoundingClientRect();
    if (from && to && !reduced) setGhost({ key: Date.now(), from, to });
    if (useVerses.getState().preview) void useVerses.getState().goLivePreview();
    else goLive();
  };

  const focusBar = useCallback(() => {
    setTimeout(focusCommandBar, 50);
  }, []);

  const template = getTemplate(live.theme);
  const slides = presentation.slides;
  const posterInfo = useMemo(
    () => posterInfoFor(presentation, translation, posterAnimated),
    [presentation, translation, posterAnimated],
  );
  const liveSlide = slides[live.slideIndex];
  const previewTarget = previewIndex ?? Math.min(live.slideIndex + 1, slides.length - 1);
  const previewSlide = slides[previewTarget];
  const atEnd = live.slideIndex >= slides.length - 1 && previewIndex === null;
  const snapshot = useMemo(
    () => ({
      rev,
      live,
      presentation,
      translation,
      logoAssetId,
      reduceMotion,
      posterAnimated,
      changedAt,
    }),
    [rev, live, presentation, translation, logoAssetId, reduceMotion, posterAnimated, changedAt],
  );

  const startPresentation = startOutput;

  const exitPresentation = () => {
    setExitOpen(false);
    useControl.getState().setPresenting(false);
    closeOutput();
  };

  const requestExit = () => {
    if (useControl.getState().output === 'connected') setExitOpen(true);
    else exitPresentation();
  };

  useShortcuts(
    {
      ArrowRight: () => dispatch({ type: 'next' }),
      Space: () => dispatch({ type: 'next' }),
      PageDown: () => dispatch({ type: 'next' }),
      ArrowDown: () => dispatch({ type: 'next' }),
      ArrowLeft: () => dispatch({ type: 'prev' }),
      PageUp: () => dispatch({ type: 'prev' }),
      ArrowUp: () => dispatch({ type: 'prev' }),
      Enter: () => sendPreview(),
      '/': focusCommandBar,
      Escape: () => {
        if (useVerses.getState().preview) useVerses.getState().clearPreview();
        else dispatch({ type: 'clearOverlay' });
      },
      '1': () => verses.setMode('lowerThird'),
      '2': () => verses.setMode('sidePanel'),
      '3': () => verses.setMode('fullScreen'),
      '4': () => verses.setMode('popup'),
      'Alt+ArrowRight': () => void verses.step(1),
      'Alt+ArrowLeft': () => void verses.step(-1),
      t: () => void verses.cycleTranslation(),
      '?': () => setSheetOpen(true),
      'Mod+k': () => setPaletteOpen(true),
      b: () => toggleScreen('blank'),
      l: () => toggleScreen('logo'),
      s: () => toggleScreen('sermon'),
      f: () => toggleFreeze(),
      Home: () => dispatch({ type: 'goTo', index: 0 }),
    },
    ['Mod+k'],
  );

  const buildTotal = liveSlide?.type === 'list' && liveSlide.build ? liveSlide.items.length : 0;
  const pageTotal = useControl((s) => (liveSlide ? (s.slidePageCounts[liveSlide.id] ?? 1) : 1));

  const liveMeta = [
    liveSlide ? `Slide ${live.slideIndex + 1} of ${slides.length}` : null,
    buildTotal ? `item ${live.buildStep} of ${buildTotal}` : null,
    pageTotal > 1 ? `page ${live.slidePage + 1} of ${pageTotal}` : null,
    live.countdownEndsAt ? <Countdown key="cd" endsAt={live.countdownEndsAt} /> : null,
    live.overlay
      ? `${labelFor(live.overlay.ref, live.overlay.translation)} ${live.overlay.translation}${overlayPages > 1 ? ` (${live.overlay.page + 1}/${overlayPages})` : ''}`
      : null,
  ];

  const previewContent = frozen ? (
    <LiveScreen snapshot={snapshot} label="Preview: what shows when you unfreeze" />
  ) : verses.preview ? (
    <LiveScreen
      key={`${verses.preview.ref}|${verses.preview.translation}|${verses.preview.mode}`}
      snapshot={{
        ...snapshot,
        live: { ...live, screen: 'content', overlay: { ...verses.preview, page: 0 } },
      }}
      label="Preview: verse"
    />
  ) : previewSlide && !atEnd ? (
    <SlideFrame
      slide={previewSlide}
      template={template}
      mode="preview"
      translation={slideTranslation(previewSlide, translation)}
      label={`Preview: slide ${previewTarget + 1}`}
    />
  ) : (
    <div className={styles.endCard}>End of presentation</div>
  );

  const previewMeta = frozen
    ? 'Shows when you unfreeze'
    : verses.preview
      ? `Verse · ${labelFor(verses.preview.ref, verses.preview.translation)} · ${verses.preview.translation}`
      : previewSlide && !atEnd
        ? `Slide ${previewTarget + 1} · ${previewSlide.type}`
        : undefined;

  const previewPane = (
    <div className={cx(styles.pane, styles.stack, styles.previewStack)}>
      <div className={styles.paneHead}>
        <h2 className={styles.paneTitle}>Preview</h2>
        {previewMeta && <span className={styles.paneMeta}>{previewMeta}</span>}
      </div>
      <div className={styles.paneBody} data-pane="preview">
        <FeatureBoundary name="Preview">{previewContent}</FeatureBoundary>
      </div>
      <div className={styles.sendRow}>
        <DockButton
          label="Previous slide"
          keys="←"
          hint="prev"
          icon={<ChevronLeft size={18} />}
          onClick={() => dispatch({ type: 'prev' })}
          iconOnly
          showKey={false}
        />
        <ShortcutHint id="goLive" keys="Enter">
          <Button
            variant="primary"
            icon={<MonitorPlay size={16} />}
            shortcut="Enter"
            onClick={sendPreview}
            className={styles.sendButton}
            disabled={Boolean(frozen) || (!verses.preview && (atEnd || !previewSlide))}
          >
            Send to screen
          </Button>
        </ShortcutHint>
        <DockButton
          label="Next slide"
          keys="→"
          hint="next"
          icon={<ChevronRight size={18} />}
          onClick={() => dispatch({ type: 'next' })}
          iconOnly
          showKey={false}
        />
      </div>
    </div>
  );

  const livePane = (
    <div className={cx(styles.stack, styles.liveStack)}>
      <LivePane meta={liveMeta} frozen={Boolean(frozen)}>
        <LiveScreen snapshot={frozen ?? snapshot} label="Live output" />
      </LivePane>
      <Dock
        screen={live.screen}
        frozen={Boolean(frozen)}
        hasOverlay={Boolean(live.overlay)}
        mode={verses.mode}
        onScreen={toggleScreen}
        onFreeze={toggleFreeze}
        onMode={verses.setMode}
        onClear={() => dispatch({ type: 'clearOverlay' })}
      />
    </div>
  );

  return (
    <PosterContext.Provider value={posterInfo}>
      <div className={styles.shell} data-atmosphere="stage">
        <header className={styles.top}>
          <IconButton
            label="Back to Screen"
            icon={<ArrowLeft size={20} />}
            onClick={() => navigate(paths.screen)}
          />
          <div className={styles.titleBlock}>
            <h1 className={styles.title}>{presentation.title}</h1>
            <p className={styles.subtitle}>
              {[presentation.speaker, `${slides.length} slides`].filter(Boolean).join(' · ')}
            </p>
          </div>
          <div className={styles.commandSlot}>
            <FeatureBoundary name="The verse command bar">
              <CommandBar />
            </FeatureBoundary>
          </div>
          <div className={styles.status}>
            <Menu
              label="Verse translation"
              align="end"
              trigger={
                <ChipButton
                  tone="accent"
                  icon={<BookOpen size={14} />}
                  aria-label={`Verse translation: ${verses.translation}`}
                >
                  {verses.translation}
                </ChipButton>
              }
              items={translations.map((t) => ({
                label: `${t.code} — ${t.name}`,
                onSelect: () => verses.setTranslation(t.code),
              }))}
            />
            <ModeChip mode={verses.mode} />
            <OutputStatus
              status={output}
              presenting={presenting}
              onReopen={() => void startPresentation()}
            />
            {presenting ? (
              <Button variant="secondary" icon={<MonitorOff size={16} />} onClick={requestExit}>
                Exit Presentation
              </Button>
            ) : (
              <Button
                variant="primary"
                icon={<Play size={16} />}
                onClick={() => void startPresentation()}
              >
                Start Presentation
              </Button>
            )}
          </div>
        </header>

        <DisconnectedBanner status={output} onReopen={() => void startPresentation()} />

        <main className={styles.main}>
          <section className={styles.stage} aria-label="Preview and live">
            <div className={styles.canvases}>
              <div className={styles.narrow}>
                {previewPane}
                <section className={styles.sidePanel} aria-label="Notes and queue">
                  <FeatureBoundary name="The side panel">
                    <Tabs<RailTab>
                      fill
                      label="Side panel"
                      value={rail}
                      onChange={setRail}
                      items={[
                        {
                          value: 'notes',
                          label: 'Notes',
                          content: (
                            <Notes
                              slide={liveSlide}
                              index={live.slideIndex}
                              next={slides[live.slideIndex + 1]}
                            />
                          ),
                        },
                        {
                          value: 'queue',
                          label: 'Queue',
                          badge: verses.queue.length || undefined,
                          content: <QueuePanel translation={verses.translation} />,
                        },
                      ]}
                    />
                  </FeatureBoundary>
                </section>
              </div>
              <div className={styles.wide}>{livePane}</div>
            </div>
          </section>
        </main>

        <FeatureBoundary name="The slide strip">
          <SlideStrip
            slides={slides}
            liveIndex={live.slideIndex}
            previewIndex={previewIndex}
            onSelect={(i) => {
              verses.clearPreview();
              select(i);
            }}
            onGoLive={(i) => dispatch({ type: 'goTo', index: i })}
            translation={translation}
          />
        </FeatureBoundary>
        <AnimatePresence>
          {ghost && (
            <motion.div
              key={ghost.key}
              className={styles.ghost}
              initial={{
                left: ghost.from.left,
                top: ghost.from.top,
                width: ghost.from.width,
                height: ghost.from.height,
                opacity: 0.9,
              }}
              animate={{
                left: ghost.to.left,
                top: ghost.to.top,
                width: ghost.to.width,
                height: ghost.to.height,
                opacity: 0,
              }}
              transition={transition('standard')}
              onAnimationComplete={() => setGhost((g) => (g?.key === ghost.key ? null : g))}
              aria-hidden
            />
          )}
        </AnimatePresence>
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
              <Button variant="primary" onClick={exitPresentation}>
                Exit presentation
              </Button>
            </>
          }
        />
        <ShortcutSheet open={sheetOpen} onOpenChange={setSheetOpen} />
        <CommandPalette
          open={paletteOpen}
          onOpenChange={setPaletteOpen}
          commands={paletteCommands({
            slides,
            presenting,
            start: () => void startPresentation(),
            exit: requestExit,
            dispatch,
            toggleScreen,
            toggleFreeze,
            setMode: verses.setMode,
            showSheet: () => setSheetOpen(true),
            focusBar,
            library: () => navigate(paths.screen),
          })}
        />
      </div>
    </PosterContext.Provider>
  );
}

function Countdown({ endsAt }: { endsAt: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);
  return <span className={styles.countdown}>{formatClock(endsAt - now)}</span>;
}

const NOTES_SIZE_KEY = 'lampstand.notesSize';
const NOTES_SIZES = [16, 18, 20, 22, 24, 28];

function readNotesSize(): number {
  try {
    const v = Number(localStorage.getItem(NOTES_SIZE_KEY));
    return NOTES_SIZES.includes(v) ? v : 20;
  } catch {
    return 20;
  }
}

/** Presenter notes: large and readable, with what comes next (PRD §7.4). */
function Notes({
  slide,
  index,
  next,
}: {
  slide: StoredSlide | undefined;
  index: number;
  next: StoredSlide | undefined;
}) {
  const [size, setSize] = useState(readNotesSize);
  const change = (dir: 1 | -1) =>
    setSize((v) => {
      const i = Math.max(0, Math.min(NOTES_SIZES.length - 1, NOTES_SIZES.indexOf(v) + dir));
      const n = NOTES_SIZES[i]!;
      try {
        localStorage.setItem(NOTES_SIZE_KEY, String(n));
      } catch {
        // Remembering the size is a convenience only.
      }
      return n;
    });
  return (
    <div className={styles.notesPanel}>
      <div className={styles.notesHead}>
        <div className={styles.notesContext}>
          <span className={styles.notesSlide}>
            Slide {index + 1}
            {slide ? ` · ${slide.type}` : ''}
          </span>
          {slide && <span className={styles.notesHeading}>{slideTitle(slide)}</span>}
        </div>
        <div className={styles.notesSize} role="group" aria-label="Notes text size">
          <IconButton
            label="A− smaller notes text"
            icon={<span className={styles.aSmall}>A−</span>}
            size="sm"
            disabled={size === NOTES_SIZES[0]}
            onClick={() => change(-1)}
          />
          <IconButton
            label="A+ larger notes text"
            icon={<span className={styles.aLarge}>A+</span>}
            size="sm"
            disabled={size === NOTES_SIZES[NOTES_SIZES.length - 1]}
            onClick={() => change(1)}
          />
        </div>
      </div>
      <div className={styles.notesBody} style={{ fontSize: size }}>
        {slide?.notes ? (
          <p className={styles.notesText}>{slide.notes}</p>
        ) : (
          <p className={styles.notesEmpty}>No notes for this slide.</p>
        )}
      </div>
      {next && (
        <div className={styles.upNext}>
          <span className={styles.upNextLabel}>Up next · {slideTitle(next)}</span>
          {next.notes && <p className={styles.upNextText}>{next.notes}</p>}
        </div>
      )}
    </div>
  );
}

function SlideStrip({
  slides,
  liveIndex,
  previewIndex,
  onSelect,
  onGoLive,
  translation,
}: {
  slides: StoredSlide[];
  liveIndex: number;
  previewIndex: number | null;
  onSelect: (i: number) => void;
  onGoLive: (i: number) => void;
  translation: string;
}) {
  const theme = useControl((s) => s.live.theme);
  const template = getTemplate(theme);
  const listRef = useRef<HTMLOListElement>(null);
  const reduced = useReducedMotion();
  const [hover, setHover] = useState<{ index: number; left: number } | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useLayoutEffect(() => {
    const list = listRef.current;
    const el = list?.children[liveIndex] as HTMLElement | undefined;
    if (!list || !el) return;
    list.scrollTo({
      left: el.offsetLeft - list.clientWidth / 2 + el.clientWidth / 2,
      behavior: reduced ? 'auto' : 'smooth',
    });
  }, [liveIndex, reduced]);

  /** Laptops may have no trackpad gestures: page through the strip one screen at a time. */
  const scrollPage = (dir: 1 | -1) => {
    const list = listRef.current;
    if (!list) return;
    list.scrollBy({ left: dir * list.clientWidth * 0.9, behavior: reduced ? 'auto' : 'smooth' });
  };

  return (
    <nav className={styles.strip} aria-label="Slides">
      <IconButton
        label="Scroll slides left"
        icon={<ChevronLeft size={18} />}
        variant="ghost"
        className={styles.stripArrow}
        onClick={() => scrollPage(-1)}
      />
      <ol ref={listRef} className={styles.stripList}>
        {slides.map((s, i) => (
          <li
            key={s.id}
            className={cx(
              styles.thumb,
              i === liveIndex && styles.thumbLive,
              i === previewIndex && styles.thumbPreview,
            )}
            onMouseEnter={(e) => {
              clearTimeout(hoverTimer.current);
              const el = e.currentTarget;
              hoverTimer.current = setTimeout(() => {
                const strip = el.closest('nav')!.getBoundingClientRect();
                const r = el.getBoundingClientRect();
                setHover({ index: i, left: r.left - strip.left + r.width / 2 });
              }, 400);
            }}
            onMouseLeave={() => {
              clearTimeout(hoverTimer.current);
              setHover((h) => (h?.index === i ? null : h));
            }}
          >
            <div className={styles.thumbWrap}>
              <SlideFrame
                slide={s}
                template={template}
                mode="thumbnail"
                translation={slideTranslation(s, translation)}
              />
              <span className={styles.thumbNum} aria-hidden>
                {i + 1}
              </span>
              <button
                type="button"
                className={styles.thumbButton}
                aria-current={i === liveIndex ? 'true' : undefined}
                onClick={() => onSelect(i)}
                onDoubleClick={() => onGoLive(i)}
              >
                <span className="visually-hidden">{`Slide ${i + 1}, ${s.type}${i === liveIndex ? ', live' : ''}`}</span>
              </button>
            </div>
          </li>
        ))}
      </ol>
      <IconButton
        label="Scroll slides right"
        icon={<ChevronRight size={18} />}
        variant="ghost"
        className={styles.stripArrow}
        onClick={() => scrollPage(1)}
      />
      {hover && slides[hover.index] && (
        <div
          className={styles.hoverPreview}
          style={{ left: Math.max(180, hover.left) }}
          aria-hidden
        >
          <SlideFrame
            slide={slides[hover.index]!}
            template={template}
            mode="thumbnail"
            translation={slideTranslation(slides[hover.index]!, translation)}
          />
        </div>
      )}
    </nav>
  );
}

function ModeChip({ mode }: { mode: OverlayMode }) {
  const label = MODES.find((m) => m.mode === mode)?.label ?? mode;
  return (
    <span className={styles.modeChip} title="Verse overlay mode">
      <ModeIcon mode={mode} /> {label}
    </span>
  );
}

function paletteCommands(o: {
  slides: StoredSlide[];
  presenting: boolean;
  start: () => void;
  exit: () => void;
  dispatch: ReturnType<typeof useControl.getState>['dispatch'];
  toggleScreen: (s: 'blank' | 'logo' | 'sermon') => void;
  toggleFreeze: () => void;
  setMode: (m: OverlayMode) => void;
  showSheet: () => void;
  focusBar: () => void;
  library: () => void;
}): PaletteCommand[] {
  return [
    o.presenting
      ? { id: 'exit', group: 'Presentation', label: 'Exit presentation', run: o.exit }
      : { id: 'start', group: 'Presentation', label: 'Start presentation', run: o.start },
    { id: 'verse', group: 'Verses', label: 'Show a verse…', shortcut: '/', run: o.focusBar },
    {
      id: 'clear',
      group: 'Verses',
      label: 'Clear verse',
      shortcut: 'Esc',
      run: () => o.dispatch({ type: 'clearOverlay' }),
    },
    ...MODES.map((m) => ({
      id: m.mode,
      group: 'Verses',
      label: `Overlay: ${m.label}`,
      shortcut: m.key,
      run: () => o.setMode(m.mode),
    })),
    {
      id: 'next',
      group: 'Slides',
      label: 'Next slide',
      shortcut: '→',
      run: () => o.dispatch({ type: 'next' }),
    },
    {
      id: 'prev',
      group: 'Slides',
      label: 'Previous slide',
      shortcut: '←',
      run: () => o.dispatch({ type: 'prev' }),
    },
    {
      id: 'blank',
      group: 'Screen',
      label: 'Blank screen',
      shortcut: 'B',
      run: () => o.toggleScreen('blank'),
    },
    {
      id: 'logo',
      group: 'Screen',
      label: 'Logo screen',
      shortcut: 'L',
      run: () => o.toggleScreen('logo'),
    },
    {
      id: 'sermon',
      group: 'Screen',
      label: 'Sermon poster',
      shortcut: 'S',
      run: () => o.toggleScreen('sermon'),
    },
    {
      id: 'freeze',
      group: 'Screen',
      label: 'Freeze or unfreeze the output',
      shortcut: 'F',
      run: o.toggleFreeze,
    },
    { id: 'sheet', group: 'App', label: 'Keyboard shortcuts', shortcut: '?', run: o.showSheet },
    { id: 'library', group: 'App', label: 'Back to Screen', run: o.library },
    ...o.slides.map((s, i) => ({
      id: `slide-${i}`,
      group: 'Go to slide',
      label: `${i + 1}. ${slideTitle(s)}`,
      keywords: [String(i + 1), s.type],
      run: () => o.dispatch({ type: 'goTo', index: i }),
    })),
  ];
}

function slideTitle(s: StoredSlide): string {
  switch (s.type) {
    case 'verse':
      return s.ref;
    case 'quote':
    case 'statement':
      return s.text.slice(0, 50);
    case 'image':
      return s.caption ?? 'Image';
    case 'countdown':
      return `Countdown ${s.minutes} min`;
    default:
      return s.heading;
  }
}
