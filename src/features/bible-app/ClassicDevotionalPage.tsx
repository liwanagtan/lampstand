import { useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { Button } from '@/design-system/components';
import { paths } from '@/app/paths';
import { fromOsis } from '@/features/bible/ref';
import { KeyVerse } from './ClassicDevotional';
import { dayKey, useMorningEvening } from './morningEvening';
import { useOpenInReader } from './useOpenInReader';
import styles from './ClassicDevotional.module.css';
import { devotionalParagraphs } from './devotionalParagraphs';

/** A full-page reader: URL preserves the chosen date and morning/evening reading. */
export function ClassicDevotionalPage() {
  const { date = '', half = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const backToToday = () => (location.state?.fromToday ? navigate(-1) : navigate(paths.today));
  const parsed = new Date(`2000-${date}T12:00:00`);
  const valid =
    /^\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(parsed.getTime()) &&
    dayKey(parsed) === date &&
    (half === 'morning' || half === 'evening');
  const day = useMorningEvening(valid ? parsed : new Date());
  const reading = valid && day ? day[half as 'morning' | 'evening'] : null;
  const openInReader = useOpenInReader();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [date, half]);
  const range = reading?.ref ? fromOsis(reading.ref) : null;
  return (
    <article className={styles.readingPage}>
      <header>
        <p className={styles.eyebrow}>Spurgeon · Morning and Evening</p>
        <h1 ref={heading} tabIndex={-1} className={styles.readingTitle}>
          {valid
            ? `${half === 'morning' ? 'Morning' : 'Evening'}, ${new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric' }).format(parsed)}`
            : 'Reading not found'}
        </h1>
      </header>
      {valid && day === undefined ? (
        <p role="status">Loading your reading…</p>
      ) : reading ? (
        <>
          <KeyVerse reading={reading} large />
          <div className={styles.body}>
            {devotionalParagraphs(reading.body).map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
          <p className={styles.note}>
            Written by Charles H. Spurgeon in 1865. He quotes the King James Version in his text.
          </p>
          {range && (
            <Button
              variant="ghost"
              icon={<BookOpen size={16} />}
              onClick={() => openInReader(range)}
            >
              Open {reading.reference} in the Bible
            </Button>
          )}
          <Button variant="primary" icon={<ArrowLeft size={18} />} onClick={backToToday}>
            Back to Today
          </Button>
        </>
      ) : (
        <p>This reading isn’t available. Return to Today to choose another reading.</p>
      )}
    </article>
  );
}
