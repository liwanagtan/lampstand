// Reading plan files (.lampstand-plan.json): daily Bible plans and weekly or monthly lessons.
// Version 2 adds categories (from the plan catalog), audience, level, a cover, monthly pace, and a
// devotional and prayer per day. Version 1 files still load.
// Plans store references only, never scripture text, so they work with any translation.
import { z } from 'zod';
import { parseRefDetailed, type RefRange } from '../features/bible/ref';
import { PLAN_CATEGORY_IDS } from './planCatalog';

export const PLAN_FORMAT = 'lampstand-plan';
/** The version written by the skill and the app; version 1 files are still accepted. */
export const PLAN_VERSION = 2;

export const PLAN_LIMITS = {
  name: 80,
  description: 300,
  title: 100,
  note: 2000,
  question: 300,
  questions: 8,
  devotional: 6000,
  prayer: 1000,
  categories: 6,
  level: 40,
  credits: 300,
  license: 60,
  readings: 12,
  days: 400,
} as const;

const text = (max: number, what: string) =>
  z
    .string({ error: `${what} must be text.` })
    .trim()
    .min(1, { error: `${what} can't be empty.` })
    .max(max, { error: `${what} is too long (max ${max} characters).` });

/** A Bible reference such as "Luke 15:11-32", "Psalm 23" or "Genesis 1-3". */
const Reading = z
  .string({ error: 'Each reading must be a Bible reference.' })
  .trim()
  .superRefine((value, ctx) => {
    const r = parseRefDetailed(value);
    if (!r.ok) ctx.addIssue({ code: 'custom', message: `“${value}”: ${r.hint}` });
  })
  .meta({ description: 'A Bible reference, e.g. "Luke 15:11-32", "Psalm 23", "Genesis 1-3".' });

export const PlanDaySchema = z.strictObject({
  title: text(PLAN_LIMITS.title, 'Day title')
    .optional()
    .meta({ description: 'Optional, e.g. "The Prodigal Son".' }),
  readings: z
    .array(Reading)
    .min(1, { error: 'Each day needs at least one reading.' })
    .max(PLAN_LIMITS.readings),
  note: text(PLAN_LIMITS.note, 'Note')
    .optional()
    .meta({ description: 'A short teaching note shown before the readings. Plain text.' }),
  questions: z
    .array(text(PLAN_LIMITS.question, 'Question'))
    .max(PLAN_LIMITS.questions)
    .optional()
    .meta({ description: 'Discussion or reflection questions shown after the readings.' }),
  devotional: text(PLAN_LIMITS.devotional, 'Devotional').optional().meta({
    description:
      'Version 2. A short devotional (plain text, your own words) read after the readings.',
  }),
  prayer: text(PLAN_LIMITS.prayer, 'Prayer')
    .optional()
    .meta({ description: 'Version 2. A short prayer to close the day, in your own words.' }),
});

const CategoryId = z
  .string()
  .refine((v) => PLAN_CATEGORY_IDS.includes(v), {
    error: (iss) => `Unknown category “${String(iss.input)}”. Use an id from the plan catalog.`,
  })
  .meta({
    description: 'A category or subcategory id from catalog.json.',
    enum: [...PLAN_CATEGORY_IDS],
  });

export const PlanFileSchema = z.strictObject({
  format: z.literal(PLAN_FORMAT),
  version: z.union([z.literal(1), z.literal(2)], {
    error: 'The plan version must be 1 or 2.',
  }),
  id: z
    .string()
    .regex(/^[a-z0-9][a-z0-9-]{1,59}$/, {
      error: 'The plan id must be 2–60 lowercase letters, numbers or dashes.',
    })
    .meta({
      description: 'Stable id, e.g. "parables-8-weeks". Re-importing the same id updates it.',
    }),
  name: text(PLAN_LIMITS.name, 'Plan name'),
  description: text(PLAN_LIMITS.description, 'Description'),
  pace: z.enum(['daily', 'weekly', 'monthly']).meta({
    description:
      '"daily": one day at a time. "weekly": a new lesson each Sunday. "monthly": a new lesson each month.',
  }),
  categories: z
    .array(CategoryId)
    .max(PLAN_LIMITS.categories)
    .optional()
    .meta({ description: 'Version 2. Where the plan appears in Discover; several are allowed.' }),
  audience: z
    .enum(['personal', 'group'])
    .optional()
    .meta({ description: 'Version 2. "personal" reading, or lessons for a "group" or class.' }),
  level: text(PLAN_LIMITS.level, 'Level')
    .optional()
    .meta({ description: 'Version 2. Optional, e.g. "New to faith".' }),
  cover: z
    .string()
    .regex(/^[a-z0-9-]{1,60}$/)
    .optional()
    .meta({ description: 'Version 2. A bundled background id used as the plan’s cover.' }),
  credits: text(PLAN_LIMITS.credits, 'Credits').optional().meta({
    description:
      'Version 2. Who wrote or compiled the plan and its sources, e.g. "Robert Murray M’Cheyne (1842)".',
  }),
  license: text(PLAN_LIMITS.license, 'License').optional().meta({
    description: 'Version 2. e.g. "Public domain", "CC BY-SA 4.0". Shown with the credits.',
  }),
  days: z.array(PlanDaySchema).min(1).max(PLAN_LIMITS.days),
});

export type PlanFile = z.infer<typeof PlanFileSchema>;

/** A plan ready to use: references resolved to ranges. */
export interface Plan {
  id: string;
  name: string;
  description: string;
  pace: 'daily' | 'weekly' | 'monthly';
  source: 'builtin' | 'imported';
  categories: string[];
  audience: 'personal' | 'group';
  level?: string;
  cover?: string;
  credits?: string;
  license?: string;
  days: PlanDay[];
}

export interface PlanDay {
  title?: string;
  readings: RefRange[];
  note?: string;
  questions?: string[];
  devotional?: string;
  prayer?: string;
}

export type PlanParseResult = { ok: true; plan: Plan } | { ok: false; errors: string[] };

export function planFromFile(file: PlanFile, source: Plan['source']): Plan {
  return {
    id: file.id,
    name: file.name,
    description: file.description,
    pace: file.pace,
    source,
    categories: file.categories ?? [],
    audience: file.audience ?? (file.pace === 'daily' ? 'personal' : 'group'),
    level: file.level,
    cover: file.cover,
    credits: file.credits,
    license: file.license,
    days: file.days.map((d) => ({
      title: d.title,
      note: d.note,
      questions: d.questions,
      devotional: d.devotional,
      prayer: d.prayer,
      readings: d.readings.map((r) => {
        const p = parseRefDetailed(r);
        if (!p.ok) throw new Error(r);
        return p.range;
      }),
    })),
  };
}

/** Validates an imported plan file, with readable errors. */
export function parsePlanFile(data: unknown, source: Plan['source'] = 'imported'): PlanParseResult {
  const r = PlanFileSchema.safeParse(data);
  if (!r.success) {
    return {
      ok: false,
      errors: r.error.issues.slice(0, 8).map((i) => {
        const where = i.path.length ? `${i.path.join(' › ')}: ` : '';
        return `${where}${i.message}`;
      }),
    };
  }
  return { ok: true, plan: planFromFile(r.data, source) };
}
