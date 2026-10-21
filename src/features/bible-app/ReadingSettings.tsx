import { Minus, Plus } from 'lucide-react';
import { IconButton, Select, Sheet, Toggle } from '@/design-system/components';
import { useIsPhone } from '@/app/useIsPhone';
import { useSettings } from '@/features/settings/settingsStore';
import { useBible } from '@/features/bible/bibleStore';
import { READER_SIZES, useReader } from './readerStore';
import styles from './ReadingSettings.module.css';

/** Aa: how the Bible reads — translation, a second one beside it, and text size. */
export function ReadingSettings({
  open,
  onOpenChange,
  parallel: showParallel = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Offer a second translation beside the first (the Bible reader does; plans don't). */
  parallel?: boolean;
}) {
  const { translation, parallel, size, setTranslation, setParallel, setSize } = useReader();
  const translations = useBible((s) => s.translations);
  const options = translations.map((t) => ({ value: t.code, label: `${t.code} — ${t.name}` }));
  const i = READER_SIZES.indexOf(size);
  const phone = useIsPhone();
  const notes = useSettings((s) => s.studyNotes);
  const set = useSettings((s) => s.set);
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Reading">
      <div className={styles.form}>
        {phone ? (
          <section className={styles.translations}>
            <div className={styles.translationHead}>
              <strong>Translation</strong>
              <span>{translations.find((t) => t.code === translation)?.name}</span>
            </div>
            <div className={styles.translationChips} role="group" aria-label="Translation">
              {translations.map((t) => (
                <button
                  key={t.code}
                  aria-pressed={translation === t.code}
                  onClick={() => setTranslation(t.code)}
                >
                  {t.code}
                </button>
              ))}
            </div>
          </section>
        ) : (
          <Select
            label="Translation"
            value={translation}
            onChange={setTranslation}
            options={options}
          />
        )}
        {showParallel && (
          <Select
            label={phone ? 'Side by side' : 'Parallel translation'}
            value={parallel ?? 'none'}
            onChange={(v) => setParallel(v === 'none' ? null : v)}
            options={[
              { value: 'none', label: 'None' },
              ...options.filter((o) => o.value !== translation),
            ]}
          />
        )}
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
              {phone ? `${size} px` : 'Aa'}
            </span>
            <IconButton
              label="Larger text"
              icon={<Plus size={18} />}
              disabled={i >= READER_SIZES.length - 1}
              onClick={() => setSize(READER_SIZES[Math.min(READER_SIZES.length - 1, i + 1)]!)}
            />
          </div>
        </div>
        {phone && (
          <>
            <p className={styles.preview}>The Light shines in the darkness.</p>
            <Toggle
              checked={notes}
              onChange={(value) => void set('studyNotes', value)}
              label="Study notes"
              description="Tyndale notes beside the verses"
            />
          </>
        )}
      </div>
    </Sheet>
  );
}
