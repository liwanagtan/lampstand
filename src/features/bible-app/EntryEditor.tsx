import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Input, Textarea, Toggle } from '@/design-system/components';
import type { JournalEntryRecord } from '@/db/types';
import { JOURNAL_MAX, PROMPTS, TITLE_MAX, saveEntry, type EntryDraft } from './journal';
import styles from './EntryEditor.module.css';

const SAVE_DELAY = 600;

interface EntryEditorProps {
  /** The saved entry, or a new draft (not yet stored). */
  entry: JournalEntryRecord | EntryDraft;
  showTitle?: boolean;
  /** Placeholder for the free-writing box. */
  bodyPlaceholder?: string;
  /** Shown above the fields (e.g. the verse). */
  header?: ReactNode;
  autoFocus?: boolean;
  /** The verse the entry is about; changes are saved with the entry. */
  verse?: string;
}

/** Writing a journal entry: free text, an optional title, and optional guided prompts. Saves as you type. */
export function EntryEditor({
  entry,
  showTitle = false,
  bodyPlaceholder = 'Write freely…',
  header,
  autoFocus,
  verse,
}: EntryEditorProps) {
  const [draft, setDraft] = useState<EntryDraft>(() => ({
    id: entry.id,
    date: entry.date,
    kind: entry.kind,
    ref: entry.ref,
    title: entry.title,
    body: entry.body,
    answers: entry.answers,
  }));
  const [guided, setGuided] = useState(() =>
    Object.values(entry.answers ?? {}).some((a) => a.trim()),
  );
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const pending = useRef<EntryDraft | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const flush = () => {
    clearTimeout(timer.current);
    const d = pending.current;
    pending.current = null;
    if (d) void saveEntry(d).then(() => setStatus('saved'));
  };

  // Save what's left when the editor closes.
  useEffect(() => () => flush(), []);

  const change = (patch: Partial<EntryDraft>) => {
    const next = {
      ...draft,
      ...patch,
      ...(verse !== undefined ? { ref: verse || undefined } : {}),
    };
    setDraft(next);
    setStatus('saving');
    pending.current = next;
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, SAVE_DELAY);
  };

  // A new verse is saved straight away on an entry that has something written.
  const lastVerse = useRef(verse);
  useEffect(() => {
    if (verse === undefined || verse === lastVerse.current) return;
    lastVerse.current = verse;
    change({ ref: verse || undefined });
  });

  return (
    <div className={styles.editor}>
      {header}
      {showTitle && (
        <Input
          label="Title"
          hideLabel
          placeholder="Title (optional)"
          maxLength={TITLE_MAX}
          value={draft.title ?? ''}
          onChange={(e) => change({ title: e.target.value })}
          onBlur={flush}
          className={styles.title}
        />
      )}
      <Textarea
        label="Your entry"
        hideLabel
        rows={guided ? 4 : 9}
        autoFocus={autoFocus}
        limit={JOURNAL_MAX}
        maxLength={JOURNAL_MAX}
        placeholder={bodyPlaceholder}
        value={draft.body}
        onChange={(e) => change({ body: e.target.value })}
        onBlur={flush}
      />
      <Toggle
        checked={guided}
        onChange={setGuided}
        label="Guide me"
        description="A few simple questions to help you listen and respond."
      />
      {guided &&
        PROMPTS.map((p) => (
          <Textarea
            key={p.id}
            label={p.label}
            placeholder={p.placeholder}
            rows={2}
            limit={JOURNAL_MAX}
            maxLength={JOURNAL_MAX}
            value={draft.answers?.[p.id] ?? ''}
            onChange={(e) => change({ answers: { ...draft.answers, [p.id]: e.target.value } })}
            onBlur={flush}
          />
        ))}
      <p className={styles.saved} role="status" aria-live="polite">
        {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : ' '}
      </p>
    </div>
  );
}
