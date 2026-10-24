// Slide operations for the editor (PRD §7.3).
import { validatePresentation } from '@/schema/validate';
import {
  SlideSchema,
  SLIDE_TYPES,
  type SlideType,
  type StoredPresentation,
  type StoredSlide,
} from '@/schema/presentation';

const newId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `s-${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;

export const SLIDE_TYPE_LABELS: Record<SlideType, string> = {
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

export function newSlide(type: SlideType): StoredSlide {
  const id = newId();
  switch (type) {
    case 'title':
      return { id, type, heading: 'Sermon title' };
    case 'section':
      return { id, type, label: 'Point 1', heading: 'Section heading', transition: 'rise' };
    case 'point':
      return { id, type, heading: 'One main idea' };
    case 'list':
      return { id, type, heading: 'List heading', items: ['First item', 'Second item'] };
    case 'reading':
      return { id, type, ref: 'John 3:16' };
    case 'quote':
      return { id, type, text: 'Quote text' };
    case 'statement':
      return { id, type, text: 'One bold line' };
    case 'image':
      return { id, type, background: { type: 'image', description: 'Describe the image' } };
    case 'countdown':
      return { id, type, minutes: 5, label: 'Service begins soon' };
    case 'closing':
      return { id, type, heading: 'Let us pray' };
  }
}

export function insertAfter(
  p: StoredPresentation,
  afterId: string | null,
  slide: StoredSlide,
): StoredPresentation {
  const i = afterId ? p.slides.findIndex((s) => s.id === afterId) : p.slides.length - 1;
  const slides = [...p.slides];
  slides.splice(i + 1, 0, slide);
  return { ...p, slides };
}

export function duplicateSlide(
  p: StoredPresentation,
  id: string,
): { presentation: StoredPresentation; id: string } {
  const src = p.slides.find((s) => s.id === id);
  if (!src) return { presentation: p, id };
  const copy = { ...structuredClone(src), id: newId() } as StoredSlide;
  return { presentation: insertAfter(p, id, copy), id: copy.id };
}

/** Removes a slide; a presentation always keeps at least one. Returns the slide to select next. */
export function deleteSlide(
  p: StoredPresentation,
  id: string,
): { presentation: StoredPresentation; select: string | null } {
  if (p.slides.length <= 1) return { presentation: p, select: id };
  const i = p.slides.findIndex((s) => s.id === id);
  if (i < 0) return { presentation: p, select: null };
  const slides = p.slides.filter((s) => s.id !== id);
  return { presentation: { ...p, slides }, select: slides[Math.min(i, slides.length - 1)]!.id };
}

export function reorderSlides(p: StoredPresentation, ids: string[]): StoredPresentation {
  const byId = new Map(p.slides.map((s) => [s.id, s]));
  const slides = ids.map((id) => byId.get(id)).filter((s): s is StoredSlide => Boolean(s));
  if (slides.length !== p.slides.length) return p;
  return { ...p, slides };
}

export function moveSlide(p: StoredPresentation, id: string, delta: -1 | 1): StoredPresentation {
  const i = p.slides.findIndex((s) => s.id === id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= p.slides.length) return p;
  const slides = [...p.slides];
  [slides[i], slides[j]] = [slides[j]!, slides[i]!];
  return { ...p, slides };
}

type Content = Partial<
  Record<
    'heading' | 'body' | 'text' | 'label' | 'subtitle' | 'speaker' | 'author' | 'caption',
    string
  >
> & {
  items?: string[];
};

function contentOf(s: StoredSlide): Content {
  switch (s.type) {
    case 'title':
      return { heading: s.heading, subtitle: s.subtitle, speaker: s.speaker };
    case 'section':
      return { heading: s.heading, label: s.label };
    case 'point':
    case 'closing':
      return { heading: s.heading, body: s.body };
    case 'list':
      return { heading: s.heading, items: s.items };
    case 'quote':
      return { text: s.text, author: s.author };
    case 'statement':
      return { text: s.text };
    case 'image':
      return { caption: s.caption };
    default:
      return {};
  }
}

/** Fields each type accepts, and where a source field lands. */
const TARGETS: Partial<Record<SlideType, Record<string, string>>> = {
  title: { heading: 'heading', subtitle: 'subtitle', body: 'subtitle', speaker: 'speaker' },
  section: { heading: 'heading', label: 'label' },
  point: { heading: 'heading', body: 'body', subtitle: 'body' },
  closing: { heading: 'heading', body: 'body', subtitle: 'body' },
  quote: { text: 'text', author: 'author' },
  statement: { text: 'text' },
};

/**
 * Converts a slide to another type when every piece of its content has a place there and fits
 * the limits (PRD §7.3 "where fields are compatible"). Returns null otherwise.
 */
export function convertSlide(s: StoredSlide, to: SlideType): StoredSlide | null {
  if (s.type === to) return s;
  const map = TARGETS[to];
  if (!map) return null;
  const content = contentOf(s);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(content)) {
    if (v === undefined || (Array.isArray(v) && v.length === 0)) continue;
    const target = map[k];
    if (!target || out[target] !== undefined) return null;
    out[target] = v;
  }
  const base = {
    id: s.id,
    notes: s.notes,
    transition: s.transition,
    background: s.background,
    ...('verses' in s && s.verses?.length ? { verses: s.verses, panel: s.panel } : {}),
  };
  const candidate = { ...base, type: to, ...out };
  const parsed = SlideSchema.safeParse(candidate);
  return parsed.success ? ({ ...parsed.data, id: s.id } as StoredSlide) : null;
}

export function compatibleTypes(s: StoredSlide): SlideType[] {
  return SLIDE_TYPES.filter((t) => t !== s.type && convertSlide(s, t) !== null);
}

/** Problems with a slide as edited, for the strip badge and fields panel. */
export function slideIssues(s: StoredSlide): string[] {
  const r = validatePresentation({ schemaVersion: 2, title: 'Slide', slides: [s] });
  return r.ok ? [] : r.errors.map((issue) => issue.message);
}
