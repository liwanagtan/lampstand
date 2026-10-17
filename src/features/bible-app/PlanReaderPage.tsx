import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  MessageCircleQuestion,
  NotebookPen,
} from 'lucide-react';
import { Button, EmptyState, IconButton, Select, Tooltip } from '@/design-system/components';
import { useBible } from '@/features/bible/bibleStore';
import { BOOK_BY_CODE } from '@/features/bible/books';
import { formatRef, toOsis } from '@/features/bible/ref';
import { localDate } from './dailyVerses';
import { newEntryId, type EntryDraft } from './journal';
import { EntrySheet } from './JournalEntrySheet';
import { useReducedMotion } from '@/features/settings/theme';
import {
  chapterChunks,
  currentDay,
  formatDay,
  isLessons,
  readableNext,
  readingMinutes,
  setDayRead,
  startPlan,
  usePlan,
  usePlanProgressFor,
  type Plan,
} from './plans';
import { READER_SIZES, useReader } from './readerStore';
import { useChapter } from './useChapter';
import styles from './PlanReader.module.css';
import { paths } from '@/app/paths';
import { MarkedVerseText } from './MarkedVerse';
import { useVisibleMarks } from './marks';

const dateFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
});

/** One plan day, on its own: the readings, then a button to finish the day. */
export function PlanReaderPage() {
  const { planId = '', day: dayParam = '' } = useParams();
  const plan = usePlan(planId);
  const progress = usePlanProgressFor(planId);
  const n = Number(dayParam);
  const navigate = useNavigate();
  const top = useRef<HTMLDivElement>(null);
  const [reflect, setReflect] = useState<{ id: string; draft?: EntryDraft } | null>(null);

  useEffect(() => {
    top.current?.closest('[data-scroll]')?.scrollTo({ top: 0 });
  }, [planId, n]);

  if (plan === undefined || progress === undefined)
    return <div className={styles.page} aria-busy="true" />;
  const day = plan?.days[n - 1];
  if (!plan || !day) {
    return (
      <div className={styles.page}>
        <EmptyState
          title="This reading isn't available"
          actions={<Button onClick={() => navigate(paths.plans)}>Back to plans</Button>}
        >
          The plan may have been removed.
        </EmptyState>
      </div>
    );
  }

  const unit = isLessons(plan) ? 'Lesson' : 'Day';
  const done = Boolean(progress?.done.includes(n));

  return (
    <div className={styles.page} ref={top} data-enter>
      <header className={styles.header}>
        <Link to={paths.plans} className={styles.back}>
          <ArrowLeft size={16} aria-hidden /> {plan.name}
        </Link>
        <p className={styles.eyebrow}>
          {unit} {n} of {plan.days.length}
        </p>
        <h1 className={styles.title}>{day.title ?? formatDay(day)}</h1>
        <p className={styles.meta}>
          {day.title && <span>{formatDay(day)}</span>}
          <span>
            <Clock size={14} aria-hidden /> About {readingMinutes(day)} min
          </span>
        </p>
        <ReaderOptions />
      </header>

      {day.note && <p className={styles.note}>{day.note}</p>}

      {day.readings.map((r, i) => (
        <section key={i} className={styles.reading} aria-label={formatRef(r)}>
          {chapterChunks(r).map((c) => (
            <ChapterBlock key={`${c.book}.${c.chapter}`} {...c} />
          ))}
        </section>
      ))}

      {day.devotional && (
        <section className={styles.devotional} aria-label="Devotional">
          {day.devotional.split(/\n{2,}/).map((para, k) => (
            <p key={k}>{para}</p>
          ))}
        </section>
      )}

      {day.questions && day.questions.length > 0 && (
        <section className={styles.questions} aria-label="Questions">
          <h2>
            <MessageCircleQuestion size={18} aria-hidden />
            {plan.audience === 'group' ? 'Talk about it' : 'Think about it'}
          </h2>
          <ol>
            {day.questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ol>
        </section>
      )}

      {day.prayer && (
        <section className={styles.prayer} aria-label="Prayer">
          <h2>Pray</h2>
          <p>{day.prayer}</p>
        </section>
      )}

      <div className={styles.reflectRow}>
        <Button
          variant="secondary"
          icon={<NotebookPen size={16} />}
          onClick={() =>
            setReflect({
              id: newEntryId(),
              draft: {
                id: '',
                date: localDate(),
                kind: 'reflection',
                ref: toOsis(day.readings[0]!),
                title: `${plan.name} · ${unit} ${n}`,
                body: '',
              },
            })
          }
        >
          Reflect on this {unit.toLowerCase()}
        </Button>
      </div>
      <EntrySheet target={reflect} onClose={() => setReflect(null)} />

      <FinishBlock plan={plan} day={n} done={done} unit={unit} />
    </div>
  );
}

function ReaderOptions() {
  const translation = useReader((s) => s.translation);
  const size = useReader((s) => s.size);
  const translations = useBible((s) => s.translations);
  const i = READER_SIZES.indexOf(size);
  return (
    <div className={styles.options}>
      <Select
        label="Translation"
        hideLabel
        aria-label="Translation"
        size="sm"
        value={translation}
        onChange={(v) => useReader.getState().setTranslation(v)}
        options={translations.map((t) => ({ value: t.code, label: `${t.code} — ${t.name}` }))}
        className={styles.select}
      />
      <Tooltip content="Smaller text">
        <IconButton
          label="Smaller text"
          size="sm"
          icon={<span className={styles.aSmall}>A−</span>}
          disabled={i <= 0}
          onClick={() => useReader.getState().setSize(READER_SIZES[Math.max(0, i - 1)]!)}
        />
      </Tooltip>
      <Tooltip content="Larger text">
        <IconButton
          label="Larger text"
          size="sm"
          icon={<span className={styles.aLarge}>A+</span>}
          disabled={i >= READER_SIZES.length - 1}
          onClick={() =>
            useReader.getState().setSize(READER_SIZES[Math.min(READER_SIZES.length - 1, i + 1)]!)
          }
        />
      </Tooltip>
    </div>
  );
}

function ChapterBlock({
  book,
  chapter,
  from,
  to,
}: {
  book: string;
  chapter: number;
  from: number;
  to: number;
}) {
  const translation = useReader((s) => s.translation);
  const size = useReader((s) => s.size);
  const passage = useChapter(translation, book, chapter);
  const marks = useVisibleMarks(book, chapter);
  const b = BOOK_BY_CODE.get(book)!;
  const whole = from === 1 && passage && to >= passage.verses.length;
  const heading = whole
    ? `${b.refName} ${chapter}`
    : formatRef({ start: { book, chapter, verse: from }, end: { book, chapter, verse: to } });
  return (
    <div className={styles.chapter} style={{ fontSize: size }}>
      <h2 className={styles.chapterTitle}>{heading}</h2>
      {passage ? (
        <p className={styles.text}>
          {passage.verses
            .filter((v) => v.verse >= from && v.verse <= to && !v.missing)
            .map((v) => (
              <span key={v.osis} className={styles.verse}>
                <sup className={styles.num}>{v.verse}</sup>
                <MarkedVerseText verse={v} marks={marks} />{' '}
              </span>
            ))}
        </p>
      ) : (
        <p className={styles.loading}>Loading…</p>
      )}
    </div>
  );
}

function FinishBlock({
  plan,
  day,
  done,
  unit,
}: {
  plan: Plan;
  day: number;
  done: boolean;
  unit: 'Day' | 'Lesson';
}) {
  const navigate = useNavigate();
  const progress = usePlanProgressFor(plan.id);
  const reduced = useReducedMotion();
  const [justFinished, setJustFinished] = useState(false);
  const doneRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (justFinished)
      doneRef.current?.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
  }, [justFinished, reduced]);

  const finish = async () => {
    if (!progress) await startPlan(plan.id);
    await setDayRead(plan.id, day, true);
    setJustFinished(true);
  };

  if (!done) {
    return (
      <div className={styles.finish}>
        <Button
          variant="primary"
          icon={<Check size={18} />}
          onClick={() => void finish()}
          className={styles.finishButton}
        >
          Finish {unit.toLowerCase()} {day}
        </Button>
        <p className={styles.finishHint}>
          Mark this {unit.toLowerCase()} as read when you’re done.
        </p>
      </div>
    );
  }

  const count = progress?.done.length ?? 0;
  const status = progress ? currentDay(plan, progress) : null;
  const next = progress ? readableNext(plan, progress, day) : null;

  return (
    <motion.div
      ref={doneRef}
      className={styles.done}
      role="status"
      initial={justFinished && !reduced ? { opacity: 0, y: 12, scale: 0.98 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <motion.span
        className={styles.doneMark}
        initial={justFinished && !reduced ? { scale: 0.4 } : false}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 18, delay: 0.1 }}
        aria-hidden
      >
        <Check size={28} strokeWidth={2.5} />
      </motion.span>
      <h2 className={styles.doneTitle}>
        {justFinished ? 'Well done!' : `${unit} ${day} finished`}
      </h2>
      <p className={styles.doneText}>
        {status?.kind === 'finished'
          ? `You've finished ${plan.name}. What a journey.`
          : `${count} of ${plan.days.length} ${unit.toLowerCase()}s done.`}
        {status?.kind === 'waiting' &&
          ` The next lesson opens ${dateFormat.format(status.unlocks)}.`}
      </p>
      <div className={styles.doneActions}>
        {next && (
          <Button
            variant="primary"
            iconEnd={<ArrowRight size={16} />}
            onClick={() => navigate(paths.planDay(plan.id, next))}
          >
            Read {unit.toLowerCase()} {next} now
          </Button>
        )}
        <Button onClick={() => navigate(paths.today)}>Back to Today</Button>
        {justFinished && (
          <Button
            variant="ghost"
            onClick={() => void setDayRead(plan.id, day, false).then(() => setJustFinished(false))}
          >
            Undo
          </Button>
        )}
      </div>
    </motion.div>
  );
}
