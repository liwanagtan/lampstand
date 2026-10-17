import backgrounds from '../../public/backgrounds/index.json';
import { builtinPlans } from '@/features/bible-app/plans';
import { CATALOG_TREE, PLAN_CATEGORY_IDS, categoryById, descendantIds } from './planCatalog';
import { parsePlanFile } from './plan';

const base = {
  format: 'lampstand-plan',
  id: 'test-plan',
  name: 'Test',
  description: 'A test plan.',
  pace: 'daily',
  days: [{ readings: ['John 1:1-18'] }],
};

describe('plan catalog', () => {
  it('has four groups, at most three levels, and unique ids', () => {
    expect(CATALOG_TREE.map((g) => g.id)).toEqual(['feel', 'guided', 'grow', 'lessons']);
    const all = new Set<string>();
    const walk = (n: (typeof CATALOG_TREE)[number], depth: number) => {
      expect(depth).toBeLessThanOrEqual(2);
      expect(all.has(n.id)).toBe(false);
      all.add(n.id);
      n.children.forEach((c) => walk(c, depth + 1));
    };
    CATALOG_TREE.forEach((g) => walk(g, 0));
    expect(categoryById('first-steps')?.path).toEqual(['grow', 'new-to-faith', 'first-steps']);
    expect(descendantIds('new-to-faith').has('learning-to-pray')).toBe(true);
    // Plans name categories, never a whole group.
    expect(PLAN_CATEGORY_IDS).not.toContain('feel');
  });

  it('every bundled plan uses real categories and covers', () => {
    const covers = new Set(backgrounds.map((b) => b.id));
    for (const p of builtinPlans()) {
      expect(p.categories.length, p.id).toBeGreaterThan(0);
      for (const c of p.categories) expect(PLAN_CATEGORY_IDS, `${p.id}: ${c}`).toContain(c);
      if (p.cover) expect(covers.has(p.cover), `${p.id}: ${p.cover}`).toBe(true);
    }
  });
});

describe('plan files v1 and v2', () => {
  it('still loads version 1 files', () => {
    const r = parsePlanFile({ ...base, version: 1 });
    expect(r.ok && r.plan.categories).toEqual([]);
    expect(r.ok && r.plan.audience).toBe('personal');
  });

  it('loads version 2 with categories, audience, cover, monthly pace, devotional and prayer', () => {
    const r = parsePlanFile({
      ...base,
      version: 2,
      pace: 'monthly',
      categories: ['anxiety', 'peace'],
      audience: 'group',
      level: 'New to faith',
      cover: 'misty-lake',
      days: [{ readings: ['Psalm 23'], devotional: 'Rest.', prayer: 'Lord, lead me.' }],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.plan).toMatchObject({ pace: 'monthly', categories: ['anxiety', 'peace'] });
      expect(r.plan.days[0]).toMatchObject({ devotional: 'Rest.', prayer: 'Lord, lead me.' });
    }
  });

  it('refuses unknown categories with a readable message', () => {
    const r = parsePlanFile({ ...base, version: 2, categories: ['sadness'] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toMatch(/categories › 0: Unknown category “sadness”/);
  });
});
