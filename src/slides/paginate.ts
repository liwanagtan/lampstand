// Pagination of long passages (PRD §6): a page holds what fits the layout at the minimum
// type size; split at verse boundaries first, then at sentence breaks, then at words.
import { fonts } from '@/design-system/tokens';
import type { OverlayMode, TemplateId } from '@/schema/common';
import { getTemplate } from '@/templates/templates';
import { CANVAS, LINE_HEIGHT, MEASURE, OVERLAY, SAFE, TYPE } from '@/templates/metrics';
import type { PassageVerse } from '@/features/bible/passage';

export interface TextBox {
  width: number;
  height: number;
}

/** Width of `text` in px at `size`. */
export type Measure = (text: string, size: number) => number;

/** Text area available for verse text in each layout (canvas px, after reference line). */
export function verseBox(mode: OverlayMode | 'slide'): TextBox {
  const refLine = TYPE.caption * 1.4 + 24; // reference above the text
  const pageLine = TYPE.caption * 1.2; // "2 / 3" indicator
  switch (mode) {
    case 'lowerThird': {
      const h = CANVAS.height * OVERLAY.lowerThirdHeight;
      return {
        width: CANVAS.width - SAFE.x * 2 - OVERLAY.panelPaddingX * 2,
        height: h - SAFE.y - OVERLAY.panelPaddingY * 2 - refLine + SAFE.y * 0.5,
      };
    }
    case 'sidePanel': {
      const w = CANVAS.width * OVERLAY.sidePanelWidth;
      return {
        width: w - SAFE.x - OVERLAY.panelPaddingX,
        height: CANVAS.height - SAFE.y * 2 - OVERLAY.panelPaddingY * 2 - refLine - pageLine,
      };
    }
    case 'popup':
      return {
        width: CANVAS.width * OVERLAY.popupWidth - OVERLAY.popupPaddingX * 2,
        height:
          CANVAS.height * OVERLAY.popupMaxHeight - OVERLAY.popupPaddingY * 2 - refLine - pageLine,
      };
    case 'fullScreen':
    case 'slide':
      return {
        width: Math.min(MEASURE.verse, CANVAS.width - SAFE.x * 2),
        height: CANVAS.height - SAFE.y * 2 - 120 - refLine - pageLine,
      };
  }
}

/** Show the Bible: a verse per line, whole verses only (and measured in the reader's serif). */
export const BIBLE_LAYOUT: VerseLayout = { lines: true, wholeVerses: true };

/** Pages as the screens draw them: the renderers and the page counter share this. */
export function pagesFor(
  verses: PassageVerse[],
  mode: OverlayMode | 'slide',
  templateId: TemplateId,
  bible: boolean,
): Page[] {
  const t = getTemplate(templateId);
  const measure = bible
    ? browserMeasure(fonts.display, 400)
    : browserMeasure(t.body.family, t.body.weight);
  return paginate(verses, verseBox(mode), measure, bible ? BIBLE_LAYOUT : {});
}

/** Approximate width for environments without canvas text metrics. */
export const approxMeasure: Measure = (text, size) => text.length * size * 0.5;

let canvasMeasure: Measure | null = null;

/** Measures with the real body font on a 2D canvas; falls back to an approximation. */
export function browserMeasure(fontFamily: string, weight = 400): Measure {
  if (typeof document === 'undefined') return approxMeasure;
  try {
    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx || typeof ctx.measureText !== 'function') return approxMeasure;
    const cache = new Map<string, number>();
    canvasMeasure = (text, size) => {
      const key = `${size}|${text}`;
      let w = cache.get(key);
      if (w === undefined) {
        ctx.font = `${weight} ${size}px ${fontFamily}`;
        w = ctx.measureText(text).width;
        if (cache.size > 5000) cache.clear();
        cache.set(key, w);
      }
      return w;
    };
    return canvasMeasure;
  } catch {
    return approxMeasure;
  }
}

/** Number of wrapped lines `text` needs in `width` at `size`. */
export function countLines(text: string, width: number, size: number, measure: Measure): number {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;
  const space = measure(' ', size);
  let lines = 1;
  let line = 0;
  for (const word of words) {
    const w = measure(word, size);
    if (line === 0) line = w;
    else if (line + space + w <= width) line += space + w;
    else {
      lines++;
      line = w;
    }
  }
  return lines;
}

export function fits(text: string, box: TextBox, size: number, measure: Measure): boolean {
  return countLines(text, box.width, size, measure) * size * LINE_HEIGHT.verse <= box.height;
}

/**
 * How verses are laid out (Show the Bible): each verse on its own line, and whole verses only, so
 * a verse is never cut across pages or truncated (a very long verse gets a page to itself, smaller).
 */
export interface VerseLayout {
  lines?: boolean;
  wholeVerses?: boolean;
}

/** Space between verses on their own lines, in em (VerseBody draws the same). */
export const VERSE_GAP = 0.3;
/** The smallest a whole verse may shrink to fit one page. */
const WHOLE_VERSE_MIN = 20;

function pageFits(
  segs: PageSegment[],
  box: TextBox,
  size: number,
  measure: Measure,
  layout: VerseLayout,
): boolean {
  if (!layout.lines) return fits(pageText(segs), box, size, measure);
  const lines = segs.reduce(
    (n, s) =>
      n + countLines((s.showNumber ? NUMBER_ALLOWANCE : '') + s.text, box.width, size, measure),
    0,
  );
  const gaps = Math.max(0, segs.length - 1) * VERSE_GAP * size;
  return lines * size * LINE_HEIGHT.verse + gaps <= box.height;
}

/** A piece of a verse shown on a page (whole verse unless it had to be split). */
export interface PageSegment {
  osis: string;
  chapter: number;
  verse: number;
  text: string;
  /** Show the verse number (false for the continuation of a split verse). */
  showNumber: boolean;
  missing: boolean;
}

export interface Page {
  segments: PageSegment[];
  /** Type size that fits this page, between the minimum and the full verse size. */
  size: number;
}

const NUMBER_ALLOWANCE = '00 ';

function pageText(segs: PageSegment[]): string {
  return segs.map((s) => (s.showNumber ? NUMBER_ALLOWANCE : '') + s.text).join(' ');
}

/** Splits text that is too long for one page: sentence breaks first, then words. */
function splitLong(text: string, box: TextBox, measure: Measure): string[] {
  const minSize = TYPE.minimumBody;
  const pieces: string[] = [];
  const sentences = text.match(/[^.;:!?]+[.;:!?]+["’”)]*\s*|[^.;:!?]+$/g) ?? [text];
  let current = '';
  const flush = () => {
    if (current.trim()) pieces.push(current.trim());
    current = '';
  };
  for (const s of sentences) {
    const candidate = current ? `${current} ${s.trim()}` : s.trim();
    if (fits(NUMBER_ALLOWANCE + candidate, box, minSize, measure)) {
      current = candidate;
      continue;
    }
    flush();
    if (fits(NUMBER_ALLOWANCE + s.trim(), box, minSize, measure)) {
      current = s.trim();
      continue;
    }
    // A single sentence still too long: split at words.
    for (const word of s.trim().split(/\s+/)) {
      const c = current ? `${current} ${word}` : word;
      if (fits(NUMBER_ALLOWANCE + c, box, minSize, measure)) current = c;
      else {
        flush();
        current = word;
      }
    }
  }
  flush();
  return pieces;
}

function bestSize(
  segs: PageSegment[],
  box: TextBox,
  measure: Measure,
  layout: VerseLayout,
): number {
  const floor = layout.wholeVerses ? WHOLE_VERSE_MIN : TYPE.minimumBody;
  for (let size = TYPE.verse; size > floor; size -= 2) {
    if (pageFits(segs, box, size, measure, layout)) return size;
  }
  return floor;
}

/**
 * Packs verses into pages that fit `box` at the minimum body size. Verses are never cut
 * unless one verse alone is too long (never, with `wholeVerses`), and text is never truncated.
 */
export function paginate(
  verses: PassageVerse[],
  box: TextBox,
  measure: Measure = approxMeasure,
  layout: VerseLayout = {},
): Page[] {
  const minSize = TYPE.minimumBody;
  const segments: PageSegment[] = [];
  for (const v of verses) {
    const base = { osis: v.osis, chapter: v.chapter, verse: v.verse, missing: v.missing };
    const text = v.missing ? 'This verse is not included in this translation.' : v.text;
    if (layout.wholeVerses || fits(NUMBER_ALLOWANCE + text, box, minSize, measure)) {
      segments.push({ ...base, text, showNumber: true });
    } else {
      splitLong(text, box, measure).forEach((t, i) =>
        segments.push({ ...base, text: t, showNumber: i === 0 }),
      );
    }
  }

  const pages: PageSegment[][] = [];
  let current: PageSegment[] = [];
  for (const seg of segments) {
    const candidate = [...current, seg];
    if (current.length === 0 || pageFits(candidate, box, minSize, measure, layout)) {
      current = candidate;
    } else {
      pages.push(current);
      current = [seg];
    }
  }
  if (current.length) pages.push(current);
  return pages.map((segs) => ({ segments: segs, size: bestSize(segs, box, measure, layout) }));
}
