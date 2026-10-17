import { UserRound } from 'lucide-react';
import { cx } from '@/design-system/components';
import { useSettings } from '@/features/settings/settingsStore';
import styles from './Avatar.module.css';

/** Your initial in your colour; a person outline until you add a name. */
export function Avatar({ size = 36, className }: { size?: number; className?: string }) {
  const profile = useSettings((s) => s.profile);
  const initial = profile.name.trim().charAt(0).toUpperCase();
  return (
    <span
      className={cx(styles.avatar, className)}
      data-avatar-color={profile.color ?? 'amber'}
      style={{ width: size, height: size, fontSize: size * 0.44 }}
      aria-hidden
    >
      {initial || <UserRound size={size * 0.5} strokeWidth={1.75} />}
    </span>
  );
}
