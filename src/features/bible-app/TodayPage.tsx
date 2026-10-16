import { useNavigate } from 'react-router-dom';
import { Check, Copy, MonitorPlay, NotebookPen } from 'lucide-react';
import { Button, toast } from '@/design-system/components';
import { toOsis } from '@/features/bible/ref';
import { usePassage } from '@/slides/usePassage';
import { localDate, verseOfTheDay } from './dailyVerses';
import { VerseOfTheDay } from './VerseOfTheDay';
import { hasContent, useJournalEntry } from './journal';
import { usePlanProgress, usePlans } from './plans';
import { ActivePlan } from './PlansPage';
import { useReader } from './readerStore';
import { showOnTv } from './tvActions';
import styles from './Daily.module.css';

/** Present and Copy for the verse of the day (Today page only). */
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
        Present
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
  const plans = usePlans();
  const progress = usePlanProgress();
  if (!progress || !plans) return <section className={styles.card} aria-label="Reading plans" />;
  const active = progress.flatMap((p) => {
    const plan = plans.find((x) => x.id === p.planId);
    return plan ? [{ plan, p }] : [];
  });
  if (active.length === 0) {
    return (
      <section className={styles.card} aria-label="Reading plans">
        <h2 className={styles.cardTitle}>Reading plan</h2>
        <p className={styles.muted}>
          A little every day goes a long way. Pick a plan — from a month of Psalms to weekly
          Sunday-school lessons.
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
      {active.map(({ plan, p }) => (
        <ActivePlan key={plan.id} plan={plan} progress={p} compact />
      ))}
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
