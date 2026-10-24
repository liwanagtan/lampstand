// Slide file schema v2. The JSON Schema in skill/lampstand-slides/schema.json is
// generated from these definitions by scripts/export-schema.ts.
import { z } from 'zod';
import { TEMPLATE_IDS, TRANSITIONS } from './common';

export const SCHEMA_VERSION = 2 as const;

/** Character and count limits, shared by validation, the editor counters and the skill. */
export const LIMITS = {
  presentation: { title: 80, speaker: 60, series: 60, slidesMin: 1, slidesMax: 80, extraRefs: 40 },
  notes: 2000,
  description: 200,
  title: { heading: 60, subtitle: 90, speaker: 60 },
  section: { label: 20, heading: 50 },
  point: { heading: 60, body: 160 },
  list: { heading: 60, item: 70, itemsMin: 2, itemsMax: 5 },
  verse: { versesPerSlide: 6, emphasisItem: 60, emphasisMax: 6 },
  quote: { text: 220, author: 60 },
  statement: { text: 90 },
  image: { caption: 90 },
  countdown: { minutesMin: 1, minutesMax: 30, label: 40 },
  closing: { heading: 60, body: 160 },
} as const;

const text = (max: number, what: string) =>
  z
    .string({ error: `${what} must be text.` })
    .trim()
    .min(1, { error: `${what} can't be empty.` })
    .max(max, {
      error: (iss) =>
        `${what} is ${String((iss.input as string).length)} characters; the limit is ${max}.`,
    });

const translationCode = z
  .string()
  .regex(/^[A-Za-z][A-Za-z0-9]{1,7}$/, { error: 'Translation must be a short code like "KJV".' })
  .transform((s) => s.toUpperCase());

export const BackgroundSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('template') }),
  z.strictObject({ type: z.literal('color'), tone: z.enum(['base', 'accent', 'deep']) }),
  z.strictObject({ type: z.literal('gradient'), tone: z.enum(['calm', 'warm', 'dawn']) }),
  z.strictObject({
    type: z.literal('image'),
    description: text(LIMITS.description, 'Image description').meta({
      description:
        'What the image should show, e.g. "sunrise over hills, soft warm light". Never a URL.',
    }),
    assetId: z.string().optional(),
    motion: z.enum(['still', 'drift']).optional(),
  }),
  z.strictObject({
    type: z.literal('video'),
    description: text(LIMITS.description, 'Video description'),
    assetId: z.string().optional(),
  }),
]);
export type Background = z.infer<typeof BackgroundSchema>;

export const AttachedVerseSchema = z.strictObject({
  ref: text(60, 'Reference'),
  translation: translationCode.optional(),
  emphasis: z.array(text(60, 'Emphasis')).max(6).optional(),
});

const attached = {
  verses: z.array(AttachedVerseSchema).min(1).max(3).optional(),
  panel: z.enum(['side', 'bottom']).optional(),
};

const base = {
  id: z.string().min(1).max(64).optional(),
  notes: z
    .string()
    .max(LIMITS.notes, { error: `Notes are limited to ${LIMITS.notes} characters.` })
    .meta({ description: 'Speaking prompts for the pastor/operator. Never shown on the TV.' })
    .optional(),
  transition: z
    .enum(TRANSITIONS)
    .meta({ description: 'Default fade; rise for section changes.' })
    .optional(),
  background: BackgroundSchema.optional(),
};

export const TitleSlideSchema = z.strictObject({
  type: z.literal('title'),
  ...base,
  heading: text(LIMITS.title.heading, 'Heading'),
  subtitle: text(LIMITS.title.subtitle, 'Subtitle').optional(),
  speaker: text(LIMITS.title.speaker, 'Speaker').optional(),
});

export const SectionSlideSchema = z.strictObject({
  type: z.literal('section'),
  ...base,
  label: text(LIMITS.section.label, 'Label').optional(),
  heading: text(LIMITS.section.heading, 'Heading'),
});

export const PointSlideSchema = z.strictObject({
  type: z.literal('point'),
  ...base,
  ...attached,
  heading: text(LIMITS.point.heading, 'Heading'),
  body: text(LIMITS.point.body, 'Body').optional(),
});

export const ListSlideSchema = z.strictObject({
  type: z.literal('list'),
  ...base,
  ...attached,
  heading: text(LIMITS.list.heading, 'Heading'),
  items: z
    .array(text(LIMITS.list.item, 'List item'))
    .min(LIMITS.list.itemsMin, { error: `A list needs at least ${LIMITS.list.itemsMin} items.` })
    .max(LIMITS.list.itemsMax, {
      error: `A list can have at most ${LIMITS.list.itemsMax} items; split it across slides.`,
    }),
  reveal: z
    .boolean()
    .meta({ description: 'Opt in to revealing items with the reveal control.' })
    .optional(),
});

export const VerseSlideSchema = z.strictObject({
  type: z.literal('reading'),
  ...base,
  ref: z.string().trim().min(1, { error: "Reference can't be empty." }).max(60).meta({
    description:
      'Human-readable reference, e.g. "John 3:16-18" or "Ps 23". One passage only. Never include verse text.',
  }),
  translation: translationCode.optional(),
  emphasis: z
    .array(text(LIMITS.verse.emphasisItem, 'Emphasis'))
    .max(LIMITS.verse.emphasisMax, {
      error: `Use at most ${LIMITS.verse.emphasisMax} emphasis phrases.`,
    })
    .meta({
      description: 'Words or short phrases inside the verse to highlight, e.g. ["so loved"].',
    })
    .optional(),
});

export const QuoteSlideSchema = z.strictObject({
  type: z.literal('quote'),
  ...base,
  ...attached,
  text: text(LIMITS.quote.text, 'Quote'),
  author: text(LIMITS.quote.author, 'Author').optional(),
});

export const StatementSlideSchema = z.strictObject({
  type: z.literal('statement'),
  ...base,
  ...attached,
  text: text(LIMITS.statement.text, 'Statement'),
});

export const ImageSlideSchema = z.strictObject({
  type: z.literal('image'),
  ...base,
  background: z.discriminatedUnion('type', [
    BackgroundSchema.options[3],
    BackgroundSchema.options[4],
  ]),
  caption: text(LIMITS.image.caption, 'Caption').optional(),
});

export const CountdownSlideSchema = z.strictObject({
  type: z.literal('countdown'),
  ...base,
  minutes: z
    .number({ error: 'Minutes must be a number.' })
    .int({ error: 'Minutes must be a whole number.' })
    .min(LIMITS.countdown.minutesMin, { error: 'Countdown must be at least 1 minute.' })
    .max(LIMITS.countdown.minutesMax, { error: 'Countdown can be at most 30 minutes.' }),
  label: text(LIMITS.countdown.label, 'Label').optional(),
});

export const ClosingSlideSchema = z.strictObject({
  type: z.literal('closing'),
  ...base,
  ...attached,
  heading: text(LIMITS.closing.heading, 'Heading'),
  body: text(LIMITS.closing.body, 'Body').optional(),
});

export const SlideSchema = z.discriminatedUnion('type', [
  TitleSlideSchema,
  SectionSlideSchema,
  PointSlideSchema,
  ListSlideSchema,
  VerseSlideSchema,
  QuoteSlideSchema,
  StatementSlideSchema,
  ImageSlideSchema,
  CountdownSlideSchema,
  ClosingSlideSchema,
]);

export const PresentationSchema = z.strictObject({
  schemaVersion: z.literal(SCHEMA_VERSION),
  title: text(LIMITS.presentation.title, 'Title'),
  speaker: text(LIMITS.presentation.speaker, 'Speaker').optional(),
  date: z.iso.date({ error: 'Date must look like 2026-10-18.' }).optional(),
  series: text(LIMITS.presentation.series, 'Series').optional(),
  theme: z.enum(TEMPLATE_IDS).optional(),
  translation: translationCode.optional(),
  extraRefs: z
    .array(z.string().trim().min(1).max(60))
    .max(LIMITS.presentation.extraRefs)
    .meta({
      description:
        'Verses the pastor will likely mention that are not on a slide; preloaded into the verse queue.',
    })
    .optional(),
  slides: z
    .array(SlideSchema)
    .min(LIMITS.presentation.slidesMin, { error: 'A presentation needs at least one slide.' })
    .max(LIMITS.presentation.slidesMax, {
      error: `A presentation can have at most ${LIMITS.presentation.slidesMax} slides.`,
    }),
});

export type Slide = z.infer<typeof SlideSchema>;
export type SlideType = Slide['type'];
export type SlideOf<T extends SlideType> = Extract<Slide, { type: T }>;
export type Presentation = z.infer<typeof PresentationSchema>;
export type PresentationInput = z.input<typeof PresentationSchema>;

export const SLIDE_TYPES = SlideSchema.options.map((o) => o.shape.type.value) as SlideType[];

/** A slide as stored: the id is always present after import. */
export type StoredSlide = Slide & { id: string };
export type StoredPresentation = Omit<Presentation, 'slides'> & { slides: StoredSlide[] };
