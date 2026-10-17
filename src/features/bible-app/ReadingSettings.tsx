import { Minus, Plus } from 'lucide-react';
import { IconButton, Select, Sheet } from '@/design-system/components';
import { useBible } from '@/features/bible/bibleStore';
import { READER_SIZES, useReader } from './readerStore';
import styles from './ReadingSettings.module.css';

/** Aa: how the Bible reads — translation, a second one beside it, and text size. */
export function ReadingSettings({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { translation, parallel, size, setTranslation, setParallel, setSize } = useReader();
  const translations = useBible((s) => s.translations);
  const options = translations.map((t) => ({ value: t.code, label: `${t.code} — ${t.name}` }));
  const i = READER_SIZES.indexOf(size);
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Reading">
      <div className={styles.form}>
        <Select
          label="Translation"
          value={translation}
          onChange={setTranslation}
          options={options}
        />
        <Select
          label="Parallel translation"
          value={parallel ?? 'none'}
          onChange={(v) => setParallel(v === 'none' ? null : v)}
          options={[
            { value: 'none', label: 'None' },
            ...options.filter((o) => o.value !== translation),
          ]}
        />
        <div className={styles.size}>
          <span className={styles.label} id="text-size-label">
            Text size
          </span>
          <div className={styles.stepper} role="group" aria-labelledby="text-size-label">
            <IconButton
              label="Smaller text"
              icon={<Minus size={18} />}
              disabled={i <= 0}
              onClick={() => setSize(READER_SIZES[Math.max(0, i - 1)]!)}
            />
            <span className={styles.sample} style={{ fontSize: size }} aria-live="polite">
              Aa
            </span>
            <IconButton
              label="Larger text"
              icon={<Plus size={18} />}
              disabled={i >= READER_SIZES.length - 1}
              onClick={() => setSize(READER_SIZES[Math.min(READER_SIZES.length - 1, i + 1)]!)}
            />
          </div>
        </div>
      </div>
    </Sheet>
  );
}
