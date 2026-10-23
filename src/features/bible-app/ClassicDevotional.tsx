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
 * Today's classic devotional: Spurgeon's Morning and Evening (1865). His key verse shows in your
 * translation; his words stay as he wrote them, King James quotations included.
 */
export function ClassicDevotional({ now }: { now: Date }) {
  const phone = useIsPhone();
  const navigate = useNavigate();
  const location = useLocation();
  const day = useMorningEvening(now);
  const [half, setHalf] = useState(halfOfDay(now));
  const [open, setOpen] = useState(false);
  if (day === null) return null;
  const reading = day?.[half];
  return (
    <section className={styles.card} aria-label="Classic devotional">
      <div className={styles.head}>
        <p className={styles.eyebrow}>Classic devotional · Spurgeon, 1865</p>
        <div className={styles.halves} role="radiogroup" aria-label="Reading">
          {(['morning', 'evening'] as const).map((h) => (
            <button
              key={h}
              type="button"
              role="radio"
              aria-checked={half === h}
              className={styles.half}
              onClick={() => setHalf(h)}
            >
              {h === 'morning' ? (
                <Sunrise size={14} aria-hidden />
              ) : (
                <Sunset size={14} aria-hidden />
              )}
              {h === 'morning' ? 'Morning' : 'Evening'}
            </button>
          ))}
        </div>
      </div>
      {reading ? (
        <>
          <KeyVerse reading={reading} />
          <p className={styles.preview}>{reading.body[0]}</p>
          <div className={styles.row}>
            <Button
              icon={<BookOpen size={16} />}
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
      ) : (
        <p className={styles.preview} aria-busy="true">
          &nbsp;
        </p>
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
