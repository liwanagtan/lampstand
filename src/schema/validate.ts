// Import validation (PRD §7.2): Zod + reference parser, with plain-language messages by slide.
import type { z } from 'zod';
import { formatRef, parseRefDetailed, verseCountInRange } from '@/features/bible/ref';
import { migrate } from './migrations';
import {
  LIMITS,
  PresentationSchema,
  SLIDE_TYPES,
  type Presentation,
  type StoredPresentation,
  type StoredSlide,
} from './presentation';

export interface ValidationIssue {
  /** 0-based slide index when the issue belongs to a slide. */
  slideIndex?: number;
  slideType?: string;
  message: string;
}

export type ValidationResult =
  | {
      ok: true;
      presentation: StoredPresentation;
      warnings: ValidationIssue[];
      migratedFrom?: number;
    }
  | { ok: false; errors: ValidationIssue[]; warnings: ValidationIssue[] };

export interface ValidateOptions {
  /** Translation codes installed in the app; unknown ones produce a warning. */
  knownTranslations?: readonly string[];
  defaultTranslation?: string;
  newId?: () => string;
}

const FIELD_LABELS: Record<string, string> = {
  schemaVersion: 'schemaVersion',
  heading: 'Heading',
  subtitle: 'Subtitle',
  speaker: 'Speaker',
  label: 'Label',
  body: 'Body',
  items: 'Items',
  ref: 'Reference',
  text: 'Text',
  author: 'Author',
  caption: 'Caption',
  minutes: 'Minutes',
  background: 'Background',
  description: 'Description',
  title: 'Title',
  slides: 'Slides',
  emphasis: 'Emphasis',
  translation: 'Translation',
  type: 'Type',
};

const baseLabel = (key: PropertyKey | undefined) =>
  key === undefined ? 'Value' : (FIELD_LABELS[String(key)] ?? String(key));

function describeType(v: unknown): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'a list';
  return typeof v === 'string' ? 'text' : typeof v;
}

const TYPE_LABELS: Record<string, string> = {
  'quote.text': 'Quote',
  'statement.text': 'Statement',
};

function messageFor(issue: z.core.$ZodIssue, raw: unknown, slideType?: string): string {
  const path = issue.path;
  const key = [...path].reverse().find((p) => typeof p === 'string');
  const label = (k: PropertyKey | undefined) =>
    (slideType && k !== undefined && TYPE_LABELS[`${slideType}.${String(k)}`]) || baseLabel(k);
  const value = path.reduce<unknown>(
    (acc, k) =>
      acc && typeof acc === 'object' ? (acc as Record<PropertyKey, unknown>)[k] : undefined,
    raw,
  );
  switch (issue.code) {
    case 'unrecognized_keys':
      return issue.keys.length === 1
        ? `unknown field "${issue.keys[0]}". Check the spelling.`
        : `unknown fields ${issue.keys.map((k) => `"${k}"`).join(', ')}. Check the spelling.`;
    case 'invalid_union':
      if (key === 'type' || (issue as { note?: string }).note === 'No matching discriminator') {
        const t = path.at(-1) === 'type' ? value : (value as { type?: unknown } | undefined)?.type;
        if (path.at(-1) === 'background' || path.includes('background')) {
          return `background type ${JSON.stringify(t)} isn't valid. Use template, color, gradient, image or video.`;
        }
        return t === undefined
          ? `slide is missing "type". Use one of: ${SLIDE_TYPES.join(', ')}.`
          : `"${String(t)}" isn't a slide type. Use one of: ${SLIDE_TYPES.join(', ')}.`;
      }
      return `${label(key)} isn't valid.`;
    case 'invalid_type':
      if (value === undefined) return `${label(key)} is required.`;
      if (issue.expected === 'int') return `${label(key)} must be a whole number.`;
      return `${label(key)} should be ${issue.expected === 'string' ? 'text' : issue.expected}, not ${describeType(value)}.`;
    case 'invalid_value':
      if (key === 'schemaVersion') return 'schemaVersion must be 1.';
      return `${label(key)} must be one of: ${issue.values.map((v) => String(v)).join(', ')}.`;
    default:
      return issue.message;
  }
}

const capitalize = (s: string) =>
  s.startsWith('schemaVersion') ? s : s.charAt(0).toUpperCase() + s.slice(1);

function slideTypeOf(raw: unknown, index: number): string | undefined {
  const slides = (raw as { slides?: unknown[] } | undefined)?.slides;
  const t = Array.isArray(slides)
    ? (slides[index] as { type?: unknown } | undefined)?.type
    : undefined;
  return typeof t === 'string' && (SLIDE_TYPES as string[]).includes(t) ? t : undefined;
}

export function slidePrefix(index: number, type?: string): string {
  return type ? `Slide ${index + 1} (${type})` : `Slide ${index + 1}`;
}

/** Formats an issue for display: "Slide 7 (verse): 'Jhn 3:16' isn't a recognized reference." */
export function formatIssue(issue: ValidationIssue): string {
  if (issue.slideIndex === undefined) return capitalize(issue.message);
  return `${slidePrefix(issue.slideIndex, issue.slideType)}: ${issue.message}`;
}

function parseJson(text: string): { ok: true; value: unknown } | { ok: false; message: string } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    let where = '';
    const lineCol = /line (\d+) column (\d+)/.exec(msg);
    const pos = /position (\d+)/.exec(msg);
    if (lineCol) where = ` near line ${lineCol[1]}`;
    else if (pos) where = ` near line ${text.slice(0, Number(pos[1])).split('\n').length}`;
    const empty = text.trim() === '';
    return {
      ok: false,
      message: empty
        ? 'The file is empty.'
        : `This isn't valid JSON${where}. Make sure the whole file was copied, from the first { to the last }.`,
    };
  }
}

function stripCodeFence(text: string): string {
  const m = /^\s*```(?:json)?\s*\n([\s\S]*?)\n\s*```\s*$/.exec(text);
  return m ? m[1]! : text;
}

const defaultId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `s-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;

export function validatePresentation(
  input: unknown,
  options: ValidateOptions = {},
): ValidationResult {
  const warnings: ValidationIssue[] = [];
  let raw = input;
  if (typeof input === 'string') {
    const parsed = parseJson(stripCodeFence(input));
    if (!parsed.ok) return { ok: false, errors: [{ message: parsed.message }], warnings };
    raw = parsed.value;
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      ok: false,
      errors: [
        {
          message:
            "This doesn't look like a Lampstand presentation. It should be a JSON object with title and slides.",
        },
      ],
      warnings,
    };
  }

  const migrated = migrate(raw as Record<string, unknown>);
  if (!migrated.ok) return { ok: false, errors: [{ message: migrated.message }], warnings };
  raw = migrated.data;

  const errors: ValidationIssue[] = [];
  const result = PresentationSchema.safeParse(raw);
  if (!result.success) {
    for (const issue of result.error.issues) {
      const [first, index] = issue.path;
      if (first === 'slides' && typeof index === 'number') {
        const slideType = slideTypeOf(raw, index);
        errors.push({ slideIndex: index, slideType, message: messageFor(issue, raw, slideType) });
      } else if (first === 'extraRefs' && typeof index === 'number') {
        errors.push({ message: `Extra reference ${index + 1}: ${messageFor(issue, raw)}` });
      } else {
        errors.push({ message: messageFor(issue, raw) });
      }
    }
  }

  // References are checked even when other fields fail, so every problem shows at once.
  const known = options.knownTranslations;
  const rawSlides = (raw as { slides?: unknown }).slides;
  if (Array.isArray(rawSlides)) {
    rawSlides.forEach((s, i) => {
      if (!s || typeof s !== 'object' || (s as { type?: unknown }).type !== 'verse') return;
      const { ref, translation } = s as { ref?: unknown; translation?: unknown };
      if (typeof ref !== 'string' || !ref.trim()) return;
      const r = parseRefDetailed(ref);
      if (!r.ok) {
        const message =
          r.problem === 'verse' || r.problem === 'chapter'
            ? `'${ref}' doesn't exist — ${r.hint}`
            : r.problem === 'multiple'
              ? `'${ref}' has more than one passage. Use one passage per verse slide.`
              : `'${ref}' isn't a recognized reference.`;
        errors.push({ slideIndex: i, slideType: 'verse', message });
        return;
      }
      const count = verseCountInRange(r.range);
      if (count > LIMITS.verse.versesPerSlide) {
        warnings.push({
          slideIndex: i,
          slideType: 'verse',
          message: `${formatRef(r.range)} has ${count} verses; it will show across several pages.`,
        });
      }
      if (known && typeof translation === 'string' && !known.includes(translation.toUpperCase())) {
        warnings.push({
          slideIndex: i,
          slideType: 'verse',
          message: `translation "${translation}" isn't installed; ${options.defaultTranslation ?? 'the default'} will be used.`,
        });
      }
    });
  }
  const extraRefs = (raw as { extraRefs?: unknown }).extraRefs;
  if (Array.isArray(extraRefs)) {
    extraRefs.forEach((ref, i) => {
      if (typeof ref !== 'string' || !ref.trim()) return;
      const r = parseRefDetailed(ref);
      if (!r.ok) {
        errors.push({
          message: `Extra reference ${i + 1}: '${ref}' isn't a recognized reference.`,
        });
      }
    });
  }
  const presTranslation = (raw as { translation?: unknown }).translation;
  if (
    known &&
    typeof presTranslation === 'string' &&
    !known.includes(presTranslation.toUpperCase())
  ) {
    warnings.push({
      message: `Translation "${presTranslation}" isn't installed; ${options.defaultTranslation ?? 'the default'} will be used.`,
    });
  }

  if (errors.length > 0 || !result.success) {
    errors.sort((a, b) => (a.slideIndex ?? -1) - (b.slideIndex ?? -1));
    return { ok: false, errors: dedupe(errors), warnings };
  }

  return {
    ok: true,
    presentation: withIds(result.data, options.newId ?? defaultId),
    warnings,
    migratedFrom: migrated.migratedFrom,
  };
}

function dedupe(issues: ValidationIssue[]): ValidationIssue[] {
  const seen = new Set<string>();
  return issues.filter((i) => {
    const k = `${i.slideIndex}|${i.message}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Ensures every slide has a unique id. */
export function withIds(p: Presentation, newId: () => string = defaultId): StoredPresentation {
  const seen = new Set<string>();
  const slides = p.slides.map((s) => {
    let id = s.id;
    if (!id || seen.has(id)) id = newId();
    seen.add(id);
    return { ...s, id } as StoredSlide;
  });
  return { ...p, slides };
}

/** Removes empty optional fields so exported files stay tidy and re-import cleanly. */
export function toExportJson(p: StoredPresentation): string {
  return JSON.stringify(p, (_k, v: unknown) => (v === undefined ? undefined : v), 2);
}
