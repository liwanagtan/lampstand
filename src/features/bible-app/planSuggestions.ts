import {
  faithJourneys,
  suggestedPlan,
  suggestedPlanIds,
  type FaithJourney,
  type FaithJourneySelection,
} from '@/app/faithJourney';
import type { Plan } from './plans';

const STARTER_REASONS: Record<string, string> = {
  'gospels-40': 'Follow Jesus’ life and teaching through the four Gospels.',
  'psalms-proverbs-30': 'Make space for prayer, praise and everyday wisdom.',
  'life-of-jesus-21-days': 'Explore Jesus’ life in a shorter, guided reading plan.',
};

const REASONS: Record<FaithJourney, string> = {
  exploring: 'An introduction to Jesus and personal faith.',
  new: 'A gentle guide for your first steps in faith.',
  returning: 'A gentle way back into reading God’s Word.',
  growing: 'Small habits for regular reading and prayer.',
  deepening: 'Help understanding Scripture and putting it into practice.',
};

/** A small optional starting point; never recommend a plan the reader has already started. */
export function planSuggestions(
  plans: readonly Plan[],
  started: ReadonlySet<string>,
  journey?: FaithJourneySelection,
) {
  const selections = faithJourneys(journey);
  const primary = suggestedPlanIds(journey);
  const ids = [
    ...new Set([...primary, 'gospels-40', 'psalms-proverbs-30', 'life-of-jesus-21-days']),
  ];
  return ids
    .flatMap((id) => {
      const plan = plans.find((p) => p.id === id);
      if (!plan || started.has(plan.id)) return [];
      return [
        {
          plan,
          reason: (() => {
            const match = selections.find((selection) => suggestedPlan(selection) === id);
            return match
              ? REASONS[match]
              : (STARTER_REASONS[plan.id] ?? 'A guided place to begin your daily reading.');
          })(),
        },
      ];
    })
    .slice(0, 3);
}
