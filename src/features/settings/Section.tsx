import type { ReactNode } from 'react';
import { Card } from '@/design-system/components';
import styles from './SettingsPage.module.css';

/** One card on the Me page: a title and description beside its controls. */
export function Section({
  title,
  description,
  children,
  profile = false,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  profile?: boolean;
}) {
  return (
    <Card className={`${styles.section} ${profile ? styles.profileSection : ''}`}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        {description && <p className={styles.muted}>{description}</p>}
      </div>
      <div className={styles.sectionBody}>{children}</div>
    </Card>
  );
}
