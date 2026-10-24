import { useNavigate } from 'react-router-dom';
import { ALL_FEATURES } from '@/app/features';
import { useBible } from '@/features/bible/bibleStore';
import { useReader } from '@/features/bible-app/readerStore';
import { useSettings } from '@/features/settings/settingsStore';
import { tipContext, useTips } from './tipStore';
import type { Tip, TipAction, TipContext } from './tips';

/** A tip's button text, from what is true right now (Turn on … when a feature is off). */
export function tipLabel(tip: Tip): string {
  const action = previewAction(tip);
  return action.kind === 'got' ? 'Got it' : action.label;
}

/** What a tip's button would do, read synchronously for drawing it. */
export function previewAction(tip: Tip): TipAction {
  const settings = useSettings.getState();
  const ctx: TipContext = {
    now: Date.now(),
    tips: settings.tips,
    features: settings.features ?? ALL_FEATURES,
    presenting: false,
    touring: false,
    onboardedAt: null,
    log: {},
    detail: {},
    parallel: null,
    activePlans: 0,
    remindersOn: false,
  };
  return tip.action(ctx);
}

/** Press a tip's button: guide toward the real control, do the thing, or just Got it. */
export function useRunTip(): (tip: Tip) => Promise<void> {
  const navigate = useNavigate();
  return async (tip) => {
    const action = tip.action(await tipContext());
    const tips = useTips.getState();
    if (action.kind === 'got') return tips.done();
    if (action.kind === 'guide') return tips.guide(tip, action);
    tips.done();
    const run = action.run;
    if (run.type === 'parallel') {
      const reader = useReader.getState();
      const other = useBible.getState().translations.find((t) => t.code !== reader.translation);
      if (!other) return;
      reader.setLayout('study');
      reader.setParallel(other.code);
    } else {
      if (run.enable) {
        const settings = useSettings.getState();
        await settings.set('features', { ...settings.features, [run.enable]: true });
      }
      navigate(run.to);
    }
    if (action.after) useTips.getState().sayAfter(action.after);
  };
}
