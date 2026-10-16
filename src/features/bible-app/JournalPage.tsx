import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { Button, Textarea } from '@/design-system/components';
import type { JournalRecord } from '@/db/types';
import { formatRef, fromOsis, toOsis } from '@/features/bible/ref';
import { usePassage } from '@/slides/usePassage';
import { localDate, verseOfTheDay } from './dailyVerses';
import {
  JOURNAL_MAX,
  PROMPTS,
  hasContent,
  saveEntry,
  useJournalDates,
  useJournalEntry,
} from './journal';
import { useReader } from './readerStore';
import { useOpenInReader } from './useOpenInReader';
import styles from './Daily.module.css';

const SAVE_DELAY = 600;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const parseDate = (s: string): Date | null => {
  const m = DATE_RE.exec(s);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return localDate(d) === s ? d : null;
};

const dayFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});
const shortFormat = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

/** Devotion journal: a few prompts on the day's verse, saved as you type. */
export function JournalPage() {
  const [params, setParams] = useSearchParams();
  const today = localDate();
  const asked = params.get('date');
  const date = asked && parseDate(asked) && asked <= today ? asked : today;
  const entries = useJournalDates();
  const entry = useJournalEntry(date);
  const past = (entries ?? []).filter((e) => e.date !== today && hasContent(e));

  const pick = (d: string) => setParams(d === today ? {} : { date: d });

  return (
    <div className={styles.page}>
      <p className={styles.eyebrow}>Journal</p>
      <h1 className={styles.title}>{dayFormat.format(parseDate(date)!)}</h1>
      <p className={styles.lede}>Your journal stays on this computer.</p>
      <div className={styles.journal}>
        <nav aria-label="Journal entries">
          <ul className={styles.entries}>
            <li>
              <button
                type="button"
                className={styles.entry}
                aria-current={date === today}
                onClick={() => pick(today)}
              >
                <span className={styles.entryDate}>Today</span>
                <span className={styles.entryRef}>{verseOfTheDay().ref}</span>
              </button>
            </li>
            {past.map((e) => (
              <li key={e.date}>
                <button
                  type="button"
                  className={styles.entry}
                  aria-current={date === e.date}
                  onClick={() => pick(e.date)}
                >
                  <span className={styles.entryDate}>{shortFormat.format(parseDate(e.date)!)}</span>
                  <span className={styles.entryRef}>{refLabel(e)}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
        {entry === undefined ? (
          <div aria-busy="true" />
        ) : (
          <EntryForm key={date} date={date} entry={entry} />
        )}
      </div>
    </div>
  );
}

function refLabel(e: JournalRecord): string {
  const r = e.ref ? fromOsis(e.ref) : null;
  return r ? formatRef(r) : '';
}

function EntryForm({ date, entry }: { date: string; entry: JournalRecord | null }) {
  const open = useOpenInReader();
  const translation = useReader((s) => s.translation);
  const ref = entry?.ref ?? toOsis(verseOfTheDay(parseDate(date)!).range);
  const range = fromOsis(ref);
  const { passage } = usePassage(ref, translation);
  const [answers, setAnswers] = useState<Record<string, string>>(entry?.answers ?? {});
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const pending = useRef<Record<string, string> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const flush = () => {
    clearTimeout(timer.current);
    const a = pending.current;
    pending.current = null;
    if (a) void saveEntry(date, a, ref).then(() => setStatus('saved'));
  };

  // Save what's left when leaving the page or switching days.
  useEffect(() => () => flush(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const change = (id: string, value: string) => {
    const next = { ...answers, [id]: value };
    setAnswers(next);
    setStatus('saving');
    pending.current = next;
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, SAVE_DELAY);
  };

  const text = passage?.verses
    .filter((v) => !v.missing)
    .map((v) => v.text)
    .join(' ');

  return (
    <div className={styles.form}>
      <div className={styles.context}>
        <p className={styles.contextText}>{text ?? ' '}</p>
        <div className={styles.row}>
          <p className={styles.contextRef}>
            {passage?.reference ?? (range ? formatRef(range) : '')} · {translation}
          </p>
          {range && (
            <Button
              size="sm"
              variant="ghost"
              className={styles.push}
              icon={<BookOpen size={14} />}
              onClick={() => open(range)}
            >
              Read in context
            </Button>
          )}
        </div>
      </div>
      {PROMPTS.map((p) => (
        <Textarea
          key={p.id}
          label={p.label}
          placeholder={p.placeholder}
          rows={3}
          limit={JOURNAL_MAX}
          maxLength={JOURNAL_MAX}
          value={answers[p.id] ?? ''}
          onChange={(e) => change(p.id, e.target.value)}
          onBlur={flush}
        />
      ))}
      <p className={styles.saved} role="status" aria-live="polite">
        {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : ' '}
      </p>
    </div>
  );
}
