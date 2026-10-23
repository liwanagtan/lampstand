// Parts shared by every console in Screen (presentation and Bible): the Live pane, the control
// dock, the output status chip and the disconnect banner. Same look, same keys everywhere.
import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ImageIcon, MonitorOff, Snowflake, X } from 'lucide-react';
import {
  Button,
  Chip,
  ChipButton,
  IconButton,
  ShortcutHint,
  Tooltip,
  cx,
} from '@/design-system/components';
import { transition } from '@/design-system/motion/presets';
import { useReducedMotion } from '@/features/settings/theme';
import type { OverlayMode } from '@/schema/common';
import { useControl } from '../live/controlStore';
import type { Screen } from '../live/types';
import { OverlayModes } from '../OverlayModes';
import styles from '../PresentPage.module.css';

export function LivePane({
  meta,
  frozen,
  tools,
  children,
}: {
  meta: ReactNode[];
  frozen: boolean;
  /** Controls in the pane's header (the Bible console's Highlight and Words). */
  tools?: ReactNode;
  children: ReactNode;
}) {
  const beat = useControl((s) => s.liveBeat);
  const reduced = useReducedMotion();
  return (
    <div className={cx(styles.pane, styles.livePane)}>
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
        {tools}
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

export type DockProps = {
  /** The Sermon screen needs a presentation; the Bible console has none. */
  sermon?: boolean;
  screen: Screen;
  frozen: boolean;
  hasOverlay: boolean;
  mode: OverlayMode;
  onScreen: (s: 'blank' | 'logo' | 'sermon') => void;
  onFreeze: () => void;
  onMode: (m: OverlayMode) => void;
  onClear: () => void;
  /** The Bible console's picture behind the verses. */
  onBackground?: () => void;
  /** Overlay layouts (lower third, side panel…); the Bible console is full screen only. */
  modes?: boolean;
};

/** Screen and verse actions in a compact column under Preview (each shows its key). */
export function Dock(p: DockProps) {
  return (
    <div className={styles.dock} role="toolbar" aria-label="Presentation controls">
      <DockGroup label="Screen" className={styles.gridTwo}>
        <DockButton
          label="Blank"
          keys="B"
          active={p.screen === 'blank'}
          onClick={() => p.onScreen('blank')}
        />
        <DockButton
          label="Logo"
          keys="L"
          active={p.screen === 'logo'}
          onClick={() => p.onScreen('logo')}
        />
        {p.sermon !== false && (
          <DockButton
            label="Sermon"
            keys="S"
            active={p.screen === 'sermon'}
            onClick={() => p.onScreen('sermon')}
          />
        )}
        <DockButton
          label={p.frozen ? 'Unfreeze' : 'Freeze'}
          keys="F"
          active={p.frozen}
          onClick={p.onFreeze}
        />
        {p.onBackground && (
          <DockButton
            label="Background"
            title="Background behind the verses"
            keys="G"
            icon={<ImageIcon size={16} />}
            onClick={p.onBackground}
          />
        )}
      </DockGroup>
      <DockGroup label="Verse" className={p.modes === false ? undefined : styles.verseRow}>
        {p.modes !== false && <OverlayModes mode={p.mode} onChange={p.onMode} />}
        <DockButton
          label="Clear"
          title="Clear verse"
          keys="Esc"
          icon={<X size={16} />}
          onClick={p.onClear}
          disabled={!p.hasOverlay}
          iconOnly={p.modes !== false}
        />
      </DockGroup>
    </div>
  );
}

function DockGroup({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.dockGroup} role="group" aria-label={label}>
      <div className={cx(styles.dockButtons, className)}>{children}</div>
    </div>
  );
}

export function DockButton({
  label,
  title,
  keys,
  icon,
  onClick,
  active,
  disabled,
  iconOnly,
  hint,
  showKey = true,
}: {
  label: string;
  title?: string;
  keys: string;
  icon?: ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  iconOnly?: boolean;
  hint?: string;
  /** Arrow buttons already say their key with their icon. */
  showKey?: boolean;
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
      {showKey && <kbd className={styles.dockKey}>{keys}</kbd>}
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

export function OutputStatus({
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
export function DisconnectedBanner({ status, onReopen }: { status: string; onReopen: () => void }) {
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
