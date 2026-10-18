import { Backdrop } from '@/slides/Backdrop';
import { usePages, usePassage } from '@/slides/usePassage';
import { VerseBody } from '@/slides/VerseBody';
import type { Template } from '@/templates/templates';
import type { Background } from '@/schema/presentation';
import type { LiveOverlay } from './live/types';
import s from '@/slides/Slide.module.css';
import styles from './VerseOverlay.module.css';

interface VerseOverlayProps {
  overlay: LiveOverlay;
  template: Template;
  animate: boolean;
  /** Full screen draws this behind the verse (the Bible's backdrop); the template otherwise. */
  background?: Background;
}

/** The verse drawn over the slide in one of the three overlay modes (PRD §8 Verse overlays). */
export function VerseOverlay({ overlay, template, animate, background }: VerseOverlayProps) {
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

  if (overlay.mode === 'fullScreen' && overlay.look === 'card') {
    // Today's verse of the day, as it looks on the card: the photo, a quiet label, the verse
    // in quotes, and the reference beneath.
    const text = page?.segments.map((seg) => seg.text).join(' ') ?? '';
    return (
      <div className={styles.full}>
        <Backdrop
          background={background}
          template={template}
          animate={animate}
          showPlaceholder={false}
        />
        <div className={styles.cardScrim} aria-hidden />
        <div
          key={`${passage.osis}-${passage.translation}-${index}`}
          className={`${s.content} ${s.start} ${styles.card}`}
          data-animate={animate || undefined}
        >
          <p className={styles.cardEyebrow}>Verse of the day</p>
          <p className={styles.cardQuote} style={page ? { fontSize: page.size } : undefined}>
            “{text}”
          </p>
          <p className={styles.cardRef}>
            {passage.reference}
            <span className={styles.cardCode}>{passage.translation}</span>
          </p>
        </div>
      </div>
    );
  }

  if (overlay.mode === 'fullScreen') {
    return (
      <div className={styles.full}>
        <Backdrop
          background={background}
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

  if (overlay.mode === 'popup') {
    return (
      <div className={styles.popupScrim}>
        <div className={styles.popup}>
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
