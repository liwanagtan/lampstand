import { useState } from 'react';
import { BookOpen, Trash2 } from 'lucide-react';
import { Button, IconButton, Input, Sheet, Tooltip, cx, toast } from '@/design-system/components';
import type { JournalEntryRecord } from '@/db/types';
import { formatRef, fromOsis, parseRefDetailed, toOsis } from '@/features/bible/ref';
import { usePassage } from '@/slides/usePassage';
import { EntryEditor } from './EntryEditor';
import { deleteEntry, useEntry, type EntryDraft } from './journal';
import { useReader } from './readerStore';
import { useOpenInReader } from './useOpenInReader';
import styles from './Journal.module.css';

const parseDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
};
const dayFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});
const refLabel = (ref?: string) => {
  const r = ref ? fromOsis(ref) : null;
  return r ? formatRef(r) : null;
};

export function EntrySheet({
  target,
  onClose,
}: {
  target: { id: string; draft?: EntryDraft } | null;
  onClose: () => void;
}) {
  const saved = useEntry(target && !target.draft ? target.id : null);
  const entry: JournalEntryRecord | EntryDraft | null | undefined = target?.draft
    ? { ...target.draft, id: target.id }
    : saved;

  return (
    <Sheet
      open={Boolean(target)}
      onOpenChange={(o) => !o && onClose()}
      eyebrow={entry?.kind === 'reflection' ? 'Reflection' : 'Journal'}
      title={entry ? dayFormat.format(parseDate(entry.date)) : 'Entry'}
      description="Saved as you type."
      actions={
        entry &&
        !target?.draft && (
          <Tooltip content="Delete entry">
            <IconButton
              label="Delete entry"
              icon={<Trash2 size={16} />}
              size="sm"
              onClick={() =>
                void deleteEntry(entry.id).then((undo) => {
                  onClose();
                  toast({
                    title: 'Entry deleted',
                    action: { label: 'Undo', onClick: () => void undo() },
                  });
                })
              }
            />
          </Tooltip>
        )
      }
    >
      {entry && <EntryForm key={entry.id} entry={entry} />}
    </Sheet>
  );
}

/** The verse chooser plus the editor for one entry. */
function EntryForm({ entry }: { entry: JournalEntryRecord | EntryDraft }) {
  const [text, setText] = useState(() => refLabel(entry.ref) ?? '');
  const [verse, setVerse] = useState(entry.ref ?? '');
  const [error, setError] = useState<string | null>(null);

  const commit = () => {
    const t = text.trim();
    if (!t) {
      setVerse('');
      setError(null);
      return;
    }
    const r = parseRefDetailed(t);
    if (!r.ok) return setError(r.hint);
    setError(null);
    setVerse(toOsis(r.range));
    setText(formatRef(r.range));
  };

  return (
    <EntryEditor
      entry={entry}
      showTitle
      verse={verse}
      autoFocus={!entry.ref}
      bodyPlaceholder={
        entry.kind === 'reflection'
          ? 'What is God saying to you through this verse?'
          : 'What’s on your heart today?'
      }
      header={
        <div className={styles.verseField}>
          <Input
            label="Verse"
            placeholder="Choose a verse (optional) — e.g. Psalm 23:1"
            icon={<BookOpen size={16} />}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commit();
              }
            }}
            error={error ?? undefined}
          />
          {verse && <VersePreview osis={verse} />}
        </div>
      }
    />
  );
}

function VersePreview({ osis }: { osis: string }) {
  const translation = useReader((s) => s.translation);
  const open = useOpenInReader();
  const { passage } = usePassage(osis, translation);
  const range = fromOsis(osis);
  const text = passage?.verses
    .filter((v) => !v.missing)
    .map((v) => v.text)
    .join(' ');
  return (
    <blockquote className={cx(styles.quote)}>
      <span className={styles.quoteText}>{text ?? ' '}</span>
      <footer>
        {passage?.reference ?? (range ? formatRef(range) : '')} · {translation}
        {range && (
          <Button size="sm" variant="ghost" onClick={() => open(range)} className={styles.push}>
            Open in reader
          </Button>
        )}
      </footer>
    </blockquote>
  );
}
