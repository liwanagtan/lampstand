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
import { motion } from 'motion/react';
import {
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  MonitorOff,
  MonitorPlay,
  MonitorUp,
  Square,
  Flame,
} from 'lucide-react';
import {
  Button,
  Chip,
  ChipButton,
  EmptyState,
  IconButton,
  Menu,
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
import { isOutputOpen, openOutput } from './live/outputWindow';
import { LiveScreen } from './LiveScreen';
import { useShortcuts } from './useShortcuts';
import { formatClock } from '@/slides/clock';
import { useBible } from '@/features/bible/bibleStore';
import { CommandBar } from './verses/CommandBar';
import { focusCommandBar } from './verses/commandBarFocus';
import { HistoryPanel, QueuePanel } from './verses/VersePanels';
import { labelFor, useVerses } from './verses/verseStore';
import { ShortcutSheet } from './ShortcutSheet';
import { CommandPalette, type PaletteCommand } from './CommandPalette';
import type { OverlayMode } from '@/schema/common';
import styles from './PresentPage.module.css';

type RailTab = 'queue' | 'history' | 'notes';

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

  useEffect(() => {
    useControl.getState().setLogo(logoAssetId);
  }, [logoAssetId]);

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
  if (state === 'loading') return <div className={styles.center} aria-busy="true" />;
  return <ControlScreen />;
}

function ControlScreen() {
  const navigate = useNavigate();
  const presentation = useControl((s) => s.presentation)!;
  const live = useControl((s) => s.live);
  const previewIndex = useControl((s) => s.previewIndex);
  const output = useControl((s) => s.output);
  const translation = useControl((s) => s.translation);
  const dispatch = useControl((s) => s.dispatch);
  const select = useControl((s) => s.select);
  const goLive = useControl((s) => s.goLive);
  const rev = useControl((s) => s.rev);
  const changedAt = useControl((s) => s.changedAt);
  const logoAssetId = useControl((s) => s.logoAssetId);
  const [rail, setRail] = useState<RailTab>('queue');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const verses = useVerses();
  const translations = useBible((s) => s.translations);
  const overlayPages = useControl((s) => s.overlayPageCount);
  const focusBar = useCallback(() => {
    setTimeout(focusCommandBar, 50);
  }, []);

  const template = getTemplate(live.theme);
  const slides = presentation.slides;
  const liveSlide = slides[live.slideIndex];
  const previewTarget = previewIndex ?? Math.min(live.slideIndex + 1, slides.length - 1);
  const previewSlide = slides[previewTarget];
  const atEnd = live.slideIndex >= slides.length - 1 && previewIndex === null;
  const snapshot = useMemo(
    () => ({ rev, live, presentation, translation, logoAssetId, changedAt }),
    [rev, live, presentation, translation, logoAssetId, changedAt],
  );

  const onOpenOutput = async () => {
    const r = await openOutput();
    if (r.placed) {
      toast({ title: `Output opened on ${r.screenLabel}`, tone: 'success' });
    } else if (r.reason === 'blocked') {
      toast({
        title: 'Chrome blocked the output window. Allow pop-ups for Lampstand and try again.',
        tone: 'warning',
      });
    } else {
      toast({
        title: 'Output opened',
        description:
          r.reason === 'no-permission'
            ? 'Drag it to the TV and press F. Allow “window management” to place it automatically next time.'
            : r.reason === 'single-screen'
              ? 'Only one display found. Connect the TV, then drag the window to it and press F.'
              : 'Drag it to the TV and press F for full screen.',
      });
    }
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
      Enter: () => {
        if (useVerses.getState().preview) void useVerses.getState().goLivePreview();
        else goLive();
      },
      '/': focusCommandBar,
      Escape: () => {
        if (useVerses.getState().preview) useVerses.getState().clearPreview();
        else dispatch({ type: 'clearOverlay' });
      },
      '1': () => verses.setMode('lowerThird'),
      '2': () => verses.setMode('sidePanel'),
      '3': () => verses.setMode('fullScreen'),
      'Alt+ArrowRight': () => void verses.step(1),
      'Alt+ArrowLeft': () => void verses.step(-1),
      t: () => void verses.cycleTranslation(),
      '?': () => setSheetOpen(true),
      'Mod+k': () => setPaletteOpen(true),
      b: () => dispatch({ type: 'toggleScreen', screen: 'blank' }),
      l: () => dispatch({ type: 'toggleScreen', screen: 'logo' }),
      Home: () => dispatch({ type: 'goTo', index: 0 }),
    },
    ['Mod+k'],
  );

  const buildTotal = liveSlide?.type === 'list' && liveSlide.build ? liveSlide.items.length : 0;
  const pageTotal = useControl((s) => (liveSlide ? (s.slidePageCounts[liveSlide.id] ?? 1) : 1));

  return (
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
          <CommandBar />
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
          <OutputChip status={output} />
          <Button
            variant={output === 'connected' ? 'secondary' : 'primary'}
            icon={<MonitorUp size={16} />}
            onClick={() => void onOpenOutput()}
          >
            {output === 'connected' || isOutputOpen() ? 'Show output' : 'Open output'}
          </Button>
        </div>
      </header>

      {output === 'disconnected' && (
        <div className={styles.banner} role="alert">
          <MonitorOff size={18} />
          <strong>Output disconnected.</strong> The TV isn’t receiving updates.
          <Button size="sm" variant="primary" onClick={() => void onOpenOutput()}>
            Reopen
          </Button>
        </div>
      )}

      <main className={styles.main}>
        <section className={styles.panes} aria-label="Preview and live">
          <Pane
            title="Preview"
            meta={
              verses.preview
                ? `Verse · ${labelFor(verses.preview.ref, verses.preview.translation)} · ${verses.preview.translation}`
                : previewSlide
                  ? `Slide ${previewTarget + 1} · ${previewSlide.type}`
                  : undefined
            }
            actions={
              <Button
                variant="primary"
                icon={<MonitorPlay size={16} />}
                shortcut="Enter"
                onClick={() => (verses.preview ? void verses.goLivePreview() : goLive())}
                disabled={!verses.preview && (atEnd || !previewSlide)}
              >
                Go live
              </Button>
            }
          >
            {verses.preview ? (
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
            )}
          </Pane>
          <LivePane
            meta={
              liveSlide
                ? [
                    `Slide ${live.slideIndex + 1} of ${slides.length}`,
                    buildTotal ? `item ${live.buildStep} of ${buildTotal}` : null,
                    pageTotal > 1 ? `page ${live.slidePage + 1} of ${pageTotal}` : null,
                    live.countdownEndsAt ? (
                      <Countdown key="cd" endsAt={live.countdownEndsAt} />
                    ) : null,
                    live.overlay
                      ? `${labelFor(live.overlay.ref, live.overlay.translation)} ${live.overlay.translation}${overlayPages > 1 ? ` (${live.overlay.page + 1}/${overlayPages})` : ''}`
                      : null,
                  ]
                : []
            }
            actions={
              <>
                <Tooltip content="Previous" shortcut="←">
                  <IconButton
                    label="Previous"
                    icon={<ChevronLeft size={20} />}
                    variant="secondary"
                    onClick={() => dispatch({ type: 'prev' })}
                  />
                </Tooltip>
                <Tooltip content="Next" shortcut="→">
                  <IconButton
                    label="Next"
                    icon={<ChevronRight size={20} />}
                    variant="secondary"
                    onClick={() => dispatch({ type: 'next' })}
                  />
                </Tooltip>
                <ScreenToggle
                  label="Blank"
                  shortcut="B"
                  icon={<Square size={16} />}
                  active={live.screen === 'blank'}
                  onClick={() => dispatch({ type: 'toggleScreen', screen: 'blank' })}
                />
                <ScreenToggle
                  label="Logo"
                  shortcut="L"
                  icon={<Flame size={16} />}
                  active={live.screen === 'logo'}
                  onClick={() => dispatch({ type: 'toggleScreen', screen: 'logo' })}
                />
                <OverlayModes mode={verses.mode} onChange={verses.setMode} />
                {live.overlay && (
                  <Button
                    variant="outline"
                    shortcut="Esc"
                    onClick={() => dispatch({ type: 'clearOverlay' })}
                  >
                    Clear verse
                  </Button>
                )}
              </>
            }
          >
            <LiveScreen snapshot={snapshot} label="Live output" />
          </LivePane>
        </section>

        <aside className={styles.rail} aria-label="Verses and notes">
          <Tabs<RailTab>
            fill
            label="Side panel"
            value={rail}
            onChange={setRail}
            items={[
              {
                value: 'queue',
                label: 'Queue',
                badge: verses.queue.length || undefined,
                content: <QueuePanel translation={verses.translation} />,
              },
              {
                value: 'history',
                label: 'History',
                badge: verses.history.length || undefined,
                content: <HistoryPanel />,
              },
              {
                value: 'notes',
                label: 'Notes',
                content: <Notes slide={liveSlide} next={slides[live.slideIndex + 1]} />,
              },
            ]}
          />
        </aside>
      </main>

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
      <ShortcutSheet open={sheetOpen} onOpenChange={setSheetOpen} />
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        commands={paletteCommands({
          slides,
          openOutput: () => void onOpenOutput(),
          dispatch,
          setMode: verses.setMode,
          showSheet: () => setSheetOpen(true),
          focusBar,
          library: () => navigate('/'),
        })}
      />
    </div>
  );
}

function Pane({
  title,
  meta,
  actions,
  children,
}: {
  title: string;
  meta?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={styles.pane}>
      <div className={styles.paneHead}>
        <h2 className={styles.paneTitle}>{title}</h2>
        {meta && <span className={styles.paneMeta}>{meta}</span>}
      </div>
      <div className={styles.paneBody}>{children}</div>
      <div className={styles.paneActions}>{actions}</div>
    </div>
  );
}

function LivePane({
  meta,
  actions,
  children,
}: {
  meta: ReactNode[];
  actions: ReactNode;
  children: ReactNode;
}) {
  const beat = useControl((s) => s.liveBeat);
  const reduced = useReducedMotion();
  return (
    <div className={styles.pane}>
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
      </div>
      <motion.div
        key={beat}
        className={cx(styles.paneBody, styles.liveFrame)}
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
      </motion.div>
      <div className={styles.paneActions}>{actions}</div>
    </div>
  );
}

function ScreenToggle({
  label,
  shortcut,
  icon,
  active,
  onClick,
}: {
  label: string;
  shortcut: string;
  icon: ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant={active ? 'primary' : 'secondary'}
      icon={icon}
      shortcut={shortcut}
      aria-pressed={active}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}

function OutputChip({ status }: { status: 'none' | 'connected' | 'disconnected' }) {
  if (status === 'connected') return <Chip tone="success">Output connected</Chip>;
  if (status === 'disconnected') return <Chip tone="warning">Output disconnected</Chip>;
  return <Chip>Output not open</Chip>;
}

function Countdown({ endsAt }: { endsAt: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);
  return <span className={styles.countdown}>{formatClock(endsAt - now)}</span>;
}

function Notes({ slide, next }: { slide: StoredSlide | undefined; next: StoredSlide | undefined }) {
  return (
    <div className={styles.railBody}>
      {slide?.notes ? (
        <p className={styles.notes}>{slide.notes}</p>
      ) : (
        <p className={styles.muted}>No notes for this slide.</p>
      )}
      {next?.notes && (
        <div className={styles.nextNotes}>
          <h3>Next slide</h3>
          <p>{next.notes}</p>
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

  return (
    <nav className={styles.strip} aria-label="Slides">
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
            <button
              type="button"
              className={styles.thumbButton}
              aria-current={i === liveIndex ? 'true' : undefined}
              aria-label={`Slide ${i + 1}, ${s.type}${i === liveIndex ? ', live' : ''}`}
              onClick={() => onSelect(i)}
              onDoubleClick={() => onGoLive(i)}
            >
              <SlideFrame
                slide={s}
                template={template}
                mode="thumbnail"
                translation={slideTranslation(s, translation)}
              />
              <span className={styles.thumbNum}>{i + 1}</span>
            </button>
          </li>
        ))}
      </ol>
      {hover && slides[hover.index] && (
        <div
          className={styles.hoverPreview}
          style={{ left: Math.max(220, hover.left) }}
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
  openOutput: () => void;
  dispatch: ReturnType<typeof useControl.getState>['dispatch'];
  setMode: (m: OverlayMode) => void;
  showSheet: () => void;
  focusBar: () => void;
  library: () => void;
}): PaletteCommand[] {
  return [
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
      run: () => o.dispatch({ type: 'toggleScreen', screen: 'blank' }),
    },
    {
      id: 'logo',
      group: 'Screen',
      label: 'Logo screen',
      shortcut: 'L',
      run: () => o.dispatch({ type: 'toggleScreen', screen: 'logo' }),
    },
    { id: 'output', group: 'Screen', label: 'Open output on the TV', run: o.openOutput },
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
