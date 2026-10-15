import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { cx } from '@/design-system/components';
import { canvasVars, CANVAS } from '@/templates/metrics';
import { templateVars, type Template } from '@/templates/templates';
import styles from './SlideStage.module.css';

export interface SlideStageProps {
  template: Template;
  children: ReactNode;
  className?: string;
  /** 'width' sizes the frame by its width (thumbnails, panes); 'contain' fills the parent box. */
  fit?: 'width' | 'contain';
  label?: string;
}

/** A 1920×1080 canvas scaled to its container, so every surface draws the same slide. */
export function SlideStage({
  template,
  children,
  className,
  fit = 'width',
  label,
}: SlideStageProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      const s =
        fit === 'contain'
          ? Math.min(width / CANVAS.width, height / CANVAS.height)
          : width / CANVAS.width;
      setScale(s || 0);
    };
    update();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [fit]);

  const style = {
    ...canvasVars(),
    ...templateVars(template),
    width: CANVAS.width,
    height: CANVAS.height,
    transform: `translate(-50%, -50%) scale(${scale})`,
  } as CSSProperties;

  return (
    <div
      ref={frameRef}
      className={cx(styles.frame, fit === 'contain' ? styles.contain : styles.byWidth, className)}
      role={label ? 'img' : undefined}
      aria-label={label}
    >
      {/* The frame's label describes the slide; its drawing is decorative for assistive tech. */}
      <div className={styles.stage} style={style} data-template={template.id} aria-hidden>
        {scale > 0 && children}
      </div>
    </div>
  );
}
