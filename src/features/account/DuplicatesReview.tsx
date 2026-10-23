import { useState } from 'react';
import { CopyCheck } from 'lucide-react';
import { Button, Dialog } from '@/design-system/components';
import { formatRef, fromOsis } from '@/features/bible/ref';
import { entryPreview } from '@/features/bible-app/journal';
import { keepBoth, keepCopy, keepOriginal, useDuplicates, type Duplicate } from './duplicates';
import styles from './DuplicatesReview.module.css';

const when = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

const LABELS = {
  guest: { original: 'In your account', copy: 'From guest use on this device' },
  device: { original: 'From your other device', copy: 'From this device' },
} as const;

function heading(d: Duplicate): string {
  const ref = fromOsis(d.original.ref ?? '');
  if (d.table === 'marks') return `Note on ${ref ? formatRef(ref) : 'a passage'}`;
  return d.original.title || (ref ? `Journal · ${formatRef(ref)}` : `Journal · ${d.original.date}`);
}

const text = (d: Duplicate, which: 'original' | 'copy') =>
  d.table === 'marks' ? (d[which].text ?? '') : entryPreview(d[which]);

/** In Journey: where an entry or note was written differently in two places, choose what to keep. */
export function DuplicatesReview() {
  const duplicates = useDuplicates();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!duplicates?.length) return null;
  const n = duplicates.length;

  const act = async (fn: (d: Duplicate) => Promise<void>, d: Duplicate) => {
    setBusy(true);
    try {
      await fn(d);
      if (n === 1) setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className={styles.callout} role="status">
        <CopyCheck size={20} aria-hidden />
        <p>
          {n === 1 ? 'One entry or note was' : `${n} entries or notes were`} written differently in
          two places. Both versions are kept until you choose.
        </p>
        <Button size="sm" onClick={() => setOpen(true)}>
          Review
        </Button>
      </div>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        size="lg"
        title="Review versions"
        description="Keep one version, or keep both as separate entries."
      >
        <ul className={styles.list}>
          {duplicates.map((d) => (
            <li key={`${d.table}:${d.copy.id}`} className={styles.pair}>
              <h3 className={styles.title}>{heading(d)}</h3>
              <div className={styles.versions}>
                {(['original', 'copy'] as const).map((which) => (
                  <div key={which} className={styles.version}>
                    <p className={styles.label}>
                      {LABELS[d.source][which]} · {when.format(d[which].updatedAt)}
                    </p>
                    <p className={styles.text}>{text(d, which) || 'Nothing written'}</p>
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => void act(which === 'original' ? keepOriginal : keepCopy, d)}
                    >
                      Keep this one
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => void act(keepBoth, d)}
              >
                Keep both
              </Button>
            </li>
          ))}
        </ul>
      </Dialog>
    </>
  );
}
