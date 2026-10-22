import { LampMark } from '@/design-system/LampMark';
import { Button } from '@/design-system/components';
import { installAppUpdate, postponeAppUpdate } from './pwa';
import styles from '@/features/bible/BibleGate.module.css';

export function UpdateScreen() {
  return (
    <div className={styles.updateOverlay} role="dialog" aria-modal="true" aria-labelledby="app-update-title">
      <div className={styles.card}>
        <LampMark size={48} className={styles.mark} />
        <h1 className={styles.title} id="app-update-title">A new Lampstand is ready</h1>
        <p className={styles.text}>The update has finished downloading. Restart to enjoy the latest version.</p>
        <div className={styles.updateActions}>
          <Button variant="primary" onClick={() => void installAppUpdate()}>Update and restart</Button>
          <Button variant="ghost" onClick={postponeAppUpdate}>Later</Button>
        </div>
      </div>
    </div>
  );
}
