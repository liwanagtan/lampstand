import { useEffect, useRef, useState } from 'react';
import { HardDrive } from 'lucide-react';
import { Button, Dialog, toast } from '@/design-system/components';
import {
  addBundledBackground,
  backgroundUrl,
  loadBackgrounds,
  type BackgroundEntry,
} from './backgrounds';
import { storeMediaFile } from './media';
import styles from './BackgroundPicker.module.css';

export interface BackgroundPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the stored asset id and its MIME kind. */
  onPick: (assetId: string, kind: 'image' | 'video') => void;
  description?: string;
  allowVideo?: boolean;
}

/** Choose a background from the bundled library or from the laptop. */
export function BackgroundPicker({
  open,
  onOpenChange,
  onPick,
  description,
  allowVideo = true,
}: BackgroundPickerProps) {
  const [library, setLibrary] = useState<BackgroundEntry[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) void loadBackgrounds().then(setLibrary);
  }, [open]);

  const pickBundled = async (entry: BackgroundEntry) => {
    setBusy(entry.id);
    try {
      onPick(await addBundledBackground(entry), 'image');
      onOpenChange(false);
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : 'Could not use that background.',
        tone: 'warning',
      });
    } finally {
      setBusy(null);
    }
  };

  const pickFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy('file');
    try {
      const id = await storeMediaFile(file);
      onPick(id, file.type.startsWith('video/') ? 'video' : 'image');
      onOpenChange(false);
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : 'Could not use that file.',
        tone: 'warning',
      });
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title="Choose a background"
      description={
        description
          ? `The slide asks for: ${description}`
          : 'Pick a photo from the library or from this laptop.'
      }
      footer={
        <>
          <input
            ref={fileRef}
            type="file"
            accept={allowVideo ? 'image/*,video/*' : 'image/*'}
            className="visually-hidden"
            onChange={(e) => void pickFile(e.target.files?.[0])}
            aria-label="Choose a file from this laptop"
          />
          <Button
            icon={<HardDrive size={16} />}
            loading={busy === 'file'}
            onClick={() => fileRef.current?.click()}
          >
            From this laptop…
          </Button>
        </>
      }
    >
      <ul className={styles.grid} aria-label="Background library">
        {library.map((b) => (
          <li key={b.id}>
            <button
              type="button"
              className={styles.tile}
              onClick={() => void pickBundled(b)}
              disabled={busy !== null}
              aria-busy={busy === b.id}
            >
              <img src={backgroundUrl(b.thumb)} alt="" loading="lazy" />
              <span className={styles.label}>{b.description}</span>
            </button>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
