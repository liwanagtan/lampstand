import type { OverlayMode } from '@/schema/common';
import { Tooltip } from '@/design-system/components';
import { MODES } from './overlayModeList';
import styles from './OverlayModes.module.css';

export function OverlayModes({
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

export function ModeIcon({ mode }: { mode: OverlayMode }) {
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
