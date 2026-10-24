// What the console says about a slide: its name in the rail, its kind, and what is inside it
// (the Screen redesign canvas: the slide rail and the step bar).
import type { StoredSlide } from '@/schema/presentation';

const KIND: Record<StoredSlide['type'], string> = {
  title: 'Title',
  section: 'Section',
  point: 'Point',
  list: 'List',
  verse: 'Verse',
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
    case 'verse':
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

/** Items of a build list, or 0: Next shows them one at a time before moving on. */
export function buildItems(s: StoredSlide | undefined): number {
  return s?.type === 'list' && s.build ? s.items.length : 0;
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
 * What the next press of Next puts on the TV: the next list item, the next page of a passage,
 * or the next slide (from its start). Null at the end.
 */
export function nextBeat(
  slides: readonly StoredSlide[],
  index: number,
  buildStep: number,
  page: number,
  pages: (s: StoredSlide) => number,
): NextBeat | null {
  const slide = slides[index];
  if (!slide) return null;
  const items = buildItems(slide);
  if (buildStep < items && slide.type === 'list') {
    return {
      index,
      buildStep: buildStep + 1,
      page,
      label: `Item ${buildStep + 1}: ${slide.items[buildStep]}`,
    };
  }
  const total = pages(slide);
  if (page < total - 1) {
    return { index, buildStep, page: page + 1, label: `Page ${page + 2} of ${total}` };
  }
  const next = slides[index + 1];
  if (!next) return null;
  return {
    index: index + 1,
    buildStep: 0,
    page: 0,
    label: `Slide ${index + 2} · ${slideKind(next)} · ${slideTitle(next)}`,
  };
}
