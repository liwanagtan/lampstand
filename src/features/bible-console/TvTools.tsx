// TV tools shared by the Bible console: tap words of the live verse to highlight them, and the
// background picture behind Bible verses.
import { useMemo, useState } from 'react';
import { ImageIcon, X } from 'lucide-react';
import { Button, IconButton, Tooltip, cx, toast } from '@/design-system/components';
import { BackgroundPicker } from '@/features/library/BackgroundPicker';
import { useControl } from '@/features/present/live/controlStore';
import { useTv } from '@/features/bible-app/tvStore';
import { useAsset } from '@/slides/useAsset';
import { usePassage } from '@/slides/usePassage';
import styles from './TvTools.module.css';

const EMPHASIS_MAX = 12;

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

const WORD = /[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu;

/** Tap words of the live verse to highlight them on the TV. */
export function Highlighter() {
  const overlay = useControl((s) => s.live.overlay)!;
  const { passage } = usePassage(overlay.ref, overlay.translation);
  const emphasis = useMemo(() => overlay.emphasis ?? [], [overlay.emphasis]);
  const lit = new Set(emphasis.map((e) => e.toLowerCase()));

  const toggle = (word: string) => {
    const key = word.toLowerCase();
    const next = lit.has(key)
      ? emphasis.filter((e) => e.toLowerCase() !== key)
      : [...emphasis, word];
    if (next.length > EMPHASIS_MAX) {
      toast({ title: `Up to ${EMPHASIS_MAX} highlighted words at a time.`, tone: 'warning' });
      return;
    }
    useControl.getState().dispatch({ type: 'overlayEmphasis', emphasis: next });
  };

  return (
    <section className={styles.section} aria-label="Highlight words">
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>Highlight</h2>
        <span className={styles.hint}>Tap words to light them up on the TV</span>
        {emphasis.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            className={styles.push}
            onClick={() =>
              useControl.getState().dispatch({ type: 'overlayEmphasis', emphasis: [] })
            }
          >
            Clear
          </Button>
        )}
      </div>
      <div className={styles.words}>
        {passage?.verses
          .filter((v) => !v.missing)
          .map((v) => (
            <p key={v.osis} className={styles.wordVerse}>
              <sup className={styles.wordNum}>{v.verse}</sup>
              {splitWords(v.text).map((part, i) =>
                part.word ? (
                  <button
                    key={i}
                    type="button"
                    className={cx(styles.word, lit.has(part.text.toLowerCase()) && styles.wordLit)}
                    aria-pressed={lit.has(part.text.toLowerCase())}
                    onClick={() => toggle(part.text)}
                  >
                    {part.text}
                  </button>
                ) : (
                  <span key={i}>{part.text}</span>
                ),
              )}
            </p>
          ))}
      </div>
    </section>
  );
}

function splitWords(text: string): { text: string; word: boolean }[] {
  const out: { text: string; word: boolean }[] = [];
  let last = 0;
  for (const m of text.matchAll(WORD)) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), word: false });
    out.push({ text: m[0], word: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), word: false });
  return out;
}
