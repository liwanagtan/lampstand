import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useIsPhone } from '@/app/useIsPhone';
import { paths } from '@/app/paths';
import { BookOpen, Sunrise, Sunset } from 'lucide-react';
import { Button, Sheet, cx } from '@/design-system/components';
import { fromOsis } from '@/features/bible/ref';
import { usePassage } from '@/slides/usePassage';
import { dayKey, halfOfDay, useMorningEvening, type ClassicReading } from './morningEvening';
import { useReader } from './readerStore';
import { useOpenInReader } from './useOpenInReader';
import styles from './ClassicDevotional.module.css';
import { devotionalParagraphs } from './devotionalParagraphs';

const dateFormat = new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric' });

/**
 * The devotional as one row of Today's Go deeper card: Morning or Evening, his opening line,
 * and Read in full (a sheet on laptops, its own page on phones).
 */
export function SpurgeonRow({ now, className }: { now: Date; className?: string }) {
  const phone = useIsPhone();
  const navigate = useNavigate();
  const location = useLocation();
  const day = useMorningEvening(now);
  const [half, setHalf] = useState(halfOfDay(now));
  const [open, setOpen] = useState(false);
  if (day === null) return null;
  const reading = day?.[half];
  return (
    <section className={className} aria-label="Classic devotional">
      <div className={styles.rowHead}>
        <p className={styles.eyebrow}>Spurgeon, 1865</p>
        <div className={cx(styles.halves, styles.halvesSmall)} role="radiogroup" aria-label="Reading">
          {(['morning', 'evening'] as const).map((h) => (
            <button
              key={h}
              type="button"
              role="radio"
              aria-checked={half === h}
              className={styles.half}
              onClick={() => setHalf(h)}
            >
              {h === 'morning' ? <Sunrise size={13} aria-hidden /> : <Sunset size={13} aria-hidden />}
              {h === 'morning' ? 'Morning' : 'Evening'}
            </button>
          ))}
        </div>
      </div>
      <p className={styles.rowQuote}>{reading ? `“${reading.quote}”` : ' '}</p>
      {reading && (
        <>
          <div className={styles.row}>
            <Button
              size="sm"
              icon={<BookOpen size={15} />}
              onClick={() =>
                phone
                  ? navigate(paths.devotional(dayKey(now), half), {
                      state: { fromToday: location.key },
                    })
                  : setOpen(true)
              }
            >
              Read in full
            </Button>
          </div>
          <ClassicSheet
            open={open}
            onOpenChange={setOpen}
            reading={reading}
            title={`${half === 'morning' ? 'Morning' : 'Evening'}, ${dateFormat.format(now)}`}
          />
        </>
      )}
    </section>
  );
}

/** His key verse in the reader's translation (his own quotation if it can't be found). */
export function KeyVerse({ reading, large = false }: { reading: ClassicReading; large?: boolean }) {
  const translation = useReader((s) => s.translation);
  const { passage } = usePassage(reading.ref, translation);
  const text = passage?.verses
    .filter((v) => !v.missing)
    .map((v) => v.text)
    .join(' ');
  return (
    <figure className={cx(styles.verse, large && styles.verseLarge)}>
      <blockquote>{text || reading.quote}</blockquote>
      <figcaption>
        {reading.reference}
        {text ? <span className={styles.code}>{translation}</span> : null}
      </figcaption>
    </figure>
  );
}

function ClassicSheet({
  open,
  onOpenChange,
  reading,
  title,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  reading: ClassicReading;
  title: string;
}) {
  const openInReader = useOpenInReader();
  const range = reading.ref ? fromOsis(reading.ref) : null;
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      eyebrow="Spurgeon · Morning and Evening"
      title={title}
      footer={
        range ? (
          <Button variant="ghost" icon={<BookOpen size={16} />} onClick={() => openInReader(range)}>
            Open {reading.reference} in the Bible
          </Button>
        ) : undefined
      }
    >
      <KeyVerse reading={reading} large />
      <div className={styles.body}>
        {devotionalParagraphs(reading.body).map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      <p className={styles.note}>
        Written by Charles H. Spurgeon in 1865. He quotes the King James Version in his text.
      </p>
    </Sheet>
  );
}
