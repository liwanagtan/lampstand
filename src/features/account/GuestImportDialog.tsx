import { useState } from 'react';
import { Button, Dialog } from '@/design-system/components';
import { importGuestData, type GuestImportSummary } from './guestImport';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** The one confirmation before guest records come into the signed-in account. */
export function GuestImportDialog({
  open,
  summary,
  onClose,
  onImported,
}: {
  open: boolean;
  summary: GuestImportSummary | null;
  /** Closed without importing ("Not now"). */
  onClose: () => void;
  onImported: (changed: GuestImportSummary) => void;
}) {
  const [importing, setImporting] = useState(false);
  const [failed, setFailed] = useState(false);

  const bring = async () => {
    setImporting(true);
    setFailed(false);
    try {
      onImported(await importGuestData());
    } catch {
      setFailed(true);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !next && !importing && onClose()}
      title="Bring your guest data?"
      description="You used Lampstand on this device without an account. You can bring that into your account now."
      footer={
        <>
          <Button variant="ghost" disabled={importing} onClick={onClose}>
            Not now
          </Button>
          <Button variant="primary" loading={importing} onClick={() => void bring()}>
            {failed ? 'Try again' : 'Bring it in'}
          </Button>
        </>
      }
    >
      <p>
        {plural(summary?.plans ?? 0, 'plan', 'plans')},{' '}
        {plural(summary?.entries ?? 0, 'journal entry', 'journal entries')} and{' '}
        {plural(
          summary?.marks ?? 0,
          'highlight, bookmark or note',
          'highlights, bookmarks and notes',
        )}
        , plus your settings and where you were reading.
      </p>
      <p>
        Nothing is removed from the guest profile. If an entry or note differs in both, you keep
        both and can review them in Journey.
      </p>
      {failed && (
        <p role="alert">
          The import did not finish. Nothing was removed or changed in your guest data; try again.
        </p>
      )}
    </Dialog>
  );
}
