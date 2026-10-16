import { useNavigate } from 'react-router-dom';
import { BookOpen, Check, Copy, MonitorPlay, NotebookPen } from 'lucide-react';
import { Button, toast } from '@/design-system/components';
import { toOsis } from '@/features/bible/ref';
import { usePassage } from '@/slides/usePassage';
import { localDate, verseOfTheDay } from './dailyVerses';
import { VerseOfTheDay } from './VerseOfTheDay';
import { hasContent, useJournalEntry } from './journal';
import {
  PLAN_BY_ID,
  formatReading,
  nextUnread,
  planSchedule,
  setDayRead,
  usePlanProgress,
} from './plans';
import { useReader } from './readerStore';
import { showOnTv } from './tvActions';
import { useOpenInReader } from './useOpenInReader';
import styles from './Daily.module.css';

/** Show on TV and Copy for the verse of the day (Today page only). */
function TvActions() {
  const translation = useReader((s) => s.translation);
  const { ref, range } = verseOfTheDay();
  const osis = toOsis(range);
  const { passage } = usePassage(osis, translation);
  const copy = async () => {
    const text = passage?.verses
      .filter((v) => !v.missing)
      .map((v) => v.text)
      .join(' ');
    try {
      await navigator.clipboard.writeText(
        `${text ?? ''}\n— ${passage?.reference ?? ref} (${translation})`,
      );
      toast({ title: 'Copied the verse of the day', tone: 'success' });
    } catch {
      toast({ title: "Couldn't copy to the clipboard.", tone: 'warning' });
    }
  };
  return (
    <>
      <Button
        variant="ghost"
        icon={<MonitorPlay size={16} />}
        onClick={() => void showOnTv(osis, translation)}
      >
        Show on TV
      </Button>
      <Button variant="ghost" icon={<Copy size={16} />} onClick={() => void copy()}>
        Copy
      </Button>
    </>
  );
}

const longDate = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
});

/** Today: the verse of the day, today's plan readings and the journal, in one place. */
export function TodayPage() {
  const today = new Date();
  return (
    <div className={styles.page}>
      <p className={styles.eyebrow}>{longDate.format(today)}</p>
      <h1 className={styles.title}>Today</h1>
      <div className={styles.stack}>
        <VerseOfTheDay extra={<TvActions />} />
        <div className={styles.grid}>
          <TodayPlans />
          <TodayJournal />
        </div>
      </div>
    </div>
  );
}

function TodayPlans() {
  const navigate = useNavigate();
  const open = useOpenInReader();
  const progress = usePlanProgress();
  if (!progress) return <section className={styles.card} aria-label="Reading plans" />;
  if (progress.length === 0) {
    return (
      <section className={styles.card} aria-label="Reading plans">
        <h2 className={styles.cardTitle}>Reading plan</h2>
        <p className={styles.muted}>
          A little every day goes a long way. Pick a plan — from 30 days to a year.
        </p>
        <div className={styles.row}>
          <Button variant="primary" onClick={() => navigate('/bible/plans')}>
            Choose a plan
          </Button>
        </div>
      </section>
    );
  }
  return (
    <>
      {progress.map((p) => {
        const plan = PLAN_BY_ID.get(p.planId);
        if (!plan) return null;
        const next = nextUnread(p, plan);
        const reading = next ? planSchedule(plan)[next - 1]! : null;
        const pct = Math.round((p.done.length / plan.days) * 100);
        return (
          <section key={p.planId} className={styles.card} aria-label={plan.name}>
            <div className={styles.cardHead}>
              <h2 className={styles.cardTitle}>{plan.name}</h2>
              <span className={styles.cardMeta}>
                {p.done.length} of {plan.days} days
              </span>
            </div>
            <div
              className={styles.progress}
              role="progressbar"
              aria-label={`${plan.name} progress`}
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className={styles.progressBar} style={{ width: `${pct}%` }} />
            </div>
            {reading ? (
              <>
                <p className={styles.muted}>Day {next}</p>
                <p className={styles.reading}>{formatReading(reading)}</p>
                <div className={styles.row}>
                  <Button
                    icon={<BookOpen size={16} />}
                    onClick={() =>
                      open(
                        {
                          start: { ...reading[0]!, verse: 1 },
                          end: { ...reading[0]!, verse: 1 },
                        },
                        false,
                      )
                    }
                  >
                    Read
                  </Button>
                  <Button
                    variant="ghost"
                    icon={<Check size={16} />}
                    onClick={() => void setDayRead(p.planId, next!, true)}
                  >
                    Mark day {next} read
                  </Button>
                </div>
              </>
            ) : (
              <p className={styles.done}>
                <Check size={16} aria-hidden /> Plan complete. Well done!
              </p>
            )}
          </section>
        );
      })}
    </>
  );
}

function TodayJournal() {
  const navigate = useNavigate();
  const entry = useJournalEntry(localDate());
  const written = hasContent(entry ?? undefined);
  return (
    <section className={styles.card} aria-label="Journal">
      <h2 className={styles.cardTitle}>Journal</h2>
      {written ? (
        <p className={styles.done}>
          <Check size={16} aria-hidden /> You wrote today.
        </p>
      ) : (
        <p className={styles.muted}>
          Take five quiet minutes with today’s verse. A few simple questions help you listen and
          respond.
        </p>
      )}
      <div className={styles.row}>
        <Button
          variant={written ? 'secondary' : 'primary'}
          icon={<NotebookPen size={16} />}
          onClick={() => navigate('/bible/journal')}
        >
          {written ? 'Open journal' : 'Start writing'}
        </Button>
      </div>
    </section>
  );
}
