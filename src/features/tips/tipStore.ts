import { create } from 'zustand';
import { db } from '@/db/db';
import { onboardedAt } from '@/app/onboarding';
import { useControl } from '@/features/present/live/controlStore';
import { useReader } from '@/features/bible-app/readerStore';
import { useSettings } from '@/features/settings/settingsStore';
import { pickTip, type Tip, type TipEvent } from './tips';

interface TipState {
  current: Tip | null;
  counts: Partial<Record<TipEvent, number>>;
  dismiss: (forever: boolean) => void;
}

export const useTips = create<TipState>((set, get) => ({
  current: null,
  counts: {},
  dismiss: (forever) => {
    const tip = get().current;
    set({ current: null });
    if (!tip || !forever) return;
    const tips = useSettings.getState().tips;
    void useSettings.getState().set('tips', {
      ...tips,
      seen: { ...tips.seen, [tip.id]: { at: Date.now(), never: true } },
    });
  },
}));

/** Something happened that a tip might fit. Shows at most one, following the rules. */
export async function noteTipEvent(event: TipEvent): Promise<void> {
  const counts = { ...useTips.getState().counts };
  counts[event] = (counts[event] ?? 0) + 1;
  useTips.setState({ counts });
  if (useTips.getState().current) return;
  const settings = useSettings.getState();
  const tip = pickTip(event, {
    now: Date.now(),
    tips: settings.tips,
    features: settings.features,
    presenting: useControl.getState().presenting,
    onboardedAt: onboardedAt(),
    counts,
    parallel: useReader.getState().parallel,
    activePlans: await db.plans.count(),
  });
  if (!tip) return;
  const now = Date.now();
  useTips.setState({ current: tip });
  await settings.set('tips', {
    ...settings.tips,
    lastShownAt: now,
    seen: { ...settings.tips.seen, [tip.id]: { at: now } },
  });
}
