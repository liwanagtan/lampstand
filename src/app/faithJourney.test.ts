import { FAITH_JOURNEYS, suggestedPlan, faithJourneys, suggestedPlanIds } from './faithJourney';
import { builtinPlans } from '@/features/bible-app/plans';

it('suggests an existing personal plan for every faith journey', () => {
  const plans = builtinPlans();
  for (const journey of FAITH_JOURNEYS) {
    const plan = plans.find((p) => p.id === suggestedPlan(journey.value));
    expect(plan, `${journey.value}: ${plans.map((p) => p.id).join(',')}`).toBeDefined();
    expect(plan?.audience).toBe('personal');
  }
});
it('does not infer a recommendation when the person declines to answer', () => {
  expect(suggestedPlan()).toBeUndefined();
});

it('accepts older profiles and recommends from all selected journeys', () => {
  expect(faithJourneys('new')).toEqual(['new']);
  expect(faithJourneys(['new', 'returning', 'new'])).toEqual(['new', 'returning']);
  expect(suggestedPlanIds(['new', 'returning'])).toEqual([
    'first-steps-in-faith',
    'returning-to-the-word',
  ]);
  expect(suggestedPlanIds(['returning', 'new'])[0]).toBe('returning-to-the-word');
  expect(suggestedPlanIds([])).toEqual([]);
});
