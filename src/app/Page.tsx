import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import styles from './Page.module.css';

interface PageProps {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  /** Phones: the contextual back destination shown in page content. */
  back?: string;
}

export function Page({ title, description, actions, children, back }: PageProps) {
  return (
    <div className={styles.page} data-enter>
      {back && (
        <Link
          to={back}
          className={styles.mobileBack}
          aria-label={title === 'Screen' ? 'Back to Profile' : 'Back to Screen'}
        >
          <ChevronLeft size={22} aria-hidden /> {title === 'Screen' ? 'Profile' : 'Screen'}
        </Link>
      )}
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{title}</h1>
          {description && <p className={styles.description}>{description}</p>}
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </header>
      {children}
    </div>
  );
}
