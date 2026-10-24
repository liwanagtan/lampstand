import { useLayoutEffect, useRef } from 'react';
import { cx } from '@/design-system/components';
import { useReducedMotion } from '@/features/settings/theme';
import type { StoredSlide } from '@/schema/presentation';
import { buildItems, slideKind, slideTitle } from './slideInfo';
import styles from './SlideRail.module.css';

interface Chip {
  text: string;
  tone: 'verse' | 'plain' | 'progress';
}

/**
 * The slide rail: the sermon as an outline you can read at a glance. Sections head their slides;
 * chips say what is inside (a passage and its pages, a list that builds and how far it has got).
 * One click cues a slide into Next; Enter sends it. No double-click: nothing goes live by accident.
 */
export function SlideRail({
  slides,
  liveIndex,
  cuedIndex,
  buildStep,
  page,
  pages,
  frozenIndex,
  covered,
  onCue,
}: {
  slides: readonly StoredSlide[];
  liveIndex: number;
  cuedIndex: number | null;
  buildStep: number;
  page: number;
  pages: (s: StoredSlide) => number;
  /** While frozen: the slide the TV is holding. */
  frozenIndex: number | null;
  /** Blank or the sermon poster covers the live slide. */
  covered: boolean;
  onCue: (index: number) => void;
}) {
  const listRef = useRef<HTMLOListElement>(null);
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    const row = listRef.current?.querySelector<HTMLElement>(`[data-index="${liveIndex}"]`);
    row?.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
  }, [liveIndex, reduced]);

  const chipsFor = (s: StoredSlide, live: boolean): Chip[] => {
    const chips: Chip[] = [];
    if (s.type === 'verse') {
      const total = pages(s);
      if (live && total > 1) chips.push({ text: `Page ${page + 1} of ${total}`, tone: 'progress' });
      else if (total > 1) chips.push({ text: `${total} pages`, tone: 'plain' });
      if (s.translation) chips.push({ text: s.translation.toUpperCase(), tone: 'verse' });
    }
    const items = buildItems(s);
    if (items) {
      chips.push(
        live
          ? { text: `Reveal · ${buildStep} of ${items}`, tone: 'progress' }
          : { text: 'Reveal', tone: 'plain' },
      );
    }
    return chips;
  };

  return (
    <nav className={styles.rail} aria-label="Slides">
      <div className={styles.head}>
        <span>Slides</span>
        <span className={styles.count}>
          {liveIndex + 1} of {slides.length}
        </span>
      </div>
      <ol ref={listRef} className={styles.list}>
        {slides.map((s, i) => {
          const live = i === liveIndex;
          const held = frozenIndex === i;
          const cued = cuedIndex === i && !live;
          const tag = held
            ? 'On TV'
            : live
              ? frozenIndex !== null
                ? 'Here'
                : covered
                  ? 'Under'
                  : 'Live'
              : cued
                ? 'Next'
                : null;
          if (s.type === 'section') {
            return (
              <li key={s.id} data-index={i}>
                <button
                  type="button"
                  className={cx(
                    styles.section,
                    live && styles.live,
                    held && styles.held,
                    cued && styles.cued,
                  )}
                  aria-current={live ? 'true' : undefined}
                  onClick={() => onCue(i)}
                >
                  <span className={styles.num}>{i + 1}</span>
                  <span className={styles.sectionText}>
                    {[s.label, s.heading].filter(Boolean).join(' · ')}
                  </span>
                  {tag && <span className={styles.tag}>{tag}</span>}
                </button>
              </li>
            );
          }
          const chips = chipsFor(s, live);
          return (
            <li key={s.id} data-index={i}>
              <button
                type="button"
                className={cx(
                  styles.row,
                  live && styles.live,
                  held && styles.held,
                  cued && styles.cued,
                )}
                aria-current={live ? 'true' : undefined}
                onClick={() => onCue(i)}
              >
                <span className={styles.num}>{i + 1}</span>
                <span className={styles.body}>
                  <span className={styles.title}>{slideTitle(s)}</span>
                  <span className={styles.meta}>
                    <span className={styles.kind}>{slideKind(s)}</span>
                    {chips.map((c) => (
                      <span key={c.text} className={cx(styles.chip, styles[c.tone])}>
                        {c.text}
                      </span>
                    ))}
                  </span>
                </span>
                {tag && <span className={styles.tag}>{tag}</span>}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
