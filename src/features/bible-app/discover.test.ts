import { builtinPlans } from './plans';
import {
  plansIn,
  planMeta,
  searchPlans,
  uncategorised,
  visibleChildren,
  visibleGroups,
} from './discover';
import { categoryById } from '@/schema/planCatalog';

const plans = builtinPlans();

describe('discover plans', () => {
  it('finds plans by category, including subcategories', () => {
    expect(plansIn(plans, 'anxiety').map((p) => p.id)).toContain('when-anxiety-rises');
    // New to faith has no plans of its own, but its subcategory First steps does.
    expect(plansIn(plans, 'new-to-faith').map((p) => p.id)).toContain('first-steps-in-faith');
    expect(plansIn(plans, 'grow').length).toBeGreaterThan(0);
  });

  it('hides empty categories', () => {
    const feel = categoryById('feel')!;
    const shown = visibleChildren(feel, plans).map((c) => c.id);
    expect(shown).toContain('anxiety');
    expect(shown).toContain('pride');
    // Ministry has plans for serving, none yet for worship: worship stays hidden.
    const ministry = categoryById('ministry')!;
    const ministryShown = visibleChildren(ministry, plans).map((c) => c.id);
    expect(ministryShown).toContain('serving');
    expect(ministryShown).not.toContain('worship');
    expect(visibleGroups(plans).map((g) => g.id)).toEqual(['feel', 'guided', 'grow', 'lessons']);
    expect(uncategorised(plans)).toEqual([]);
  });

  it('searches words across names and categories, with a pace filter', () => {
    expect(searchPlans(plans, 'worry', 'all').map((p) => p.id)).toContain('when-anxiety-rises');
    expect(searchPlans(plans, 'jesus life', 'all').map((p) => p.id)).toContain(
      'life-of-jesus-21-days',
    );
    expect(searchPlans(plans, '', 'weekly').every((p) => p.pace === 'weekly')).toBe(true);
    expect(planMeta(plans.find((p) => p.id === 'parables-8-weeks')!)).toBe('8 lessons · Weekly');
  });
});
