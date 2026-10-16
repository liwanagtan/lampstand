// Content for the sermon poster (Scene), taken from the presentation's own details.
import { createContext, useContext } from 'react';
import type { StoredPresentation, StoredSlide } from '@/schema/presentation';

export interface PosterInfo {
  series?: string;
  date?: string;
  speaker?: string;
  /** Main verse: the presentation's first verse slide. */
  mainRef?: string;
  mainTranslation?: string;
  /** Play the animated Scene where motion is allowed (presentation setting, default on). */
  animated: boolean;
}

export const PosterContext = createContext<PosterInfo | null>(null);

export function usePosterInfo(): PosterInfo | null {
  return useContext(PosterContext);
}

/** "Sun · Oct 18" from an ISO date. */
export function posterDate(iso: string | undefined): string | undefined {
  if (!iso) return undefined;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return undefined;
  const date = new Date(y, m - 1, d);
  const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  return `${weekday} · ${month} ${d}`;
}

export function posterInfoFor(
  p: Pick<StoredPresentation, 'series' | 'date' | 'speaker' | 'slides' | 'translation'>,
  translation: string,
  animated = true,
): PosterInfo {
  const verse = p.slides.find(
    (s): s is Extract<StoredSlide, { type: 'verse' }> => s.type === 'verse',
  );
  return {
    series: p.series,
    date: posterDate(p.date),
    speaker: p.speaker,
    mainRef: verse?.ref,
    mainTranslation: (verse?.translation ?? translation).toUpperCase(),
    animated,
  };
}

/**
 * A short excerpt for the poster: the verse's first sentence when it is brief, else the whole
 * verse when that is brief, else nothing (never cut mid-sentence).
 */
export function posterExcerpt(text: string | undefined, max = 120): string | undefined {
  const t = text?.trim();
  if (!t) return undefined;
  const first = /^[^.;:!?]+[.;:!?]/.exec(t)?.[0]?.trim();
  if (first && first.length <= max && first.length >= 20) return first.replace(/[;:]$/, '.');
  if (t.length <= max) return t;
  return undefined;
}
