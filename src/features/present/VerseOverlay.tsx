import { Backdrop } from '@/slides/Backdrop';
import { usePages, usePassage } from '@/slides/usePassage';
import { VerseBody } from '@/slides/VerseBody';
import type { Template } from '@/templates/templates';
import type { LiveOverlay } from './live/types';
import s from '@/slides/Slide.module.css';
import styles from './VerseOverlay.module.css';

interface VerseOverlayProps {
  overlay: LiveOverlay;
  template: Template;
  animate: boolean;
}

/** The verse drawn over the slide in one of the three overlay modes (PRD §8 Verse overlays). */
export function VerseOverlay({ overlay, template, animate }: VerseOverlayProps) {
  const { passage } = usePassage(overlay.ref, overlay.translation);
  const pages = usePages(passage, overlay.mode, template.id);
  if (!passage) return null;
  const index = Math.min(overlay.page, Math.max(pages.length - 1, 0));
  const page = pages[index];
  const reference = `${passage.reference} · ${passage.translation}`;
  const indicator =
    pages.length > 1 ? (
      <span className={styles.pageInline}>
        {index + 1} / {pages.length}
      </span>
    ) : null;

  if (overlay.mode === 'fullScreen') {
    return (
      <div className={styles.full}>
        <Backdrop
          background={undefined}
          template={template}
          animate={animate}
          showPlaceholder={false}
        />
        <VerseBody
          key={`${passage.osis}-${passage.translation}-${index}`}
          className={`${s.content} ${s.start} ${s['stack-sm']}`}
          reference={reference}
          page={page}
          emphasis={overlay.emphasis}
          animate={animate}
        />
        {pages.length > 1 && (
          <p className={s.pageIndicator}>
            {index + 1} / {pages.length}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={overlay.mode === 'lowerThird' ? styles.lowerThird : styles.sidePanel}>
      <VerseBody
        key={`${passage.osis}-${passage.translation}-${index}`}
        className={styles.panelBody}
        reference={reference}
        page={page}
        emphasis={overlay.emphasis}
        animate={animate}
      />
      {indicator}
    </div>
  );
}
