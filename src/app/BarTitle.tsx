import styles from './BarTitle.module.css';

/** A two-line phone top bar title: the personal line first, a quiet line beneath. */
export function BarTitle({ title, line }: { title: string; line?: string }) {
  return (
    <span className={styles.root}>
      <span className={styles.title}>{title}</span>
      {line && <span className={styles.line}>{line}</span>}
    </span>
  );
}
