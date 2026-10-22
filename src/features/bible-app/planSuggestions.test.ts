import { builtinPlans } from './plans';
import { planSuggestions } from './planSuggestions';

const plans = builtinPlans();
it('suggests a suitable first plan for each faith journey', () => {
  const expected = {
    exploring: 'life-of-jesus-21-days',
    new: 'first-steps-in-faith',
    returning: 'returning-to-the-word',
    growing: 'rhythms-of-grace',
    deepening: 'reading-with-understanding',
  } as const;
  for (const journey of Object.keys(expected) as (keyof typeof expected)[]) {
    const result = planSuggestions(plans, new Set(), journey);
    expect(result[0]?.plan.id).toBe(expected[journey]);
    expect(result[0]?.reason).toBeTruthy();
    expect(result.length).toBeLessThanOrEqual(3);
  }
});
it('does not suggest started or completed plans again', () => {
  const started = new Set(['life-of-jesus-21-days', 'gospels-40']);
  const result = planSuggestions(plans, started, 'exploring');
  expect(result.every(({ plan }) => !started.has(plan.id))).toBe(true);
});
it('offers optional starting points without a faith journey', () => {
  const result = planSuggestions(plans, new Set());
  expect(result[0]?.plan.id).toBe('gospels-40');
  expect(new Set(result.map(({ plan }) => plan.id)).size).toBe(result.length);
});
it('returns no suggestions when all candidates were started', () => {
  expect(planSuggestions(plans, new Set(plans.map((p) => p.id)), 'new')).toEqual([]);
});

it('uses multiple journey answers before general starting points', () => {
  const result = planSuggestions(plans, new Set(), ['new', 'returning']);
  expect(result.slice(0, 2).map(({ plan }) => plan.id)).toEqual([
    'first-steps-in-faith',
    'returning-to-the-word',
  ]);
});
