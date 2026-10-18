import { ChevronDown } from 'lucide-react';
import { Tooltip } from '@/design-system/components';
import { useReader } from './readerStore';
import styles from './TranslationChip.module.css';

/**
 * The translation you're reading ("KJV", or "KJV + WEB" side by side) as a chip; it opens the
 * Reading sheet: translation, parallel translation and text size.
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
    <Tooltip content="Translation and text size">
      <button
        type="button"
        className={styles.chip}
        aria-label={`Reading settings: ${label}`}
        onClick={onClick}
      >
        {label}
        <ChevronDown size={14} aria-hidden />
      </button>
    </Tooltip>
  );
}
