import styles from './Kbd.module.css';

/** A key hint; hidden on touch screens, where there is no keyboard to press. */
export function Kbd({ children }: { children: string }) {
  return <kbd className={`${styles.kbd} keyboard-hint`}>{children}</kbd>;
}
