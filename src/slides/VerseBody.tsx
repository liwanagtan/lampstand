import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { motion, motionDetail } from '@/design-system/tokens';
import { splitEmphasis } from './emphasis';
import { isReducedMotion, revealBlock } from './motion';
import type { Page } from './paginate';
import s from './Slide.module.css';

export interface VerseBodyProps {
  reference: string;
  page: Page | undefined;
  emphasis?: readonly string[];
  animate: boolean;
  className?: string;
  /** Reference and text sizes can be overridden by overlays. */
  style?: CSSProperties;
}

/** Reference in the accent color above the verse text (PRD §8), with the verse moment motion (§9). */
export function VerseBody({
  reference,
  page,
  emphasis,
  animate,
  className,
  style,
}: VerseBodyProps) {
  const refEl = useRef<HTMLParagraphElement>(null);
  const textEl = useRef<HTMLParagraphElement>(null);
  const [emphasisOn, setEmphasisOn] = useState(!animate);

  useLayoutEffect(() => {
    if (!animate) return;
    const a = refEl.current ? revealBlock(refEl.current, 0, 12) : undefined;
    const b = textEl.current ? revealBlock(textEl.current, motionDetail.verseTextDelay) : undefined;
    return () => {
      a?.();
      b?.();
    };
  }, [animate]);

  useEffect(() => {
    if (!animate) return;
    const delay = isReducedMotion()
      ? motion.reduced.duration
      : motionDetail.verseTextDelay + motion.reveal.duration + motionDetail.emphasisDelay;
    const id = setTimeout(() => setEmphasisOn(true), delay);
    return () => clearTimeout(id);
  }, [animate]);

  return (
    <div className={className} style={style}>
      <p ref={refEl} className={s.reference}>
        {reference}
      </p>
      <p ref={textEl} className={s.verseText} style={page ? { fontSize: page.size } : undefined}>
        {page?.segments.map((seg, i) => (
          <span key={`${seg.osis}-${i}`}>
            {seg.showNumber && <sup className={s.verseNum}>{seg.verse}</sup>}
            {seg.missing ? (
              <span className={s.missing}>{seg.text}</span>
            ) : (
              splitEmphasis(seg.text, emphasis).map((run, j) =>
                run.emphasis ? (
                  <span key={j} className={`${s.emphasis} ${emphasisOn ? s.emphasisOn : ''}`}>
                    {run.text}
                  </span>
                ) : (
                  <span key={j}>{run.text}</span>
                ),
              )
            )}
            {i < page.segments.length - 1 ? ' ' : ''}
          </span>
        ))}
      </p>
    </div>
  );
}
