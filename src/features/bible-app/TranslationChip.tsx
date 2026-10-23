import { Tooltip } from '@/design-system/components';
import { useReader } from './readerStore';
import styles from './TranslationChip.module.css';

/**
 * The one reading control, in both readers: the translation you're reading ("KJV", or
 * "KJV + WEB" side by side) and Aa. It opens the Reading sheet: layout, translation and size.
 */
export function TranslationChip({
  onClick,
  parallel = true,
}: {
  onClick: () => void;
  /** Show the parallel translation too (the Bible reader does; plans don't). */
  parallel?: boolean;
}) {
  const translation = useReader((s) => s.translation);
  const second = useReader((s) => s.parallel);
  const label = parallel && second ? `${translation} + ${second}` : translation;
  return (
    <Tooltip content="Layout, translation and text size">
      <button
        type="button"
        className={styles.chip}
        aria-label={`Reading settings: ${label}`}
        onClick={onClick}
      >
        {label}
        <span className={styles.aa} aria-hidden>
          Aa
        </span>
      </button>
    </Tooltip>
  );
}
