import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  BookOpen,
  Check,
  Copy,
  MonitorPlay,
  MonitorStop,
  NotebookPen,
  Sparkles,
} from 'lucide-react';
import { Button, IconButton, Tooltip, cx, toast } from '@/design-system/components';
import { db } from '@/db/db';
import { formatRef, toOsis } from '@/features/bible/ref';
import { backgroundUrl, loadBackgrounds } from '@/features/library/backgrounds';
import { useControl } from '@/features/present/live/controlStore';
import { closeOutput } from '@/features/present/live/outputWindow';
import { useReducedMotion } from '@/features/settings/theme';
import { usePassage } from '@/slides/usePassage';
import { localDate, localDayNumber, verseOfTheDay } from './dailyVerses';
import { entryHasContent, entryPreview, useReflection } from './journal';
import { usePlanProgress, usePlans } from './plans';
import { ActivePlan } from './PlansPage';
import { useReader } from './readerStore';
import { ContextPanel, ReflectPanel } from './TodayPanels';
import { showOnTv } from './tvActions';
import styles from './Today.module.css';

const longDate = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
});
const weekday = new Intl.DateTimeFormat(undefined, { weekday: 'narrow' });
const weekdayLong = new Intl.DateTimeFormat(undefined, { weekday: 'long' });

function greeting(d: Date): string {
  const h = d.getHours();
  if (h < 5) return 'Peace to you tonight';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/** Today: the verse of the day, this week, your plans and your reflection, in one place. */
export function TodayPage() {
  const now = useMemo(() => new Date(), []);
  const date = localDate(now);
  const { range } = verseOfTheDay(now);
  const [panel, setPanel] = useState<'context' | 'reflect' | null>(null);
  const reduced = useReducedMotion();

  return (
    <div className={styles.page}>
      <motion.header
        className={styles.greeting}
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <p className={styles.date}>{longDate.format(now)}</p>
        <h1 className={styles.hello}>{greeting(now)}</h1>
      </motion.header>

      <VerseHero
        now={now}
        onContext={() => setPanel('context')}
        onReflect={() => setPanel('reflect')}
      />

      <WeekStrip now={now} />

      <div className={styles.grid}>
        <TodayPlans />
        <ReflectionCard date={date} onReflect={() => setPanel('reflect')} />
      </div>

      <ContextPanel
        key={panel === 'context' ? 'open' : 'closed'}
        range={range}
        open={panel === 'context'}
        onOpenChange={(o) => setPanel(o ? 'context' : null)}
      />
      <ReflectPanel
        date={date}
        range={range}
        open={panel === 'reflect'}
        onOpenChange={(o) => setPanel(o ? 'reflect' : null)}
      />
    </div>
  );
}

/** Present / Stop Presenting for one verse. A session Today started ends when you leave Today. */
function usePresentVerse(osis: string, translation: string) {
  const startedHere = useRef(false);
  const presenting = useControl((s) => s.presenting);
  const overlayRef = useControl((s) => s.live.overlay?.ref);
  const live = presenting && overlayRef === osis;

  const end = () => {
    if (!startedHere.current) return;
    startedHere.current = false;
    useControl.getState().setPresenting(false);
    closeOutput();
  };

  useEffect(() => {
    window.addEventListener('pagehide', end);
    return () => {
      window.removeEventListener('pagehide', end);
      end();
    };
  }, []);

  const present = async () => {
    const was = useControl.getState().presenting;
    await showOnTv(osis, translation);
    if (!was && useControl.getState().presenting) startedHere.current = true;
  };
  const stop = () => {
    useControl.getState().dispatch({ type: 'clearOverlay' });
    end();
  };
  return { live, present, stop };
}

/** One of the bundled photos, a different one each day. */
function useDailyPhoto(now: Date): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void loadBackgrounds().then((list) => {
      if (!alive || list.length === 0) return;
      setUrl(backgroundUrl(list[localDayNumber(now) % list.length]!.file));
    });
    return () => {
      alive = false;
    };
  }, [now]);
  return url;
}

function VerseHero({
  now,
  onContext,
  onReflect,
}: {
  now: Date;
  onContext: () => void;
  onReflect: () => void;
}) {
  const translation = useReader((s) => s.translation);
  const reduced = useReducedMotion();
  const { ref, range } = verseOfTheDay(now);
  const osis = toOsis(range);
  const { passage } = usePassage(osis, translation);
  const photo = useDailyPhoto(now);
  const { live, present, stop } = usePresentVerse(osis, translation);
  const text = passage?.verses
    .filter((v) => !v.missing)
    .map((v) => v.text)
    .join(' ');
  const label = passage?.reference ?? ref;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`“${text ?? ''}”\n— ${label} (${translation})`);
      toast({ title: 'Copied the verse of the day', tone: 'success' });
    } catch {
      toast({ title: "Couldn't copy to the clipboard.", tone: 'warning' });
    }
  };

  return (
    <motion.section
      className={styles.hero}
      aria-label="Verse of the day"
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.05 }}
    >
      {photo && (
        <img
          className={cx(styles.heroPhoto, !reduced && styles.heroPhotoDrift)}
          src={photo}
          alt=""
        />
      )}
      <div className={styles.heroScrim} aria-hidden />
      <div className={styles.heroBody}>
        <p className={styles.heroEyebrow}>
          <Sparkles size={14} aria-hidden /> Verse of the day
        </p>
        <blockquote className={styles.heroText}>{text ? `“${text}”` : ' '}</blockquote>
        <p className={styles.heroRef}>
          {label} <span>{translation}</span>
        </p>
        <div className={styles.heroActions}>
          <Button icon={<BookOpen size={16} />} onClick={onContext} className={styles.heroButton}>
            Read in context
          </Button>
          <Button
            icon={<NotebookPen size={16} />}
            onClick={onReflect}
            className={styles.heroButton}
          >
            Reflect
          </Button>
          {live ? (
            <Button
              icon={<MonitorStop size={16} />}
              onClick={stop}
              className={cx(styles.heroButton, styles.live)}
            >
              Stop Presenting
            </Button>
          ) : (
            <Button
              icon={<MonitorPlay size={16} />}
              onClick={() => void present()}
              className={styles.heroButton}
            >
              Present
            </Button>
          )}
          <Tooltip content="Copy">
            <IconButton
              label="Copy the verse"
              icon={<Copy size={16} />}
              onClick={() => void copy()}
              className={styles.heroIcon}
            />
          </Tooltip>
        </div>
      </div>
    </motion.section>
  );
}

/** This week at a glance: days you read a plan or wrote in your journal. No streaks, no guilt. */
function WeekStrip({ now }: { now: Date }) {
  const today = localDayNumber(now);
  const start = today - now.getDay();
  const days = Array.from({ length: 7 }, (_, i) => start + i);
  const active = useLiveQuery(async () => {
    const set = new Set<number>();
    const [plans, entries] = await Promise.all([db.plans.toArray(), db.entries.toArray()]);
    for (const p of plans)
      for (const t of Object.values(p.doneAt ?? {})) set.add(localDayNumber(new Date(t)));
    for (const e of entries) {
      const [y, m, d] = e.date.split('-').map(Number);
      set.add(localDayNumber(new Date(y!, m! - 1, d!)));
    }
    return set;
  }, []);
  const count = days.filter((d) => active?.has(d)).length;
  const dateOf = (n: number) =>
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + (n - today));

  return (
    <section className={styles.week} aria-label="This week">
      <div className={styles.weekText}>
        <h2 className={styles.weekTitle}>This week</h2>
        <p className={styles.weekSub}>
          {count === 0
            ? 'Every day is a fresh start.'
            : count === 1
              ? '1 day with the Word so far.'
              : `${count} days with the Word so far.`}
        </p>
      </div>
      <ol className={styles.weekDays}>
        {days.map((d) => {
          const on = active?.has(d) ?? false;
          return (
            <li
              key={d}
              className={cx(
                styles.weekDay,
                on && styles.weekOn,
                d === today && styles.weekToday,
                d > today && styles.weekLater,
              )}
              aria-label={`${weekdayLong.format(dateOf(d))}${on ? ': time in the Word' : ''}`}
            >
              <span className={styles.weekDot}>{on && <Check size={14} aria-hidden />}</span>
              <span className={styles.weekLetter} aria-hidden>
                {weekday.format(dateOf(d))}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
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
        <h2 className={styles.cardTitle}>Start a reading plan</h2>
        <p className={styles.muted}>
          A little every day goes a long way. From a month of Psalms to weekly Sunday-school
          lessons.
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

function ReflectionCard({ date, onReflect }: { date: string; onReflect: () => void }) {
  const entry = useReflection(date);
  const written = entryHasContent(entry);
  const { range } = verseOfTheDay();
  return (
    <section className={cx(styles.card, styles.reflect)} aria-label="Reflection">
      <h2 className={styles.cardTitle}>{written ? 'Your reflection' : 'Take five minutes'}</h2>
      {written && entry ? (
        <>
          <p className={styles.preview}>“{entryPreview(entry)}”</p>
          <p className={styles.done}>
            <Check size={16} aria-hidden /> Saved to your journal
          </p>
        </>
      ) : (
        <p className={styles.muted}>
          Sit with {formatRef(range)} for a moment. What is God saying to you? A few simple
          questions can help.
        </p>
      )}
      <div className={styles.row}>
        <Button
          variant={written ? 'secondary' : 'primary'}
          icon={<NotebookPen size={16} />}
          onClick={onReflect}
        >
          {written ? 'Keep writing' : 'Reflect'}
        </Button>
      </div>
    </section>
  );
}
