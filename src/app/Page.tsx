import { usePhoneTitle } from './topBar';
import type { ReactNode } from 'react';
import styles from './Page.module.css';

interface PageProps {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  /** Phones: where the top bar's back arrow goes. */
  back?: string;
}

export function Page({ title, description, actions, children, back }: PageProps) {
  usePhoneTitle(title, { back });
  return (
    <div className={styles.page} data-enter>
      <header className={styles.header}>
        <div>
          <h1 className={`${styles.title} phone-hidden`}>{title}</h1>
          {description && <p className={styles.description}>{description}</p>}
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </header>
      {children}
    </div>
  );
}
