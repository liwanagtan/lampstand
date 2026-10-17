import { useState, type ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ListPlus,
  MonitorPlay,
  MonitorX,
  PanelRight,
  Snowflake,
  Trash2,
  X,
} from 'lucide-react';
import { Button, Chip, Dialog, IconButton, Tooltip, cx, toast } from '@/design-system/components';
import { formatRef, fromOsis, toOsis, type RefRange } from '@/features/bible/ref';
import { LiveScreen } from '@/features/present/LiveScreen';
import { OverlayModes } from '@/features/present/OverlayModes';
import { useControl } from '@/features/present/live/controlStore';
import { closeOutput } from '@/features/present/live/outputWindow';
import { startOutput } from '@/features/present/live/startOutput';
import { useShortcuts } from '@/features/present/useShortcuts';
import { BibleReader } from './BiblePage';
import { useReader } from './readerStore';
import { showOnTv, stepTv } from './tvActions';
import { useTv } from './tvStore';
import { BackgroundControl, Highlighter } from '@/features/bible-console/TvTools';
import styles from './BiblePresenter.module.css';

const label = (ref: string) => {
  const r = fromOsis(ref);
  return r ? formatRef(r) : ref;
};

/** Bible tab: the reader, plus everything needed to put Scripture on the TV. */
export function BiblePage() {
  const presenting = useControl((s) => s.presenting);
  const panel = useTv((s) => s.panel);
  const [exitOpen, setExitOpen] = useState(false);

  const exit = () => {
    setExitOpen(false);
    useControl.getState().setPresenting(false);
    closeOutput();
  };

  const selected = () => {
    const { book, chapter, selection, translation } = useReader.getState();
    if (!selection) return null;
    const range: RefRange = {
      start: { book, chapter, verse: selection.start },
      end: { book, chapter, verse: selection.end },
    };
    return { ref: toOsis(range), translation };
  };

  const control = useControl.getState;
  useShortcuts({
    Enter: () => {
      const s = selected();
      if (s) void showOnTv(s.ref, s.translation);
    },
    Space: () => void stepTv(1),
    PageDown: () => void stepTv(1),
    'Alt+ArrowRight': () => void stepTv(1),
    PageUp: () => void stepTv(-1),
    'Alt+ArrowLeft': () => void stepTv(-1),
    Escape: () => control().dispatch({ type: 'clearOverlay' }),
    b: () => control().toggleScreen('blank'),
    l: () => control().toggleScreen('logo'),
    f: () => control().toggleFreeze(),
    '1': () => useTv.getState().setMode('lowerThird'),
    '2': () => useTv.getState().setMode('sidePanel'),
    '3': () => useTv.getState().setMode('fullScreen'),
    '4': () => useTv.getState().setMode('popup'),
  });

  const toolbar = (
    <Tooltip content={panel ? 'Hide the TV panel' : 'Show the TV panel'}>
      <Button
        variant={panel ? 'secondary' : 'outline'}
        icon={
          presenting ? <span className={styles.onAirDot} aria-hidden /> : <PanelRight size={16} />
        }
        aria-pressed={panel}
        onClick={() => useTv.getState().setPanel(!panel)}
      >
        Present
      </Button>
    </Tooltip>
  );

  return (
    <>
      <BibleReader
        toolbar={toolbar}
        side={
          panel ? (
            <TvPanel
              onStart={() => void startOutput()}
              onExit={() =>
                useControl.getState().output === 'connected' ? setExitOpen(true) : exit()
              }
            />
          ) : undefined
        }
        selectionActions={(range, translation) => (
          <>
            <Button
              size="sm"
              variant="primary"
              icon={<MonitorPlay size={14} />}
              shortcut="Enter"
              onClick={() => void showOnTv(toOsis(range), translation)}
            >
              Present
            </Button>
            <Button
              size="sm"
              variant="ghost"
              icon={<ListPlus size={14} />}
              onClick={() => {
                const added = useTv.getState().addToLesson({ ref: toOsis(range), translation });
                useTv.getState().setPanel(true);
                toast({
                  title: added
                    ? `Added ${formatRef(range)} to the lesson`
                    : `${formatRef(range)} is already in the lesson`,
                  tone: added ? 'success' : 'neutral',
                });
              }}
            >
              Add to lesson
            </Button>
          </>
        )}
      />
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
    </>
  );
}

/** The TV panel beside the reader: what is live, how it shows, highlights and the lesson. */
function TvPanel({ onStart, onExit }: { onStart: () => void; onExit: () => void }) {
  const snapshot = useControl(useShallow((s) => s.snapshot()));
  const frozen = useControl((s) => s.frozen);
  const output = useControl((s) => s.output);
  const presenting = useControl((s) => s.presenting);
  const pages = useControl((s) => s.overlayPageCount);
  const mode = useTv((s) => s.mode);
  const { live } = snapshot;
  const overlay = live.overlay;
  const control = useControl.getState;

  const meta = overlay
    ? `${label(overlay.ref)} · ${overlay.translation}${pages > 1 ? ` · ${overlay.page + 1}/${pages}` : ''}`
    : live.screen === 'blank'
      ? 'Blank'
      : live.screen === 'logo'
        ? 'Logo'
        : 'Nothing on screen';

  return (
    <div className={styles.panel}>
      <section className={styles.section} aria-label="Live on the TV">
        <div className={styles.presentRow}>
          {output === 'connected' ? (
            <Chip tone="success">Output connected</Chip>
          ) : presenting ? (
            <Chip tone="warning">Output disconnected</Chip>
          ) : (
            <Chip>Not presenting</Chip>
          )}
          {presenting ? (
            <Button size="sm" icon={<MonitorX size={14} />} onClick={onExit}>
              Exit Presentation
            </Button>
          ) : (
            <Button size="sm" variant="primary" icon={<MonitorPlay size={14} />} onClick={onStart}>
              Start Presentation
            </Button>
          )}
        </div>
        <div className={styles.head}>
          <h2 className={styles.liveLabel}>
            <span className={styles.liveDot} aria-hidden /> LIVE
          </h2>
          <span className={styles.meta}>{meta}</span>
        </div>
        <div className={cx(styles.screen, frozen && styles.frozen)}>
          <LiveScreen snapshot={frozen ?? snapshot} label="Live output" />
          {frozen && (
            <span className={styles.frozenBadge} role="status">
              <Snowflake size={14} aria-hidden /> FROZEN
            </span>
          )}
        </div>
        <div className={styles.stepRow}>
          <Tooltip content="Previous" shortcut="PgUp">
            <IconButton
              label="Previous verse"
              icon={<ChevronLeft size={18} />}
              variant="secondary"
              disabled={!overlay}
              onClick={() => void stepTv(-1)}
            />
          </Tooltip>
          <Button
            variant="secondary"
            className={styles.grow}
            iconEnd={<ChevronRight size={16} />}
            shortcut="Space"
            disabled={!overlay}
            onClick={() => void stepTv(1)}
          >
            Next verse
          </Button>
          <Tooltip content="Clear verse" shortcut="Esc">
            <IconButton
              label="Clear verse"
              icon={<X size={18} />}
              variant="secondary"
              disabled={!overlay}
              onClick={() => control().dispatch({ type: 'clearOverlay' })}
            />
          </Tooltip>
        </div>
      </section>

      <section className={styles.section} aria-label="Screen">
        <div className={styles.controls}>
          <div className={styles.screenButtons} role="group" aria-label="Screen">
            <PanelToggle
              label="Blank"
              keys="B"
              active={live.screen === 'blank'}
              onClick={() => control().toggleScreen('blank')}
            />
            <PanelToggle
              label="Logo"
              keys="L"
              active={live.screen === 'logo'}
              onClick={() => control().toggleScreen('logo')}
            />
            <PanelToggle
              label={frozen ? 'Unfreeze' : 'Freeze'}
              keys="F"
              active={Boolean(frozen)}
              onClick={() => control().toggleFreeze()}
            />
          </div>
          <OverlayModes mode={mode} onChange={(m) => useTv.getState().setMode(m)} />
        </div>
        <BackgroundControl />
      </section>

      {overlay && <Highlighter key={`${overlay.ref}|${overlay.translation}`} />}

      <Lesson />
    </div>
  );
}

function PanelToggle({
  label,
  keys,
  active,
  onClick,
}: {
  label: string;
  keys: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip content={label} shortcut={keys}>
      <button
        type="button"
        className={cx(styles.toggle, active && styles.toggleActive)}
        aria-pressed={active}
        onClick={onClick}
      >
        {label}
        <kbd className={styles.key}>{keys}</kbd>
      </button>
    </Tooltip>
  );
}

/** Passages prepared for a class or lesson, shown on the TV with one click. */
function Lesson() {
  const lesson = useTv((s) => s.lesson);
  const live = useControl((s) => s.live.overlay);
  const [confirm, setConfirm] = useState(false);
  return (
    <section className={styles.section} aria-label="Lesson">
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>Lesson</h2>
        <span className={styles.hint}>
          {lesson.length === 1 ? '1 passage' : lesson.length ? `${lesson.length} passages` : null}
        </span>
        {lesson.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            className={styles.push}
            onClick={() => setConfirm(true)}
          >
            Clear
          </Button>
        )}
      </div>
      {lesson.length === 0 ? (
        <p className={styles.empty}>
          Select verses and choose <strong>Add to lesson</strong> to line up passages for a class.
        </p>
      ) : (
        <ol className={styles.lesson}>
          {lesson.map((item, i) => {
            const isLive = live?.ref === item.ref && live.translation === item.translation;
            return (
              <li key={`${item.ref}|${item.translation}`} className={styles.lessonItem}>
                <button
                  type="button"
                  className={cx(styles.lessonShow, isLive && styles.lessonLive)}
                  aria-current={isLive || undefined}
                  onClick={() => {
                    void showOnTv(item.ref, item.translation);
                    const r = fromOsis(item.ref);
                    if (r)
                      useReader.getState().goTo(r.start.book, r.start.chapter, {
                        start: r.start.verse,
                        end:
                          r.end.chapter === r.start.chapter && r.end.book === r.start.book
                            ? r.end.verse
                            : r.start.verse,
                      });
                  }}
                >
                  <span className={styles.lessonNum}>{i + 1}</span>
                  <span className={styles.lessonRef}>{label(item.ref)}</span>
                  <span className={styles.lessonCode}>{item.translation}</span>
                </button>
                <LessonAction
                  label={`Move ${label(item.ref)} up`}
                  icon={<ArrowUp size={14} />}
                  disabled={i === 0}
                  onClick={() => useTv.getState().moveInLesson(i, -1)}
                />
                <LessonAction
                  label={`Move ${label(item.ref)} down`}
                  icon={<ArrowDown size={14} />}
                  disabled={i === lesson.length - 1}
                  onClick={() => useTv.getState().moveInLesson(i, 1)}
                />
                <LessonAction
                  label={`Remove ${label(item.ref)}`}
                  icon={<Trash2 size={14} />}
                  onClick={() => useTv.getState().removeFromLesson(i)}
                />
              </li>
            );
          })}
        </ol>
      )}
      <Dialog
        open={confirm}
        onOpenChange={setConfirm}
        size="sm"
        title="Clear the lesson?"
        description="All passages are removed from the list."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Keep
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                useTv.getState().clearLesson();
                setConfirm(false);
              }}
            >
              Clear lesson
            </Button>
          </>
        }
      />
    </section>
  );
}

function LessonAction({
  label: name,
  icon,
  disabled,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return <IconButton label={name} icon={icon} size="sm" disabled={disabled} onClick={onClick} />;
}
