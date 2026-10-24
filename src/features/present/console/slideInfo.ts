// What the console says about a slide: its name in the rail, its kind, and what is inside it
// (the Screen redesign canvas: the slide rail and the step bar).
import type { StoredSlide } from '@/schema/presentation';

const KIND: Record<StoredSlide['type'], string> = {
  title: 'Title',
  section: 'Section',
  point: 'Point',
  list: 'List',
  reading: 'Reading',
  quote: 'Quote',
  statement: 'Statement',
  image: 'Image',
  countdown: 'Countdown',
  closing: 'Closing',
};

export function slideKind(s: StoredSlide): string {
  return s.type === 'list' ? `List · ${s.items.length}` : KIND[s.type];
}

/** The line that names a slide in the rail, the palette and Next. */
export function slideTitle(s: StoredSlide): string {
  switch (s.type) {
    case 'reading':
      return s.ref;
    case 'quote':
    case 'statement':
      return s.text;
    case 'image':
      return s.caption ?? 'Image';
    case 'countdown':
      return s.label ?? `Countdown · ${s.minutes} min`;
    default:
      return s.heading;
  }
}

/** Number of items available to the separate reveal control. */
export function buildItems(s: StoredSlide | undefined): number {
  return s?.type === 'list' && s.reveal ? s.items.length : 0;
}

export interface NextBeat {
  /** The slide Next shows, and how far into it. */
  index: number;
  buildStep: number;
  page: number;
  /** One line about it, for the step bar and the Next pane. */
  label: string;
}

/**
 * Next always changes slides. Reveal, reading pages and verse panels have their own controls.
 */
export function nextBeat(
  slides: readonly StoredSlide[],
  index: number,
  _buildStep: number,
  _page: number,
  _pages: (s: StoredSlide) => number,
): NextBeat | null {
  const slide = slides[index];
  if (!slide) return null;
  const next = slides[index + 1];
  if (!next) return null;
  return {
    index: index + 1,
    buildStep: 0,
    page: 0,
    label: `Slide ${index + 2} · ${slideKind(next)} · ${slideTitle(next)}`,
  };
}
