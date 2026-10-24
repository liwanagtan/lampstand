import { UsesSection, YouSection } from '@/features/settings/MeSections';
import { ShareAppSection } from '@/features/share/ShareApp';
import styles from './Profile.module.css';

/** Profile › Profile: who you are and what you use Lampstand for. */
export function ProfileTab() {
  return (
    <div className={styles.sections}>
      <YouSection />
      <UsesSection />
      <ShareAppSection />
    </div>
  );
}
