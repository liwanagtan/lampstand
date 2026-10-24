import { Share2 } from 'lucide-react';
import { Button, cx } from '@/design-system/components';
import { Section } from '@/features/settings/Section';
import { APP_SHARE, shareOrCopy } from './share';
import styles from './ShareApp.module.css';

const shareApp = () =>
  void shareOrCopy({ ...APP_SHARE, url: `${location.origin}/` }, 'Copied the Lampstand link');

/** Share Lampstand: the share sheet with a line about it and the link. */
export function ShareAppButton({ className }: { className?: string }) {
  return (
    <Button
      variant="secondary"
      icon={<Share2 size={16} />}
      onClick={shareApp}
      className={cx(styles.button, className)}
    >
      Share Lampstand
    </Button>
  );
}

/** Settings › Share Lampstand. */
export function ShareAppSection() {
  return (
    <Section title="Share Lampstand">
      <p className={styles.text}>
        Know someone who would like a quiet place to read the Bible? Send them the link. They start
        fresh, on their own device.
      </p>
      <ShareAppButton />
    </Section>
  );
}
