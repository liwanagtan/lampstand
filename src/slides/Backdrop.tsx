import { ImageIcon, Film } from 'lucide-react';
import type { Background } from '@/schema/presentation';
import type { Template } from '@/templates/templates';
import { cx } from '@/design-system/components';
import { useAsset } from './useAsset';
import styles from './Backdrop.module.css';

export interface BackdropProps {
  background: Background | undefined;
  template: Template;
  animate: boolean;
  showPlaceholder: boolean;
  /** Stronger dark overlay so text over photos keeps its contrast. */
  textOver?: boolean;
  /** More shade over photos (Show the Bible, where verses must read from the back). */
  strong?: boolean;
}

export function Backdrop({
  background,
  template,
  animate,
  showPlaceholder,
  textOver = true,
  strong = false,
}: BackdropProps) {
  const bg = background ?? { type: 'template' as const };
  const media = bg.type === 'image' || bg.type === 'video' ? bg : null;
  const asset = useAsset(media?.assetId);
  const base =
    bg.type === 'color'
      ? template.tones[bg.tone]
      : bg.type === 'gradient'
        ? template.gradients[bg.tone]
        : 'var(--t-backdrop)';

  const hasMedia = media && asset;
  const drift = bg.type === 'image' && bg.motion === 'drift' && animate;

  return (
    <div className={styles.root} aria-hidden>
      <div className={styles.base} style={{ background: base }} />
      {template.ambient && bg.type === 'template' && (
        <div className={cx(styles.ambient, animate && styles.ambientMoving)} />
      )}
      {hasMedia &&
        (asset.mime.startsWith('video/') ? (
          <video
            className={styles.media}
            src={asset.url}
            muted
            loop
            playsInline
            autoPlay={animate}
            preload="auto"
          />
        ) : (
          <img
            className={cx(styles.media, drift && styles.drift)}
            src={asset.url}
            alt=""
            decoding="async"
          />
        ))}
      {hasMedia && textOver && (
        <div className={strong ? styles.photoOverlayStrong : styles.photoOverlay} />
      )}
      {media && !asset && showPlaceholder && asset !== undefined && (
        <div className={styles.placeholder}>
          <span className={styles.placeholderChip}>
            {media.type === 'video' ? (
              <Film size={32} strokeWidth={1.5} />
            ) : (
              <ImageIcon size={32} strokeWidth={1.5} />
            )}
            <span className={styles.placeholderText}>{media.description}</span>
          </span>
        </div>
      )}
      {template.texture !== 'none' && <div className={styles.grain} />}
      {template.texture === 'grain-leak' && <div className={styles.leak} />}
    </div>
  );
}
