import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowLeftRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Flame,
  MonitorOff,
  MonitorPlay,
  Play,
  Presentation,
  Snowflake,
  Square,
  X,
} from 'lucide-react';
import {
  Button,
  Chip,
  ChipButton,
  Dialog,
  EmptyState,
  FeatureBoundary,
  IconButton,
  Menu,
  ShortcutHint,
  Skeleton,
  Tabs,
  Tooltip,
  cx,
  toast,
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
import { closeOutput, openOutput } from './live/outputWindow';
import type { Screen } from './live/types';
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
import styles from './PresentPage.module.css';

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
          actions={<Button onClick={() => navigate('/')}>Back to Library</Button>}
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

const LAYOUT_KEY = 'lampstand.canvasLayout';

function readSwapped(): boolean {
  try {
    return localStorage.getItem(LAYOUT_KEY) === 'preview-large';
  } catch {
    return false;
  }
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
  const [swapped, setSwapped] = useState(readSwapped);
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

  const swap = () =>
    setSwapped((v) => {
      try {
        localStorage.setItem(LAYOUT_KEY, v ? 'live-large' : 'preview-large');
      } catch {
        // A remembered layout is a convenience only.
      }
      return !v;
    });

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

  const startPresentation = async () => {
    const r = await openOutput();
    if (!r.placed && r.reason === 'blocked') {
      toast({
        title: 'Chrome blocked the output window. Allow pop-ups for Lampstand and try again.',
        tone: 'warning',
      });
      return;
    }
    useControl.getState().setPresenting(true);
    if (r.placed) {
      toast({ title: `Presentation started on ${r.screenLabel}`, tone: 'success' });
    } else {
      toast({
        title: 'Presentation started',
        description:
          r.reason === 'no-permission'
            ? 'Drag the output to the TV and press F. Allow “window management” to place it automatically next time.'
            : r.reason === 'single-screen'
              ? 'Only one display found. Connect the TV, then drag the output to it and press F.'
              : 'Drag the output to the TV and press F for full screen.',
      });
    }
  };

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
      x: () => swap(),
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

  return (
    <PosterContext.Provider value={posterInfo}>
      <div className={styles.shell}>
        <header className={styles.top}>
          <IconButton
            label="Back to Library"
            icon={<ArrowLeft size={20} />}
            onClick={() => navigate('/')}
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
            <div className={cx(styles.canvases, swapped && styles.swapped)}>
              <div className={cx(styles.pane, styles.previewPane, !swapped && styles.paneSmall)}>
                <div className={styles.paneHead}>
                  <h2 className={styles.paneTitle}>Preview</h2>
                  {previewMeta && <span className={styles.paneMeta}>{previewMeta}</span>}
                </div>
                <div className={styles.paneBody} data-pane="preview">
                  <FeatureBoundary name="Preview">{previewContent}</FeatureBoundary>
                </div>
                <div className={styles.paneActions}>
                  <ShortcutHint id="goLive" keys="Enter">
                    <Button
                      variant="primary"
                      icon={<MonitorPlay size={16} />}
                      shortcut="Enter"
                      onClick={sendPreview}
                      disabled={Boolean(frozen) || (!verses.preview && (atEnd || !previewSlide))}
                    >
                      Go live
                    </Button>
                  </ShortcutHint>
                </div>
              </div>
              <LivePane small={swapped} meta={liveMeta} frozen={Boolean(frozen)} onSwap={swap}>
                <LiveScreen snapshot={frozen ?? snapshot} label="Live output" />
              </LivePane>
            </div>

            <Dock
              screen={live.screen}
              frozen={Boolean(frozen)}
              hasOverlay={Boolean(live.overlay)}
              mode={verses.mode}
              translation={live.overlay?.translation ?? verses.translation}
              onPrev={() => dispatch({ type: 'prev' })}
              onNext={() => dispatch({ type: 'next' })}
              onScreen={toggleScreen}
              onFreeze={toggleFreeze}
              onMode={verses.setMode}
              onVerseStep={(d) => void verses.step(d)}
              onTranslation={() => void verses.cycleTranslation()}
              onClear={() => dispatch({ type: 'clearOverlay' })}
            />
          </section>

          <aside className={styles.rail} aria-label="Verses and notes">
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
          </aside>
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
            swap,
            setMode: verses.setMode,
            showSheet: () => setSheetOpen(true),
            focusBar,
            library: () => navigate('/'),
          })}
        />
      </div>
    </PosterContext.Provider>
  );
}

function LivePane({
  small,
  meta,
  frozen,
  onSwap,
  children,
}: {
  small: boolean;
  meta: ReactNode[];
  frozen: boolean;
  onSwap: () => void;
  children: ReactNode;
}) {
  const beat = useControl((s) => s.liveBeat);
  const reduced = useReducedMotion();
  return (
    <div className={cx(styles.pane, styles.livePane, small && styles.paneSmall)}>
      <div className={styles.paneHead}>
        <h2 className={cx(styles.paneTitle, styles.liveLabel)}>
          <span className={styles.liveDot} aria-hidden /> LIVE
        </h2>
        <span className={styles.paneMeta}>
          {meta.filter(Boolean).map((m, i) => (
            <span key={i}>
              {i > 0 && ' · '}
              {m}
            </span>
          ))}
        </span>
        <Tooltip content="Swap canvas sizes" shortcut="X">
          <IconButton
            label="Swap canvas sizes"
            icon={<ArrowLeftRight size={16} />}
            size="sm"
            className={styles.swapButton}
            onClick={onSwap}
          />
        </Tooltip>
      </div>
      <motion.div
        key={beat}
        className={cx(styles.paneBody, styles.liveFrame, frozen && styles.frozenFrame)}
        data-pane="live"
        initial={reduced ? false : { boxShadow: '0 0 0 0px var(--color-live)' }}
        animate={{
          boxShadow: [
            '0 0 0 0px var(--color-live)',
            '0 0 0 6px color-mix(in srgb, var(--color-live) 45%, transparent)',
            '0 0 0 0px var(--color-live)',
          ],
        }}
        transition={{ ...transition('slide', reduced), duration: reduced ? 0 : 0.6 }}
      >
        {children}
        {frozen && (
          <span className={styles.frozenBadge} role="status">
            <Snowflake size={14} aria-hidden /> FROZEN
          </span>
        )}
      </motion.div>
    </div>
  );
}

type DockProps = {
  screen: Screen;
  frozen: boolean;
  hasOverlay: boolean;
  mode: OverlayMode;
  translation: string;
  onPrev: () => void;
  onNext: () => void;
  onScreen: (s: 'blank' | 'logo' | 'sermon') => void;
  onFreeze: () => void;
  onMode: (m: OverlayMode) => void;
  onVerseStep: (d: 1 | -1) => void;
  onTranslation: () => void;
  onClear: () => void;
};

/** Every live action in one reachable place, grouped by job (each shows its key). */
function Dock(p: DockProps) {
  return (
    <div className={styles.dock} role="toolbar" aria-label="Presentation controls">
      <DockGroup label="Slides">
        <DockButton
          label="Previous"
          keys="←"
          hint="prev"
          icon={<ChevronLeft size={18} />}
          onClick={p.onPrev}
          iconOnly
        />
        <DockButton
          label="Next"
          keys="→"
          hint="next"
          icon={<ChevronRight size={18} />}
          onClick={p.onNext}
          iconOnly
        />
      </DockGroup>
      <DockGroup label="Screen">
        <DockButton
          label="Blank"
          keys="B"
          icon={<Square size={16} />}
          active={p.screen === 'blank'}
          onClick={() => p.onScreen('blank')}
        />
        <DockButton
          label="Logo"
          keys="L"
          icon={<Flame size={16} />}
          active={p.screen === 'logo'}
          onClick={() => p.onScreen('logo')}
        />
        <DockButton
          label="Sermon"
          keys="S"
          icon={<Presentation size={16} />}
          active={p.screen === 'sermon'}
          onClick={() => p.onScreen('sermon')}
        />
        <DockButton
          label={p.frozen ? 'Unfreeze' : 'Freeze'}
          keys="F"
          icon={<Snowflake size={16} />}
          active={p.frozen}
          onClick={p.onFreeze}
        />
      </DockGroup>
      <DockGroup label="Verse">
        <OverlayModes mode={p.mode} onChange={p.onMode} />
        <DockButton
          label="Previous verse"
          keys="Alt+←"
          icon={<ChevronLeft size={18} />}
          onClick={() => p.onVerseStep(-1)}
          disabled={!p.hasOverlay}
          iconOnly
        />
        <DockButton
          label="Next verse"
          keys="Alt+→"
          icon={<ChevronRight size={18} />}
          onClick={() => p.onVerseStep(1)}
          disabled={!p.hasOverlay}
          iconOnly
        />
        <DockButton
          label={p.translation}
          title="Switch translation"
          keys="T"
          icon={<BookOpen size={16} />}
          onClick={p.onTranslation}
          disabled={!p.hasOverlay}
        />
        <DockButton
          label="Clear"
          title="Clear verse"
          keys="Esc"
          icon={<X size={16} />}
          onClick={p.onClear}
          disabled={!p.hasOverlay}
        />
      </DockGroup>
    </div>
  );
}

function DockGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.dockGroup} role="group" aria-label={label}>
      <span className={styles.dockLabel} aria-hidden>
        {label}
      </span>
      <div className={styles.dockButtons}>{children}</div>
    </div>
  );
}

function DockButton({
  label,
  title,
  keys,
  icon,
  onClick,
  active,
  disabled,
  iconOnly,
  hint,
}: {
  label: string;
  title?: string;
  keys: string;
  icon: ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  iconOnly?: boolean;
  hint?: string;
}) {
  const name = title ?? label;
  const button = (
    <button
      type="button"
      className={cx(
        styles.dockButton,
        active && styles.dockActive,
        iconOnly && styles.dockIconOnly,
      )}
      aria-pressed={active === undefined ? undefined : active}
      onClick={onClick}
      disabled={disabled}
    >
      {icon}
      {(iconOnly || title) && <span className="visually-hidden">{name} </span>}
      {!iconOnly && <span>{label}</span>}
      <kbd className={styles.dockKey}>{keys}</kbd>
    </button>
  );
  return (
    <ShortcutHint id={hint ?? `dock-${name}`} keys={keys}>
      <Tooltip content={name} shortcut={keys}>
        {button}
      </Tooltip>
    </ShortcutHint>
  );
}

function OutputStatus({
  status,
  presenting,
  onReopen,
}: {
  status: 'none' | 'connected' | 'disconnected';
  presenting: boolean;
  onReopen: () => void;
}) {
  if (status === 'connected') return <Chip tone="success">Output connected</Chip>;
  if (status === 'disconnected' && presenting)
    return (
      <ChipButton
        tone="warning"
        icon={<MonitorOff size={14} />}
        onClick={onReopen}
        className={styles.alertChip}
      >
        Output disconnected · Reopen
      </ChipButton>
    );
  return <Chip>Not presenting</Chip>;
}

const BANNER_MS = 5000;

/** Says the TV lost its output; dismissible, hides itself after 5 s (the status chip stays red). */
function DisconnectedBanner({ status, onReopen }: { status: string; onReopen: () => void }) {
  return (
    <AnimatePresence>
      {status === 'disconnected' && <BannerBody key="banner" onReopen={onReopen} />}
    </AnimatePresence>
  );
}

function BannerBody({ onReopen }: { onReopen: () => void }) {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    const id = setTimeout(() => setOpen(false), BANNER_MS);
    return () => clearTimeout(id);
  }, []);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={styles.banner}
          role="alert"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={transition('standard')}
        >
          <div className={styles.bannerInner}>
            <MonitorOff size={18} />
            <strong>Output disconnected.</strong> The TV isn’t receiving updates.
            <Button size="sm" variant="primary" onClick={onReopen}>
              Reopen
            </Button>
            <IconButton
              label="Dismiss warning"
              icon={<X size={16} />}
              size="sm"
              className={styles.bannerClose}
              onClick={() => setOpen(false)}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
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

const MODES: { mode: OverlayMode; label: string; key: string }[] = [
  { mode: 'lowerThird', label: 'Lower third', key: '1' },
  { mode: 'sidePanel', label: 'Side panel', key: '2' },
  { mode: 'fullScreen', label: 'Full screen', key: '3' },
  { mode: 'popup', label: 'Popup', key: '4' },
];

function OverlayModes({
  mode,
  onChange,
}: {
  mode: OverlayMode;
  onChange: (m: OverlayMode) => void;
}) {
  return (
    <div className={styles.modes} role="radiogroup" aria-label="Verse overlay mode">
      {MODES.map((m) => (
        <Tooltip key={m.mode} content={m.label} shortcut={m.key}>
          <button
            type="button"
            role="radio"
            aria-checked={mode === m.mode}
            aria-label={m.label}
            className={styles.mode}
            onClick={() => onChange(m.mode)}
          >
            <ModeIcon mode={m.mode} />
          </button>
        </Tooltip>
      ))}
    </div>
  );
}

function ModeIcon({ mode }: { mode: OverlayMode }) {
  return (
    <svg width="22" height="14" viewBox="0 0 22 14" aria-hidden>
      <rect
        x="0.75"
        y="0.75"
        width="20.5"
        height="12.5"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      {mode === 'lowerThird' && (
        <rect x="2.5" y="8.5" width="17" height="3" rx="0.5" fill="currentColor" />
      )}
      {mode === 'sidePanel' && (
        <rect x="13" y="2.5" width="6.5" height="9" rx="0.5" fill="currentColor" />
      )}
      {mode === 'popup' && <rect x="5" y="3" width="12" height="8" rx="1.5" fill="currentColor" />}
      {mode === 'fullScreen' && (
        <rect x="2.5" y="2.5" width="17" height="9" rx="0.5" fill="currentColor" />
      )}
    </svg>
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
  swap: () => void;
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
    { id: 'swap', group: 'App', label: 'Swap canvas sizes', shortcut: 'X', run: o.swap },
    { id: 'sheet', group: 'App', label: 'Keyboard shortcuts', shortcut: '?', run: o.showSheet },
    { id: 'library', group: 'App', label: 'Back to Library', run: o.library },
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
