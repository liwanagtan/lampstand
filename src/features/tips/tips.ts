// Feature tips (docs/PRD-ADDENDUM-GROW.md, Me): now and then, at a natural moment, Lampstand
// suggests something it can do. At most one a week, never on the first day, never while
// presenting; "Not now" waits three weeks, "Don't show this again" is forever.
import type { Features } from '@/app/features';
import type { TipsState } from '@/db/types';

export type TipEvent = 'chapter-read' | 'note-saved' | 'highlighted';

export interface TipContext {
  now: number;
  tips: TipsState;
  features: Features;
  presenting: boolean;
  onboardedAt: number | null;
  /** How many times each event happened this session. */
  counts: Partial<Record<TipEvent, number>>;
  parallel: string | null;
  activePlans: number;
}

export type TipAction =
  { kind: 'navigate'; to: string; enable?: keyof Features } | { kind: 'parallel' };

export interface Tip {
  id: string;
  on: TipEvent;
  /** The event must have happened this many times this session. */
  after?: number;
  title: string;
  body: string;
  action: (ctx: TipContext) => { label: string; do: TipAction };
  when: (ctx: TipContext) => boolean;
}

const DAY = 86_400_000;
export const TIP_GAP = 7 * DAY;
export const NOT_NOW_WAIT = 21 * DAY;

const turnOnOrShow = (
  ctx: TipContext,
  feature: keyof Features,
  name: string,
  to: string,
): { label: string; do: TipAction } =>
  ctx.features[feature]
    ? { label: 'Show me', do: { kind: 'navigate', to } }
    : { label: `Turn on ${name}`, do: { kind: 'navigate', to, enable: feature } };

export const TIPS: readonly Tip[] = [
  {
    id: 'plans',
    on: 'chapter-read',
    after: 3,
    title: 'Reading plans can keep you going',
    body: 'A little every day, at your pace — from a month of Psalms to the whole Bible.',
    when: (c) => c.activePlans === 0,
    action: (c) => turnOnOrShow(c, 'plans', 'Plans', '/plans'),
  },
  {
    id: 'journal-notes',
    on: 'note-saved',
    title: 'Your notes collect in Journal',
    body: 'Every note, highlight and reflection, in one place you can search.',
    when: () => true,
    action: (c) => turnOnOrShow(c, 'journal', 'Journal', '/journal'),
  },
  {
    id: 'screen',
    on: 'highlighted',
    after: 2,
    title: 'You can show a passage on a screen',
    body: 'Teaching a class or a small group? Put Scripture on a TV or projector.',
    when: () => true,
    action: (c) => turnOnOrShow(c, 'screen', 'Screen', '/screen/bible'),
  },
  {
    id: 'parallel',
    on: 'chapter-read',
    after: 6,
    title: 'Compare two translations',
    body: 'Read side by side to see a verse in fresh words.',
    when: (c) => c.parallel === null,
    action: () => ({ label: 'Try it', do: { kind: 'parallel' } }),
  },
];

const localDay = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

/** The tip to show for an event right now, or null. */
export function pickTip(event: TipEvent, ctx: TipContext): Tip | null {
  const { tips, now } = ctx;
  if (!tips.enabled || ctx.presenting) return null;
  if (!ctx.onboardedAt || localDay(ctx.onboardedAt) === localDay(now)) return null;
  if (tips.lastShownAt && now - tips.lastShownAt < TIP_GAP) return null;
  for (const tip of TIPS) {
    if (tip.on !== event) continue;
    if ((ctx.counts[event] ?? 0) < (tip.after ?? 1)) continue;
    const seen = tips.seen[tip.id];
    if (seen?.never) continue;
    if (seen && now - seen.at < NOT_NOW_WAIT) continue;
    if (tip.when(ctx)) return tip;
  }
  return null;
}
