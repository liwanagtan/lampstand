import { create } from 'zustand';
import { db } from '@/db/db';
import { onboardedAt } from '@/app/onboarding';
import { useControl } from '@/features/present/live/controlStore';
import { useReader } from '@/features/bible-app/readerStore';
import { useSettings } from '@/features/settings/settingsStore';
import { useTour } from '@/features/tour/tour';
import { isTipsPreview, recordTipEvent, readTipLog } from './tipLog';
import {
  AFTER_MS,
  pickTip,
  type Tip,
  type TipAction,
  type TipContext,
  type TipDetail,
  type TipEvent,
} from './tips';

export type TipGuide = Extract<TipAction, { kind: 'guide' }>;

/** A peek tip moves from the peek, to its card, to Ember guiding toward the real control. */
export type TipStage = 'peek' | 'card' | 'guide';

interface TipState {
  /** The one peek tip on screen. */
  current: Tip | null;
  stage: TipStage;
  /** The one inline tip waiting for its page. */
  inline: Tip | null;
  /** While Ember guides: the control to ring and what to say. */
  guiding: TipGuide | null;
  /** The warm line after a tip, saying where to find the feature next time. */
  after: string | null;
  sayAfter: (line: string) => void;
  open: () => void;
  guide: (tip: Tip, how: TipGuide) => void;
  /** Not now (or an ignored peek): that tip waits three weeks. */
  later: () => void;
  /** Acted on, or Got it: that tip never returns. */
  done: () => void;
  /** No more tips: every tip off; Settings can turn them back on. */
  off: () => void;
}

const markNever = (tip: Tip | null) => {
  if (!tip) return;
  const tips = useSettings.getState().tips;
  void useSettings.getState().set('tips', {
    ...tips,
    seen: { ...tips.seen, [tip.id]: { at: tips.seen[tip.id]?.at ?? Date.now(), never: true } },
  });
};

export const useTips = create<TipState>((set, get) => ({
  current: null,
  stage: 'peek',
  inline: null,
  guiding: null,
  after: null,
  sayAfter: (line) => {
    set({ after: line });
    window.setTimeout(() => {
      if (get().after === line) set({ after: null });
    }, AFTER_MS);
  },
  open: () => set({ stage: 'card' }),
  guide: (tip, how) => set({ current: tip, inline: null, stage: 'guide', guiding: how }),
  later: () => set({ current: null, inline: null, stage: 'peek', guiding: null }),
  done: () => {
    markNever(get().current ?? get().inline);
    set({ current: null, inline: null, stage: 'peek', guiding: null });
  },
  off: () => {
    set({ current: null, inline: null, stage: 'peek', guiding: null });
    const settings = useSettings.getState();
    void settings.set('tips', { ...settings.tips, enabled: false });
  },
}));

/** The context a tip's rules and actions read. */
export async function tipContext(detail: TipDetail = {}): Promise<TipContext> {
  const settings = useSettings.getState();
  const reminders = settings.reminders;
  return {
    now: Date.now(),
    tips: settings.tips,
    features: settings.features,
    presenting: useControl.getState().presenting,
    touring: useTour.getState().step !== null,
    onboardedAt: onboardedAt(),
    log: readTipLog(),
    detail,
    parallel: useReader.getState().parallel,
    activePlans: await db.plans.count(),
    remindersOn: reminders.enabled || Boolean(reminders.reading?.enabled),
    preview: isTipsPreview(),
  };
}

/** Something happened that a tip might build on. Shows at most one, following the rules. */
export async function noteTipEvent(event: TipEvent, detail: TipDetail = {}): Promise<void> {
  recordTipEvent(event);
  const { current, inline } = useTips.getState();
  if (current || inline) return;
  const tip = pickTip(event, await tipContext(detail));
  if (!tip) return;
  const now = Date.now();
  useTips.setState(tip.shape === 'inline' ? { inline: tip } : { current: tip, stage: 'peek' });
  const settings = useSettings.getState();
  await settings.set('tips', {
    ...settings.tips,
    lastShownAt: now,
    seen: { ...settings.tips.seen, [tip.id]: { at: now } },
  });
}
