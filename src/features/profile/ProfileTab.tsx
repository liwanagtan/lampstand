import { Link } from 'react-router-dom';
import { ChevronRight, MonitorPlay } from 'lucide-react';
import { paths } from '@/app/paths';
import { UsesSection, YouSection } from '@/features/settings/MeSections';
import { useSettings } from '@/features/settings/settingsStore';
import styles from './Profile.module.css';

/** Profile › Profile: who you are and what you use Lampstand for. */
export function ProfileTab() {
  const screen = useSettings((s) => s.features.screen);
  return (
    <div className={styles.sections}>
      <YouSection />
      {screen && (
        // Phones have no Screen tab; presenting is a laptop job, so it waits here.
        <Link to={paths.screen} className={styles.screenCard}>
          <MonitorPlay size={22} aria-hidden />
          <span className={styles.screenCardText}>
            <span className={styles.screenCardTitle}>Present on a screen</span>
            <span className={styles.muted}>Presentations and the Bible on a TV or projector</span>
          </span>
          <ChevronRight size={18} aria-hidden />
        </Link>
      )}
      <UsesSection />
    </div>
  );
}
