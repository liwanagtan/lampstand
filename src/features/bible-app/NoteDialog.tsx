import { useState } from 'react';
import { Button, Dialog, Textarea, toast } from '@/design-system/components';
import type { MarkRecord } from '@/db/types';
import { formatRef, type RefRange } from '@/features/bible/ref';
import { NOTE_MAX, saveNote } from './marks';
import styles from './NoteDialog.module.css';

interface NoteDialogProps {
  /** The passage the note is on; null closes the dialog. */
  target: { range: RefRange; note: MarkRecord | null } | null;
  onClose: () => void;
}

/** Write or edit a note on a passage. Saving an empty note deletes it. */
export function NoteDialog({ target, onClose }: NoteDialogProps) {
  return (
    <Dialog
      open={Boolean(target)}
      onOpenChange={(open) => !open && onClose()}
      title={target ? `Note on ${formatRef(target.range)}` : 'Note'}
      description="Notes stay on this computer."
    >
      {target && <NoteForm key={target.note?.id ?? 'new'} target={target} onClose={onClose} />}
    </Dialog>
  );
}

function NoteForm({
  target,
  onClose,
}: {
  target: NonNullable<NoteDialogProps['target']>;
  onClose: () => void;
}) {
  const [text, setText] = useState(target.note?.text ?? '');
  const save = async () => {
    const id = await saveNote(target.note?.id ?? null, target.range, text);
    toast({
      title: id ? 'Note saved' : target.note ? 'Note deleted' : 'Nothing to save',
      tone: id ? 'success' : 'neutral',
    });
    onClose();
  };
  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <Textarea
        label="Note"
        hideLabel
        autoFocus
        rows={7}
        limit={NOTE_MAX}
        maxLength={NOTE_MAX}
        value={text}
        placeholder="What stands out? What is God saying to you here?"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            void save();
          }
        }}
      />
      <div className={styles.actions}>
        {target.note && (
          <Button
            variant="ghost"
            className={styles.delete}
            onClick={() => {
              setText('');
              void saveNote(target.note!.id, target.range, '').then(() => {
                toast({ title: 'Note deleted' });
                onClose();
              });
            }}
          >
            Delete note
          </Button>
        )}
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" shortcut="⌘↵">
          Save note
        </Button>
      </div>
    </form>
  );
}
