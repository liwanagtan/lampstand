// Reading plan files (.lampstand-plan.json): daily Bible plans and weekly lesson plans.
// Plans store references only, never scripture text, so they work with any translation.
import { z } from 'zod';
import { parseRefDetailed, type RefRange } from '../features/bible/ref';

export const PLAN_FORMAT = 'lampstand-plan';
export const PLAN_VERSION = 1;

export const PLAN_LIMITS = {
  name: 80,
  description: 300,
  title: 100,
  note: 2000,
  question: 300,
  questions: 8,
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
});

export const PlanFileSchema = z.strictObject({
  format: z.literal(PLAN_FORMAT),
  version: z.literal(PLAN_VERSION),
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
  pace: z
    .enum(['daily', 'weekly'])
    .meta({ description: '"daily": one day at a time. "weekly": a new lesson each Sunday.' }),
  days: z.array(PlanDaySchema).min(1).max(PLAN_LIMITS.days),
});

export type PlanFile = z.infer<typeof PlanFileSchema>;

/** A plan ready to use: references resolved to ranges. */
export interface Plan {
  id: string;
  name: string;
  description: string;
  pace: 'daily' | 'weekly';
  source: 'builtin' | 'imported';
  days: PlanDay[];
}

export interface PlanDay {
  title?: string;
  readings: RefRange[];
  note?: string;
  questions?: string[];
}

export type PlanParseResult = { ok: true; plan: Plan } | { ok: false; errors: string[] };

export function planFromFile(file: PlanFile, source: Plan['source']): Plan {
  return {
    id: file.id,
    name: file.name,
    description: file.description,
    pace: file.pace,
    source,
    days: file.days.map((d) => ({
      title: d.title,
      note: d.note,
      questions: d.questions,
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
