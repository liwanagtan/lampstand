import { FlameCompanion } from '@/design-system/FlameCompanion';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  MessageCircleQuestion,
  NotebookPen,
  BookText,
} from 'lucide-react';
import {
  Button,
  Dialog,
  EmptyState,
  IconButton,
  Select,
  Tooltip,
  cx,
} from '@/design-system/components';
import { useBible } from '@/features/bible/bibleStore';
import { BOOK_BY_CODE } from '@/features/bible/books';
import { formatRef, toOsis, type RefRange } from '@/features/bible/ref';
import { useSettings } from '@/features/settings/settingsStore';
import { StudyNotesSheet } from './StudyNotesSheet';
import { notesForRange, useStudyNotes } from './studyNotes';
import { localDate } from './dailyVerses';
import { newEntryId, usePlanReflection, type EntryDraft } from './journal';
import { EntrySheet } from './JournalEntrySheet';
import { ReflectionMoment } from './ReflectionMoment';
import { useReducedMotion } from '@/features/settings/theme';
import {
  chapterChunks,
  activePlanCount,
  currentDay,
  formatDay,
  isLessons,
  readableNext,
  readingMinutes,
  setDayRead,
  startPlan,
  usePlan,
  usePlanProgressFor,
  usePlanProgress,
  usePlans,
  type Plan,
} from './plans';
import { READER_SIZES, useReader } from './readerStore';
import { useChapter } from './useChapter';
import styles from './PlanReader.module.css';
import { paths } from '@/app/paths';
import { haptic } from '@/app/haptics';
import { MarkedVerseText } from './MarkedVerse';
import { ReadingSettings } from './ReadingSettings';
import { TranslationChip } from './TranslationChip';
import { useVisibleMarks } from './marks';
import { rememberPlanDay } from './readingResume';

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
  const savedReflection = usePlanReflection(planId, Number(dayParam));
  const n = Number(dayParam);
  const navigate = useNavigate();
  const top = useRef<HTMLDivElement>(null);
  const [reflect, setReflect] = useState<{ id: string; draft?: EntryDraft } | null>(null);
  const [reading, setReading] = useState(false);
  const [position, setPosition] = useState('');
  // The whole day — note, scripture, devotional, questions, prayer — follows the text size.
  const size = useReader((s) => s.size);

  useEffect(() => {
    if (plan?.days[n - 1] && !progress?.done.includes(n)) rememberPlanDay(planId, n);
  }, [plan, progress, planId, n]);

  useEffect(() => {
    const root = top.current?.closest('[data-scroll]');
    if (!root) return;
    const update = () => {
      const chapters = Array.from(
        top.current?.querySelectorAll<HTMLElement>('[data-reading-chapter]') ?? [],
      );
      if (!chapters.length) return;
      const boundary = root.getBoundingClientRect().top + 180;
      const current =
        chapters.filter((c) => c.getBoundingClientRect().top <= boundary).at(-1) ?? chapters[0]!;
      setPosition(
        `${current.dataset.readingChapter} · ${chapters.indexOf(current) + 1} of ${chapters.length}`,
      );
    };
    update();
    root.addEventListener('scroll', update, { passive: true });
    return () => root.removeEventListener('scroll', update);
  }, [plan, progress, n]);

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
  const openReflection = () =>
    setReflect({
      id: savedReflection?.id ?? newEntryId(),
      ...(!savedReflection && {
        draft: {
          id: '',
          date: localDate(),
          kind: 'reflection',
          ref: toOsis(day.readings[0]!),
          title: `${plan.name} · ${isLessons(plan) ? 'Lesson' : 'Day'} ${n}`,
          body: '',
          planId: plan.id,
          planDay: n,
        },
      }),
    });

  return (
    <div
      className={styles.page}
      ref={top}
      style={{ '--reader-size': `${size}px` } as CSSProperties}
    >
      <header className={styles.mobileHeader} role="group" aria-label="Plan reading controls">
        <Link
          to={paths.planPage(plan.id)}
          className={styles.mobileBack}
          aria-label="Back to the plan"
        >
          <ArrowLeft size={22} aria-hidden />
        </Link>
        <span className={styles.mobilePlanName}>{plan.name}</span>
        <TranslationChip onClick={() => setReading(true)} parallel={false} />
      </header>
      <div
        className={styles.progress}
        role="progressbar"
        aria-label="Plan progress"
        aria-valuemin={0}
        aria-valuemax={plan.days.length}
        aria-valuenow={progress?.done.length ?? 0}
        aria-valuetext={`${progress?.done.length ?? 0} of ${plan.days.length} readings finished`}
      >
        <span style={{ width: `${((progress?.done.length ?? 0) / plan.days.length) * 100}%` }} />
      </div>
      <header className={styles.header}>
        <Link to={paths.planPage(plan.id)} className={cx(styles.back, 'phone-hidden')}>
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
        <ReadingSettings open={reading} onOpenChange={setReading} parallel={false} />
      </header>

      {day.note && <p className={styles.note}>{day.note}</p>}

      {day.readings.map((r, i) => (
        <section key={i} className={styles.reading} aria-label={formatRef(r)}>
          {chapterChunks(r).map((c) => (
            <ChapterBlock key={`${c.book}.${c.chapter}`} {...c} />
          ))}
          <ReadingNotes range={r} />
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
        <Button variant="secondary" icon={<NotebookPen size={16} />} onClick={openReflection}>
          Reflect on this {unit.toLowerCase()}
        </Button>
      </div>
      <EntrySheet target={reflect} onClose={() => setReflect(null)} />

      <FinishBlock
        plan={plan}
        day={n}
        done={done}
        unit={unit}
        onReflect={openReflection}
        position={position}
        onReturn={() => top.current?.scrollIntoView({ block: 'start' })}
      />
    </div>
  );
}

function ReaderOptions() {
  const translation = useReader((s) => s.translation);
  const size = useReader((s) => s.size);
  const translations = useBible((s) => s.translations);
  const i = READER_SIZES.indexOf(size);
  return (
    <div className={cx(styles.options, 'laptop-only')}>
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
    <div
      data-reading-chapter={heading}
      className={styles.chapter}
      style={{ '--reader-size': `${size}px` } as CSSProperties}
    >
      <h2 className={styles.chapterTitle}>{heading}</h2>
      {passage ? (
        <>
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
          {passage.copyright && <small>{passage.copyright}</small>}
        </>
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
  onReflect,
  position,
  onReturn,
}: {
  position: string;
  plan: Plan;
  day: number;
  done: boolean;
  unit: 'Day' | 'Lesson';
  onReflect: () => void;
  onReturn: () => void;
}) {
  const navigate = useNavigate();
  const progress = usePlanProgressFor(plan.id);
  const plans = usePlans();
  const allProgress = usePlanProgress();
  const activeCount = activePlanCount(plans ?? [], allProgress ?? [], plan.id);
  const reduced = useReducedMotion();
  const [justFinished, setJustFinished] = useState(false);
  const savedReflection = usePlanReflection(plan.id, day);
  const [paceAdviceOpen, setPaceAdviceOpen] = useState(false);
  const doneRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!justFinished) return;
    const node = doneRef.current;
    const previous = document.activeElement;
    node?.focus({ preventScroll: true });
    node?.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
    const phone = window.matchMedia?.('(max-width: 640px)').matches;
    const siblings = phone
      ? Array.from(node?.parentElement?.children ?? []).filter(
          (el): el is HTMLElement => el instanceof HTMLElement && el !== node,
        )
      : [];
    const states = siblings.map((el) => el.inert);
    siblings.forEach((el) => {
      el.inert = true;
    });
    return () => {
      siblings.forEach((el, index) => {
        el.inert = states[index]!;
      });
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus({ preventScroll: true });
    };
  }, [justFinished, reduced]);

  const finish = async () => {
    if (!progress) await startPlan(plan.id);
    await setDayRead(plan.id, day, true);
    setJustFinished(true);
    haptic('success');
  };

  if (!done) {
    return (
      <div className={styles.finish}>
        <div className={styles.mobilePosition}>
          <strong>{position}</strong>
          <button onClick={onReflect}>Reflect</button>
        </div>
        <Button
          variant="primary"
          icon={<Check size={18} />}
          onClick={() => (!progress && activeCount >= 2 ? setPaceAdviceOpen(true) : void finish())}
          disabled={plans === undefined || allProgress === undefined}
          className={styles.finishButton}
        >
          Finish {unit.toLowerCase()} {day}
        </Button>
        <p className={styles.finishHint}>
          Mark this {unit.toLowerCase()} as read when you’re done.
        </p>
        <Dialog
          open={paceAdviceOpen}
          onOpenChange={setPaceAdviceOpen}
          title="Keep your reading manageable"
          description={`Finishing this reading will add a new plan alongside the ${activeCount} you already have. We recommend focusing on one or two plans at a time.`}
          footer={
            <>
              <Button variant="ghost" onClick={() => navigate(paths.plans)}>
                See my plans
              </Button>
              <Button
                variant="primary"
                onClick={() => void finish().then(() => setPaceAdviceOpen(false))}
              >
                Add this plan anyway
              </Button>
            </>
          }
        />
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
      data-complete={justFinished || undefined}
      role={justFinished ? 'dialog' : 'status'}
      aria-label={justFinished ? `${unit} ${day} done` : undefined}
      tabIndex={justFinished ? -1 : undefined}
      initial={justFinished && !reduced ? { opacity: 0, y: 12, scale: 0.98 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {justFinished && <p className={styles.completionPlan}>{plan.name}</p>}
      {justFinished ? (
        <FlameCompanion mood="celebrate" size={150} />
      ) : (
        <motion.span className={styles.doneMark} aria-hidden>
          <Check size={28} strokeWidth={2.5} />
        </motion.span>
      )}
      <h2 className={styles.doneTitle}>
        {justFinished ? `${unit} ${day} done` : `${unit} ${day} finished`}
      </h2>
      <p className={styles.doneText}>
        {status?.kind === 'finished'
          ? `You've finished ${plan.name}. What a journey.`
          : `${count} of ${plan.days.length} ${unit.toLowerCase()}s done.`}
        {status?.kind === 'waiting' &&
          ` The next lesson opens ${dateFormat.format(status.unlocks)}.`}
        {next && ' Your next reading is ready whenever you are.'}
      </p>
      {justFinished && (
        <div className={styles.completionCount}>
          {count} of {plan.days.length} readings finished
        </div>
      )}
      {justFinished && (
        <>
          <ReflectionMoment
            question={
              plan.days[day - 1]?.questions?.[0] ?? 'What stands out to you in this passage?'
            }
            prayer={plan.days[day - 1]?.prayer}
            reference={toOsis(plan.days[day - 1]!.readings[0]!)}
            title={`${plan.name} · ${unit} ${day}`}
            source={{ planId: plan.id, planDay: day }}
            saved={savedReflection}
            onFinish={() => navigate(paths.today)}
            onReturn={() => {
              setJustFinished(false);
              onReturn();
            }}
          />
          <Button
            variant="ghost"
            className={styles.undo}
            onClick={() => void setDayRead(plan.id, day, false).then(() => setJustFinished(false))}
          >
            Undo
          </Button>
        </>
      )}
      {!justFinished && (
        <div className={styles.doneActions}>
          <Button icon={<NotebookPen size={16} />} onClick={onReflect}>
            Reflect on today
          </Button>
          {next && (
            <Button
              variant="gold"
              className="laptop-only"
              iconEnd={<ArrowRight size={16} />}
              onClick={() => navigate(paths.planDay(plan.id, next))}
            >
              Read {unit.toLowerCase()} {next} now
            </Button>
          )}
          <Button onClick={() => navigate(paths.today)}>Back to Today</Button>
        </div>
      )}
    </motion.div>
  );
}

/** "Study notes" for one reading: Tyndale's notes on that passage, in a sheet. */
function ReadingNotes({ range }: { range: RefRange }) {
  const on = useSettings((s) => s.studyNotes);
  const book = useStudyNotes(on ? range.start.book : null);
  const [open, setOpen] = useState(false);
  const notes = useMemo(() => notesForRange(book, range), [book, range]);
  if (!on || notes.length === 0) return null;
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        icon={<BookText size={15} />}
        className={styles.studyButton}
        onClick={() => setOpen(true)}
      >
        Study notes ({notes.length})
      </Button>
      <StudyNotesSheet
        open={open}
        onOpenChange={setOpen}
        eyebrow="Study notes"
        title={formatRef(range)}
        notes={notes}
      />
    </>
  );
}
