import { useId } from 'react';
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
  const { translation, parallel, layout, setTranslation, setParallel, setLayout } = useReader();
  const translations = useBible((s) => s.translations);
  const options = translations.map((t) => ({ value: t.code, label: `${t.code} — ${t.name}` }));
  const phone = useIsPhone();
  const notes = useSettings((s) => s.studyNotes);
  const set = useSettings((s) => s.set);
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Reading">
      <div className={styles.form}>
        <div className={styles.layouts} role="radiogroup" aria-label="Layout">
          {(
            [
              ['read', 'Read', 'Paragraphs, as written'],
              ['study', 'Study', 'A verse per line, with notes'],
            ] as const
          ).map(([value, name, hint]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={layout === value}
              className={styles.layout}
              onClick={() => setLayout(value)}
            >
              <strong>{name}</strong>
              <span>{hint}</span>
            </button>
          ))}
        </div>
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
        {showParallel && layout === 'study' && (
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
        {(translation === 'NLT' || parallel === 'NLT') && (
          <p>
            NLT is licensed through API.Bible. Cached chapters need an internet refresh every 14
            days.
          </p>
        )}
        <TextSize />
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

/** Text size as a row of growing letters, with smaller and larger buttons. */
export function TextSize() {
  const size = useReader((s) => s.size);
  const setSize = useReader((s) => s.setSize);
  const i = READER_SIZES.indexOf(size);
  const labelId = useId();
  return (
    <div className={styles.size}>
      <span className={styles.label} id={labelId}>
        Text size
      </span>
      <div className={styles.stepper} role="group" aria-labelledby={labelId}>
        <IconButton
          label="Smaller text"
          icon={<Minus size={18} />}
          disabled={i <= 0}
          onClick={() => setSize(READER_SIZES[Math.max(0, i - 1)]!)}
        />
        <span className={styles.scale} aria-hidden>
          {READER_SIZES.map((step, k) => (
            <span key={step} data-on={k <= i || undefined} style={{ fontSize: 10 + k * 2 }}>
              A
            </span>
          ))}
        </span>
        <span className="visually-hidden" aria-live="polite">
          Size {i + 1} of {READER_SIZES.length}
        </span>
        <IconButton
          label="Larger text"
          icon={<Plus size={18} />}
          disabled={i >= READER_SIZES.length - 1}
          onClick={() => setSize(READER_SIZES[Math.min(READER_SIZES.length - 1, i + 1)]!)}
        />
      </div>
    </div>
  );
}
