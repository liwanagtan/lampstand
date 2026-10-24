// Ember's tips (design canvas "Lampstand Guided Tour": Ember's tips, the tip catalogue and tip
// buttons). A tip comes just after someone does the thing it builds on, never before: at most
// one a week, never on the first day, never during the tour or while presenting, and never for a
// feature already used. "Not now" waits three weeks; a tip acted on or understood never returns.
import type { Features } from '@/app/features';
import type { TipsState } from '@/db/types';
import { countOf, type TipLog } from './tipLog';

export type TipEvent =
  | 'chapter-read'
  | 'verse-selected'
  | 'highlighted'
  | 'note-saved'
  | 'words-opened'
  | 'study-opened'
  | 'parallel-on'
  | 'translation-changed'
  | 'plan-started'
  | 'plan-day-done'
  | 'pace-changed'
  | 'reminder-set';

/** What the moment offers, from where the event happened. */
export interface TipDetail {
  /** The selection bar shows Words. */
  words?: boolean;
  /** The selection bar shows Study. */
  study?: boolean;
}

export interface TipContext {
  now: number;
  tips: TipsState;
  features: Features;
  presenting: boolean;
  touring: boolean;
  onboardedAt: number | null;
  log: TipLog;
  detail: TipDetail;
  parallel: string | null;
  activePlans: number;
  remindersOn: boolean;
  /** Reviewing the tips (staging and local only): every moment gets its tip, rules aside. */
  preview?: boolean;
}

export type DoAction =
  { type: 'navigate'; to: string; enable?: keyof Features } | { type: 'parallel' };

/**
 * What the button does (Tip buttons): Guide me when it takes more than one tap (Ember rings the
 * real control; nothing is tapped for you), Do it for me when one tap opens or does it, Got it
 * when it is only good to know.
 */
export type TipAction =
  | { kind: 'guide'; label: string; target: string; hint: string; after: string }
  | { kind: 'do'; label: string; run: DoAction; after?: string }
  | { kind: 'got' };

export interface Tip {
  id: string;
  on: TipEvent;
  title: string;
  body: string;
  /** Peek: Ember slides in with one line over the page. Inline: a card in a page's flow. */
  shape: 'peek' | 'inline';
  /** The peek's one line. */
  peek?: string;
  /** Where an inline tip sits. */
  place?: 'plan';
  /** Once this has happened, the feature is known and the tip never shows. */
  used?: TipEvent;
  when: (ctx: TipContext) => boolean;
  action: (ctx: TipContext) => TipAction;
}

const DAY = 86_400_000;
export const TIP_GAP = 7 * DAY;
export const NOT_NOW_WAIT = 21 * DAY;
/** An ignored peek tucks away after this and counts as Not now. */
export const PEEK_MS = 8000;
/** The warm line after a tip, saying where to find the feature next time. */
export const AFTER_MS = 5000;

const always = () => true;
const turnOnOrShow = (
  ctx: TipContext,
  feature: keyof Features,
  name: string,
  to: string,
): TipAction =>
  ctx.features[feature]
    ? { kind: 'do', label: 'Show me', run: { type: 'navigate', to } }
    : { kind: 'do', label: `Turn on ${name}`, run: { type: 'navigate', to, enable: feature } };

export const TIPS: readonly Tip[] = [
  {
    id: 'words',
    on: 'verse-selected',
    shape: 'peek',
    peek: 'You can see the words behind this verse',
    title: 'See the words behind the verse',
    body: 'Tap Words, then an underlined word, for the Hebrew or Greek and every place it is used.',
    used: 'words-opened',
    when: (c) => Boolean(c.detail.words),
    action: () => ({
      kind: 'guide',
      label: 'Show me',
      target: 'words',
      hint: 'Tap Words',
      after: 'That’s word study. Select any verse, then Words, whenever you’re curious.',
    }),
  },
  {
    id: 'study',
    on: 'verse-selected',
    shape: 'peek',
    peek: 'There’s a story behind this verse',
    title: 'The story behind the verse',
    body: 'Study notes from Tyndale explain the history, the words and the people.',
    used: 'study-opened',
    when: (c) => Boolean(c.detail.study),
    action: () => ({
      kind: 'guide',
      label: 'Open Study',
      target: 'study',
      hint: 'Tap Study',
      after: 'Study notes are under Study whenever a verse has them.',
    }),
  },
  {
    id: 'colours',
    on: 'highlighted',
    shape: 'peek',
    peek: 'Your colours can mean something',
    title: 'Give colours a meaning',
    body: 'Five highlight colours: give each one a meaning, like gold for promises and sage for prayers.',
    when: always,
    action: () => ({ kind: 'got' }),
  },
  {
    id: 'note',
    on: 'highlighted',
    shape: 'peek',
    peek: 'You can write beside a verse',
    title: 'Write beside a verse',
    body: 'Add a note to any verse. It collects in Journey and stays on this device.',
    used: 'note-saved',
    when: (c) => countOf(c.log, 'highlighted', c.now) >= 3,
    action: () => ({
      kind: 'guide',
      label: 'Add a note',
      target: 'note',
      hint: 'Tap Add a note',
      after: 'Your notes collect in Journey, on this device.',
    }),
  },
  {
    id: 'screen',
    on: 'highlighted',
    shape: 'peek',
    peek: 'This passage could go on a TV',
    title: 'You can show a passage on a screen',
    body: 'Teaching a class or a small group? Put Scripture on a TV or projector.',
    when: (c) => countOf(c.log, 'highlighted', c.now, 7) >= 2,
    action: (c) => turnOnOrShow(c, 'screen', 'Screen', '/screen/bible'),
  },
  {
    id: 'journal-notes',
    on: 'note-saved',
    shape: 'peek',
    peek: 'Your notes have a home',
    title: 'Your notes collect in Journey',
    body: 'Every note, highlight and reflection, in one place you can search.',
    when: always,
    action: (c) => turnOnOrShow(c, 'journal', 'Journey', '/profile'),
  },
  {
    id: 'plans',
    on: 'chapter-read',
    shape: 'peek',
    peek: 'A plan can keep you going',
    title: 'Reading plans can keep you going',
    body: 'A little every day, at your pace, from a month of Psalms to the whole Bible.',
    when: (c) => c.activePlans === 0 && countOf(c.log, 'chapter-read', c.now) >= 3,
    action: (c) => turnOnOrShow(c, 'plans', 'Plans', '/plans'),
  },
  {
    id: 'compare',
    on: 'chapter-read',
    shape: 'peek',
    peek: 'Try a verse in two voices',
    title: 'Compare two translations',
    body: 'Read side by side, a verse in two translations, in the Study layout.',
    used: 'parallel-on',
    when: (c) => c.parallel === null && countOf(c.log, 'chapter-read', c.now, 7) >= 3,
    action: () => ({
      kind: 'do',
      label: 'Try it',
      run: { type: 'parallel' },
      after: 'Side by side is on. Change it in Aa any time.',
    }),
  },
  {
    id: 'translation',
    on: 'chapter-read',
    shape: 'peek',
    peek: 'There are other translations to read',
    title: 'Read in another translation',
    body: 'Change translation any time from the chip at the top. Your highlights stay put.',
    used: 'translation-changed',
    when: (c) => countOf(c.log, 'chapter-read', c.now) >= 5,
    action: () => ({
      kind: 'guide',
      label: 'Show me',
      target: 'translation',
      hint: 'Tap the translation',
      after: 'Change translation here whenever you like.',
    }),
  },
  {
    id: 'pace',
    on: 'plan-started',
    shape: 'inline',
    place: 'plan',
    title: 'Busy week? Change the pace',
    body: 'Every day, every few days, once a week, or at your own pace. Your plan bends to you.',
    used: 'pace-changed',
    when: always,
    action: () => ({
      kind: 'guide',
      label: 'Set my pace',
      target: 'plan-options',
      hint: 'Tap here, then Adjust pace',
      after: 'Change the pace from the plan’s options any time.',
    }),
  },
  {
    id: 'reminder',
    on: 'plan-day-done',
    shape: 'peek',
    peek: 'I can remind you to read',
    title: 'A gentle reminder',
    body: 'Choose a time and Lampstand will nudge you, morning or evening.',
    used: 'reminder-set',
    when: (c) => !c.remindersOn && countOf(c.log, 'plan-day-done', c.now) >= 3,
    action: () => ({
      kind: 'do',
      label: 'Set a time',
      run: { type: 'navigate', to: '/profile/settings' },
    }),
  },
];

const localDay = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

/** The tip to show for an event right now, or null. */
export function pickTip(event: TipEvent, ctx: TipContext): Tip | null {
  const { tips, now } = ctx;
  if (!tips.enabled || ctx.presenting || ctx.touring) return null;
  if (ctx.preview) return TIPS.find((tip) => tip.on === event && tip.when(ctx)) ?? null;
  if (!ctx.onboardedAt || localDay(ctx.onboardedAt) === localDay(now)) return null;
  if (tips.lastShownAt && now - tips.lastShownAt < TIP_GAP) return null;
  for (const tip of TIPS) {
    if (tip.on !== event) continue;
    const seen = tips.seen[tip.id];
    if (seen?.never) continue;
    if (seen && now - seen.at < NOT_NOW_WAIT) continue;
    if (tip.used && countOf(ctx.log, tip.used, now) > 0) continue;
    if (tip.when(ctx)) return tip;
  }
  return null;
}
