import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
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
  X,
} from 'lucide-react';
import { Button, IconButton, cx, toast } from '@/design-system/components';
import { db } from '@/db/db';
import { BOOK_BY_CODE } from '@/features/bible/books';
import { formatRef, toOsis } from '@/features/bible/ref';
import {
  addBundledBackground,
  backgroundUrl,
  loadBackgrounds,
  type BackgroundEntry,
} from '@/features/library/backgrounds';
import { useControl } from '@/features/present/live/controlStore';
import { closeOutput } from '@/features/present/live/outputWindow';
import type { LiveState } from '@/features/present/live/types';
import { useReducedMotion } from '@/features/settings/theme';
import { useSettings } from '@/features/settings/settingsStore';
import { usePassage } from '@/slides/usePassage';
import { localDate, localDayNumber, verseOfTheDay } from './dailyVerses';
import { entryHasContent, entryPreview, useReflection } from './journal';
import { currentDay, formatDay, isPlanFinished, usePlanProgress, usePlans } from './plans';
import { ActivePlan } from './ActivePlan';
import { useReader } from './readerStore';
import { ContextPanel, ReflectPanel } from './TodayPanels';
import { showOnTv } from './tvActions';
import { FlameCompanion } from '@/design-system/FlameCompanion';
import { ClassicDevotional } from './ClassicDevotional';
import styles from './Today.module.css';
import { useIsPhone } from '@/app/useIsPhone';
import { paths } from '@/app/paths';
import { biblePosition, recentPlanDay } from './readingResume';
import { track } from '@/features/insights/insights';
import { SaveOffer } from '@/features/account/SaveOffer';
import { accountStorageKey } from '@/features/account/storage';

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
  const name = useSettings((s) => s.profile.name.trim().split(/\s+/)[0] ?? '');
  const classic = useSettings((s) => s.classicDevotional);
  // Shown to everyone; it can be turned off in Settings › Reading.
  const showSalvation = useSettings((s) => s.faithFoundations);
  const phone = useIsPhone();
  const progress = usePlanProgress();
  const plans = usePlans();
  const finishedToday = progress
    ?.flatMap((p) =>
      Object.entries(p.doneAt ?? {})
        .filter(([, t]) => localDate(new Date(t)) === date)
        .map(([day, timestamp]) => ({
          plan: plans?.find((x) => x.id === p.planId),
          day: Number(day),
          timestamp,
        })),
    )
    .filter((p) => p.plan)
    .sort((a, b) => b.timestamp - a.timestamp)[0];
  const evening = phone && now.getHours() >= 17 && Boolean(finishedToday);

  return (
    <div className={styles.page} data-evening={evening || undefined}>
      <motion.header
        className={styles.greeting}
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <p className={styles.date}>{longDate.format(now)}</p>
        <h1 className={styles.hello}>
          {greeting(now)}
          {name ? `, ${name}` : ''}
        </h1>
      </motion.header>

      <div className={styles.cols}>
        {phone ? (
          <>
            {/* With a plan going, today's reading comes first: it is what you came to do. */}
            <div className={styles.plansSlot}>
              <TodayPlans />
            </div>
            <div className={styles.verseSlot}>
              <VerseHero
                now={now}
                onContext={() => setPanel('context')}
                onReflect={() => setPanel('reflect')}
              />
            </div>
            {evening && finishedToday?.plan && (
              <Link className={styles.eveningRead} to={paths.planPage(finishedToday.plan.id)}>
                <Check size={22} aria-hidden />
                <span>
                  <strong>
                    Day {finishedToday.day} read ·{' '}
                    {formatDay(finishedToday.plan.days[finishedToday.day - 1]!)}
                  </strong>
                  <small>{finishedToday.plan.name} · Carry on at your pace</small>
                </span>
              </Link>
            )}
            {showSalvation && <SalvationInvitation />}
            <div className={styles.weekSlot}>
              <WeekStrip now={now} />
            </div>
            <div className={styles.reflectSlot}>
              <ReflectionCard date={date} onReflect={() => setPanel('reflect')} />
            </div>
            {classic && (
              <div className={styles.classicSlot}>
                <ClassicDevotional now={now} />
              </div>
            )}
          </>
        ) : (
          <>
            <div className={styles.main}>
              <TodayPlans />
              <VerseHero
                now={now}
                onContext={() => setPanel('context')}
                onReflect={() => setPanel('reflect')}
              />
              {showSalvation && <SalvationInvitation />}
              {classic && <ClassicDevotional now={now} />}
            </div>
            <aside className={styles.aside} aria-label="Your daily reading">
              <WeekStrip now={now} />
              <ReflectionCard date={date} onReflect={() => setPanel('reflect')} />
            </aside>
          </>
        )}
      </div>

      <SaveOffer />
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

function SalvationInvitation() {
  return (
    <Link className={styles.salvationInvitation} to={paths.salvation}>
      <span>
        <small>FAITH FOUNDATIONS</small>
        <strong>Understanding salvation</strong>
        <span>Begin with the good news of Jesus Christ. Read at your own pace.</span>
      </span>
      <BookOpen size={22} aria-hidden />
    </Link>
  );
}

/** Present / Stop Presenting for one verse. A session Today started ends when you leave Today. */
function usePresentVerse(osis: string, translation: string, photo: BackgroundEntry | null) {
  const startedHere = useRef(false);
  // The TV's own background, put back when Today stops showing its verse.
  const before = useRef<LiveState['backdrop'] | undefined>(undefined);
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

  // The screen looks like the card: today's photo behind the verse, full screen.
  const present = async () => {
    const was = useControl.getState().presenting;
    await showOnTv(osis, translation, 'fullScreen', 'card');
    if (!useControl.getState().presenting) return;
    if (!was) startedHere.current = true;
    if (photo) {
      const assetId = await addBundledBackground(photo);
      if (before.current === undefined) before.current = useControl.getState().live.backdrop;
      useControl.getState().dispatch({
        type: 'backdrop',
        backdrop: { type: 'image', description: photo.description, assetId, motion: 'drift' },
      });
    }
  };
  const stop = () => {
    useControl.getState().dispatch({ type: 'clearOverlay' });
    if (before.current !== undefined) {
      useControl.getState().dispatch({ type: 'backdrop', backdrop: before.current });
      before.current = undefined;
    }
    end();
  };
  return { live, present, stop };
}

/** One of the bundled photos, a different one each day. */
function useDailyPhoto(now: Date): BackgroundEntry | null {
  const [entry, setEntry] = useState<BackgroundEntry | null>(null);
  useEffect(() => {
    let alive = true;
    void loadBackgrounds().then((list) => {
      if (!alive || list.length === 0) return;
      setEntry(list[localDayNumber(now) % list.length]!);
    });
    return () => {
      alive = false;
    };
  }, [now]);
  return entry;
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
  const daily = useDailyPhoto(now);
  const { live, present, stop } = usePresentVerse(osis, translation, daily);
  const text = passage?.verses
    .filter((v) => !v.missing)
    .map((v) => v.text)
    .join(' ');
  const label = passage?.reference ?? ref;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        `“${text ?? ''}”\n— ${label} (${translation})${passage?.copyright ? `\n\n${passage.copyright}` : ''}`,
      );
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
      {daily && <img className={styles.heroPhoto} src={backgroundUrl(daily.file)} alt="" />}
      <div className={styles.heroBody}>
        <p className={styles.heroEyebrow}>
          <Sparkles size={14} aria-hidden /> Verse of the day
        </p>
        <blockquote className={styles.heroText}>{text ? `“${text}”` : ' '}</blockquote>
        <p className={styles.heroRef}>
          {label} <span>{translation}</span>
        </p>
        {passage?.copyright && <small>{passage.copyright}</small>}
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
          {/* Putting Scripture on a TV is a laptop job: phones don't offer it. */}
          {live ? (
            <Button
              icon={<MonitorStop size={16} />}
              onClick={stop}
              className={cx(styles.heroButton, styles.live, 'laptop-only')}
            >
              Stop showing
            </Button>
          ) : (
            <Button
              icon={<MonitorPlay size={16} />}
              onClick={() => void present()}
              className={cx(styles.heroButton, 'laptop-only')}
            >
              Show on screen
            </Button>
          )}
          {/* A visible word, like its neighbours: phones never show tooltips. */}
          <Button
            icon={<Copy size={16} />}
            aria-label="Copy the verse"
            onClick={() => void copy()}
            className={cx(styles.heroButton, styles.heroQuiet)}
          >
            Copy
          </Button>
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
            ? 'Today is a good day to begin.'
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

const RESUME_HIDDEN_KEY = 'lampstand.resumeHidden';

/** The chapter whose Continue reading bar was closed; it returns for the next chapter read. */
function useHiddenResume(): [string | null, (place: string) => void] {
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(accountStorageKey(RESUME_HIDDEN_KEY));
    } catch {
      return null;
    }
  });
  const hide = (place: string) => {
    setHidden(place);
    try {
      localStorage.setItem(accountStorageKey(RESUME_HIDDEN_KEY), place);
    } catch {
      // Hidden for this visit only.
    }
  };
  return [hidden, hide];
}

function TodayPlans() {
  const plans = usePlans();
  const progress = usePlanProgress();
  const recent = recentPlanDay();
  const book = useReader((s) => s.book);
  const chapter = useReader((s) => s.chapter);
  const translation = useReader((s) => s.translation);
  const hasReadBible = useReader((s) => s.recent.length > 0) || biblePosition(book, chapter) > 0;
  const [hiddenResume, hideResume] = useHiddenResume();
  const place = `${book}.${chapter}`;
  if (!progress || !plans) return <section className={styles.card} aria-label="Reading plans" />;
  const active = progress
    .flatMap((p) => {
      const plan = plans.find((x) => x.id === p.planId);
      return plan && !p.pausedAt && !isPlanFinished(plan, p) ? [{ plan, p }] : [];
    })
    .sort((a, b) => {
      const aRecent =
        recent?.planId === a.plan.id &&
        Boolean(a.plan.days[recent.day - 1]) &&
        !a.p.done.includes(recent.day) &&
        currentDay(a.plan, a.p).kind === 'read';
      const bRecent =
        recent?.planId === b.plan.id &&
        Boolean(b.plan.days[recent.day - 1]) &&
        !b.p.done.includes(recent.day) &&
        currentDay(b.plan, b.p).kind === 'read';
      if (aRecent !== bRecent) return Number(bRecent) - Number(aRecent);
      const aReady = currentDay(a.plan, a.p).kind === 'read';
      const bReady = currentDay(b.plan, b.p).kind === 'read';
      return Number(bReady) - Number(aReady) || b.p.updatedAt - a.p.updatedAt;
    });
  if (active.length === 0) {
    // Only resume something real: a plan, or a chapter actually read. No placeholder John 1.
    if (!hasReadBible || hiddenResume === place) return null;
    return (
      <section className={styles.continueReading} aria-label="Continue reading">
        <div className={styles.continueContent}>
          <h2>Continue reading</h2>
          <p className={styles.continuePlace}>
            {BOOK_BY_CODE.get(book)?.refName ?? book} {chapter} <span>· {translation}</span>
          </p>
        </div>
        <Link
          className={styles.continueButton}
          to={paths.bible}
          onClick={() => track('reading_resumed')}
        >
          Continue
        </Link>
        <IconButton
          label="Hide"
          icon={<X size={16} />}
          size="sm"
          className={styles.continueHide}
          onClick={() => hideResume(place)}
        />
      </section>
    );
  }
  return (
    <>
      <section className={styles.nextReading} aria-label="Continue your reading">
        <h2 className={styles.nextHeading}>
          {currentDay(active[0]!.plan, active[0]!.p).kind === 'read'
            ? 'Continue your reading'
            : 'Your reading plan'}
        </h2>
        <ActivePlan
          plan={active[0]!.plan}
          progress={active[0]!.p}
          compact
          resumeDay={recent?.planId === active[0]!.plan.id ? recent.day : undefined}
        />
      </section>
      {active.length > 1 && (
        <details className={styles.otherPlans}>
          <summary>Other reading plans ({active.length - 1})</summary>
          <div className={styles.otherPlansList}>
            {active.slice(1).map(({ plan, p }) => (
              <ActivePlan key={plan.id} plan={plan} progress={p} compact />
            ))}
          </div>
        </details>
      )}
    </>
  );
}

function ReflectionCard({ date, onReflect }: { date: string; onReflect: () => void }) {
  const entry = useReflection(date);
  const written = entryHasContent(entry);
  const { range } = verseOfTheDay();
  return (
    <section className={cx(styles.card, styles.reflect)} aria-label="Reflection">
      {!written && <FlameCompanion size={96} className={styles.companion} />}
      <div className={styles.reflectBody}>
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
            variant={written ? 'secondary' : 'gold'}
            icon={<NotebookPen size={16} />}
            onClick={onReflect}
          >
            {written ? 'Keep writing' : 'Reflect'}
          </Button>
        </div>
      </div>
    </section>
  );
}
