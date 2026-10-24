import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, MonitorOff, MonitorPlay, Play } from 'lucide-react';
import {
  Button,
  ChipButton,
  Dialog,
  EmptyState,
  FeatureBoundary,
  IconButton,
  Menu,
  Skeleton,
  Tabs,
  cx,
} from '@/design-system/components';
import { useSettings } from '@/features/settings/settingsStore';
import { useApplyDocumentTheme } from '@/features/settings/theme';
import { getPresentation, markPresented } from '@/features/library/presentations';
import { presentationTranslation, slideTranslation } from '@/features/library/translation';
import { getTemplate } from '@/templates/templates';
import { SlideFrame } from '@/slides/SlideView';
import type { StoredSlide } from '@/schema/presentation';
import { connectControl, readSavedLive, useControl } from './live/controlStore';
import type { LiveSnapshot } from './live/types';
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
import { MODES } from './overlayModeList';
import { DisconnectedBanner, LivePane, OutputStatus } from './console/ConsoleParts';
import { SlideRail } from './console/SlideRail';
import { ScreenControls, StepBar } from './console/StepBar';
import { nextBeat, slideKind, slideTitle } from './console/slideInfo';
import styles from './PresentPage.module.css';
import c from './console/PresentConsole.module.css';
import { paths } from '@/app/paths';

type SideTab = 'notes' | 'verses';

export function PresentPage() {
  useApplyDocumentTheme();
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
          title="Slides not found"
          actions={<Button onClick={() => navigate(paths.screen)}>Back to Screen</Button>}
        >
          It may have been deleted.
        </EmptyState>
      </div>
    );
  }
  if (state === 'loading') {
    return (
      <div className={styles.loading} aria-busy="true" aria-label="Loading slides">
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

/**
 * The slides console (Screen redesign canvas): the slide rail on the left; Live, its step bar and
 * the screen controls in the middle; Next with Notes and Verses on the right. Live is always
 * exactly the TV. Next changes slides; reveals, reading pages and panels have separate controls.
 */
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
  const pageCounts = useControl((s) => s.slidePageCounts);
  const overlayPages = useControl((s) => s.overlayPageCount);
  const [tabChoice, setTabChoice] = useState<{ slideId: string; tab: SideTab } | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const verses = useVerses();
  const translations = useBible((s) => s.translations);

  const slides = presentation.slides;
  const pages = useCallback((s: StoredSlide) => pageCounts[s.id] ?? 1, [pageCounts]);
  const liveSlide = slides[live.slideIndex];
  const hasAttached = liveSlide && 'verses' in liveSlide && Boolean(liveSlide.verses?.length);
  const tab =
    tabChoice?.slideId === liveSlide?.id ? tabChoice!.tab : hasAttached ? 'verses' : 'notes';
  const next = nextBeat(slides, live.slideIndex, live.buildStep, live.slidePage, pages);
  const posterInfo = useMemo(
    () => posterInfoFor(presentation, translation, posterAnimated),
    [presentation, translation, posterAnimated],
  );
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

  /** Enter sends what is cued: a slide picked in the rail, or a verse checked in Next first. */
  const sendCued = () => {
    if (useVerses.getState().preview) void useVerses.getState().goLivePreview();
    else if (useControl.getState().previewIndex !== null) goLive();
  };
  const focusBar = useCallback(() => {
    setTimeout(focusCommandBar, 50);
  }, []);

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
      Enter: sendCued,
      '/': focusCommandBar,
      Escape: () => {
        if (useVerses.getState().preview) useVerses.getState().clearPreview();
        else if (useControl.getState().previewIndex !== null) select(null);
        else dispatch({ type: 'clearOverlay' });
      },
      '1': () => verses.setMode('sidePanel'),
      '2': () => verses.setMode('lowerThird'),
      '3': () => verses.setMode('fullScreen'),
      '4': () => verses.setMode('popup'),
      'Alt+ArrowRight': () => void verses.step(1),
      'Alt+ArrowLeft': () => void verses.step(-1),
      t: () => void verses.cycleTranslation(),
      '?': () => setSheetOpen(true),
      'Mod+k': () => setPaletteOpen(true),
      b: () => toggleScreen('blank'),
      s: () => toggleScreen('sermon'),
      f: () => toggleFreeze(),
      r: () => dispatch({ type: 'revealStep', delta: 1 }),
      '[': () => dispatch({ type: 'slidePage', delta: -1 }),
      ']': () => dispatch({ type: 'slidePage', delta: 1 }),
      v: () => setTabChoice({ slideId: liveSlide?.id ?? '', tab: 'verses' }),
      Home: () => dispatch({ type: 'goTo', index: 0 }),
      End: () => dispatch({ type: 'goTo', index: slides.length - 1 }),
    },
    ['Mod+k'],
  );

  const liveMeta = [
    liveSlide ? `Slide ${live.slideIndex + 1} of ${slides.length} · ${slideKind(liveSlide)}` : null,
    live.countdownEndsAt ? <Countdown key="cd" endsAt={live.countdownEndsAt} /> : null,
    live.overlay
      ? `${labelFor(live.overlay.ref, live.overlay.translation)} over the slide${overlayPages > 1 ? ` (${live.overlay.page + 1}/${overlayPages})` : ''}`
      : null,
  ];

  const pill = frozen
    ? { text: 'Frozen', className: c.pillFrozen }
    : live.screen === 'blank'
      ? { text: 'Blank', className: c.pillCovered }
      : live.screen === 'sermon'
        ? { text: 'Poster', className: c.pillCovered }
        : presenting && output === 'connected'
          ? { text: 'Live', className: c.pillLive }
          : null;

  return (
    <PosterContext.Provider value={posterInfo}>
      <div className={c.shell} data-atmosphere="stage">
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
            <OutputStatus
              status={output}
              presenting={presenting}
              onReopen={() => void startOutput()}
            />
            {pill && (
              <span className={cx(c.pill, pill.className)} role="status">
                {pill.text}
              </span>
            )}
            {presenting ? (
              <Button variant="secondary" icon={<MonitorOff size={16} />} onClick={requestExit}>
                Exit
              </Button>
            ) : (
              <Button
                variant="primary"
                icon={<Play size={16} />}
                onClick={() => void startOutput()}
              >
                Start Presentation
              </Button>
            )}
          </div>
        </header>

        <DisconnectedBanner status={output} onReopen={() => void startOutput()} />

        <div className={c.body}>
          <FeatureBoundary name="The slide rail">
            <SlideRail
              slides={slides}
              liveIndex={live.slideIndex}
              cuedIndex={previewIndex}
              buildStep={live.buildStep}
              page={live.slidePage}
              pages={pages}
              frozenIndex={frozen ? frozen.live.slideIndex : null}
              covered={live.screen !== 'content'}
              onCue={(i) => {
                verses.clearPreview();
                select(i === previewIndex ? null : i);
              }}
            />
          </FeatureBoundary>

          <main className={c.center} aria-label="Live">
            <div className={c.liveWrap}>
              <LivePane meta={liveMeta} frozen={Boolean(frozen)}>
                <LiveScreen
                  snapshot={frozen ?? snapshot}
                  label="Live output"
                  showMediaPlaceholders
                />
              </LivePane>
            </div>
            <FeatureBoundary name="The step bar">
              <StepBar
                slide={liveSlide}
                slideIndex={live.slideIndex}
                next={next}
                pages={liveSlide ? pages(liveSlide) : 1}
              />
            </FeatureBoundary>
            <ScreenControls />
          </main>

          <aside className={c.side} aria-label="Next, notes and verses">
            <FeatureBoundary name="Next">
              <NextPane
                snapshot={snapshot}
                frozen={Boolean(frozen)}
                cuedIndex={previewIndex}
                next={next}
                slides={slides}
                translation={translation}
                onSend={sendCued}
              />
            </FeatureBoundary>
            <Tabs<SideTab>
              fill
              className={c.tabs}
              label="Notes and verses"
              value={tab}
              onChange={(tab) => setTabChoice({ slideId: liveSlide?.id ?? '', tab })}
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
                  value: 'verses',
                  label: 'Verses',
                  badge: verses.queue.length || undefined,
                  content: <VersesTab translation={verses.translation} />,
                },
              ]}
            />
          </aside>
        </div>

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
            start: () => void startOutput(),
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

/**
 * Next: exactly what the next press puts on the TV, or what Enter sends when something is cued
 * (a slide picked in the rail, a verse checked first). While frozen: what unfreezing shows.
 */
function NextPane({
  snapshot,
  frozen,
  cuedIndex,
  next,
  slides,
  translation,
  onSend,
}: {
  snapshot: LiveSnapshot;
  frozen: boolean;
  cuedIndex: number | null;
  next: ReturnType<typeof nextBeat>;
  slides: StoredSlide[];
  translation: string;
  onSend: () => void;
}) {
  const preview = useVerses((s) => s.preview);
  const template = getTemplate(snapshot.live.theme);
  const cued = cuedIndex !== null ? slides[cuedIndex] : undefined;

  let head: { title: string; key: string };
  let body: ReactNode;
  let caption: string;
  let send = false;
  if (frozen) {
    head = { title: 'Shows when you unfreeze', key: 'F' };
    body = <LiveScreen snapshot={snapshot} label="What shows when you unfreeze" />;
    caption = `Slide ${snapshot.live.slideIndex + 1} · ${slides[snapshot.live.slideIndex] ? slideTitle(slides[snapshot.live.slideIndex]!) : ''}`;
  } else if (preview) {
    head = { title: 'Verse, ready', key: 'Enter' };
    body = (
      <LiveScreen
        key={`${preview.ref}|${preview.translation}|${preview.mode}`}
        snapshot={{
          ...snapshot,
          live: { ...snapshot.live, screen: 'content', overlay: { ...preview, page: 0 } },
        }}
        label="Verse, ready to send"
      />
    );
    caption = `${labelFor(preview.ref, preview.translation)} · ${preview.translation} · ${MODES.find((m) => m.mode === preview.mode)?.label ?? ''}. Enter sends it, Esc puts it back.`;
    send = true;
  } else if (cued && cuedIndex !== null) {
    head = { title: `Cued · slide ${cuedIndex + 1}`, key: 'Enter' };
    body = (
      <SlideFrame
        slide={cued}
        template={template}
        mode="preview"
        translation={slideTranslation(cued, translation)}
        label={`Cued: slide ${cuedIndex + 1}`}
      />
    );
    caption = `${slideKind(cued)} · ${slideTitle(cued)}. Enter sends it, Esc un-cues.`;
    send = true;
  } else if (next) {
    const slide = slides[next.index]!;
    head = { title: 'Next', key: '→' };
    body = (
      <SlideFrame
        slide={slide}
        template={template}
        mode="preview"
        translation={slideTranslation(slide, translation)}
        buildStep={next.buildStep}
        page={next.page}
        label={`Next: ${next.label}`}
      />
    );
    caption = next.label;
  } else {
    head = { title: 'Next', key: '→' };
    body = <div className={c.endCard}>End of slides</div>;
    caption = 'This is the last slide.';
  }

  return (
    <section aria-label="Next" className={c.nextPane}>
      <div className={c.nextHead}>
        <span>{head.title}</span>
        <span className={c.key}>{head.key}</span>
      </div>
      <div className={cx(c.nextFrame, send && c.nextCued)}>{body}</div>
      <p className={c.nextCaption}>{caption}</p>
      {send && (
        <Button variant="gold" icon={<MonitorPlay size={16} />} shortcut="Enter" onClick={onSend}>
          Send to screen
        </Button>
      )}
    </section>
  );
}

/** The sermon's verses (on slides, likely mentioned, added) and every verse shown this service. */
function VersesTab({ translation }: { translation: string }) {
  const history = useVerses((s) => s.history);
  const show = useVerses((s) => s.show);
  return (
    <div>
      <QueuePanel translation={translation} />
      {history.length > 0 && (
        <>
          <h3 className={c.historyLabel}>Shown this service</h3>
          <ul className={c.history}>
            {history.map((h) => (
              <li key={h.key}>
                <button
                  type="button"
                  className={c.historyRow}
                  onClick={() => void show({ ref: h.ref, translation: h.translation })}
                >
                  <span>
                    {h.label} · {h.translation}
                  </span>
                  <span className={c.historyMeta}>Show again</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
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
            {slide ? ` · ${slideKind(slide)}` : ''}
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
      label: 'Remove the verse',
      shortcut: 'Esc',
      run: () => o.dispatch({ type: 'clearOverlay' }),
    },
    ...MODES.map((m) => ({
      id: m.mode,
      group: 'Verses',
      label: `Verse as ${m.label.toLowerCase()}`,
      shortcut: m.key,
      run: () => o.setMode(m.mode),
    })),
    {
      id: 'next',
      group: 'Slides',
      label: 'Next',
      shortcut: '→',
      run: () => o.dispatch({ type: 'next' }),
    },
    {
      id: 'prev',
      group: 'Slides',
      label: 'Back',
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
      id: 'sermon',
      group: 'Screen',
      label: 'Sermon poster',
      shortcut: 'S',
      run: () => o.toggleScreen('sermon'),
    },
    {
      id: 'freeze',
      group: 'Screen',
      label: 'Freeze or unfreeze the TV',
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
