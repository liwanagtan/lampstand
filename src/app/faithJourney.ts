export const FAITH_JOURNEYS = [
  {
    value: 'exploring',
    label: 'I’m exploring faith',
    description: 'I want to learn about Jesus and what Christians believe.',
    plan: 'good-news-personal-faith',
  },
  {
    value: 'new',
    label: 'I’m new to following Jesus',
    description: 'I want help taking my first steps in faith.',
    plan: 'first-steps-in-faith',
  },
  {
    value: 'returning',
    label: 'I’m returning to faith',
    description: 'I want to reconnect with God and His Word.',
    plan: 'returning-to-the-word',
  },
  {
    value: 'growing',
    label: 'I’m building a daily rhythm',
    description: 'I want to grow through regular reading and prayer.',
    plan: 'rhythms-of-grace',
  },
  {
    value: 'deepening',
    label: 'I want to go deeper',
    description: 'I want to understand Scripture and live it out more deeply.',
    plan: 'reading-with-understanding',
  },
] as const;

export type FaithJourney = (typeof FAITH_JOURNEYS)[number]['value'];
export function suggestedPlan(journey?: FaithJourney): string | undefined {
  return FAITH_JOURNEYS.find((option) => option.value === journey)?.plan;
}
