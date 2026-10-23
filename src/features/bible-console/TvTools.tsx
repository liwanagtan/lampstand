// The background picture behind Bible verses on the TV (Show the Bible, the dock's Background).
import { useState } from 'react';
import { ImageIcon, X } from 'lucide-react';
import { Button, IconButton, Tooltip } from '@/design-system/components';
import { BackgroundPicker } from '@/features/library/BackgroundPicker';
import { useTv } from '@/features/bible-app/tvStore';
import { useAsset } from '@/slides/useAsset';
import styles from './TvTools.module.css';

/** The picture behind the verses on the TV: a bundled photo, an upload, or the theme's own. */
export function BackgroundControl() {
  const background = useTv((s) => s.background);
  const asset = useAsset(background?.assetId);
  const [picking, setPicking] = useState(false);
  return (
    <div className={styles.bgRow}>
      <div className={styles.bgThumb} aria-hidden>
        {asset && background?.type === 'image' && <img src={asset.url} alt="" />}
        {asset && background?.type === 'video' && <video src={asset.url} muted />}
        {!background && <ImageIcon size={16} />}
      </div>
      <div className={styles.bgText}>
        <span className={styles.bgLabel}>Background</span>
        <span className={styles.bgValue}>
          {background ? (background.type === 'video' ? 'Video' : 'Photo') : 'Theme'}
        </span>
      </div>
      <Button size="sm" onClick={() => setPicking(true)}>
        {background ? 'Change…' : 'Choose…'}
      </Button>
      {background && (
        <Tooltip content="Use the theme background">
          <IconButton
            label="Remove background"
            icon={<X size={14} />}
            size="sm"
            onClick={() => useTv.getState().setBackground(null)}
          />
        </Tooltip>
      )}
      <BackgroundPicker
        open={picking}
        onOpenChange={setPicking}
        description="Shown behind the verses on the TV. A darker, simple picture keeps the words easy to read."
        onPick={(id, kind) => useTv.getState().setBackground(id, kind)}
      />
    </div>
  );
}
