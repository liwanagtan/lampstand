// Discover plans (docs/PRD-ADDENDUM-GROW.md, M18): browse the catalog by what has plans in it.
import { CATALOG_TREE, categoryById, descendantIds, type CatalogNode } from '@/schema/planCatalog';
import type { Plan } from '@/schema/plan';

export type PaceFilter = 'all' | 'daily' | 'weekly' | 'monthly';

/** Plans in a category or any of its subcategories (or a whole group). */
export function plansIn(plans: readonly Plan[], categoryId: string): Plan[] {
  const ids = descendantIds(categoryId);
  return plans.filter((p) => p.categories.some((c) => ids.has(c)));
}

/** A category's children that have at least one plan; empty ones stay hidden. */
export function visibleChildren(node: CatalogNode, plans: readonly Plan[]): CatalogNode[] {
  return node.children.filter((c) => plansIn(plans, c.id).length > 0);
}

/** Groups that have plans, in catalog order. */
export function visibleGroups(plans: readonly Plan[]): CatalogNode[] {
  return CATALOG_TREE.filter((g) => plansIn(plans, g.id).length > 0);
}

/** Plans no catalog category claims (e.g. older imported files). */
export function uncategorised(plans: readonly Plan[]): Plan[] {
  return plans.filter((p) => !p.categories.some((c) => categoryById(c)));
}

/** Search over names, descriptions, levels and category names, with a pace filter. */
export function searchPlans(plans: readonly Plan[], query: string, pace: PaceFilter): Plan[] {
  const q = query.trim().toLowerCase();
  return plans.filter((p) => {
    if (pace !== 'all' && p.pace !== pace) return false;
    if (!q) return true;
    const words = [
      p.name,
      p.description,
      p.level ?? '',
      ...p.categories.map((c) => categoryById(c)?.name ?? ''),
    ]
      .join(' ')
      .toLowerCase();
    return q.split(/\s+/).every((w) => words.includes(w));
  });
}

/** "7 days · Daily", "8 lessons · Weekly". */
export function planMeta(p: Plan): string {
  const n = p.days.length;
  const unit = p.pace === 'daily' ? (n === 1 ? 'day' : 'days') : n === 1 ? 'lesson' : 'lessons';
  const pace = p.pace === 'daily' ? 'Daily' : p.pace === 'weekly' ? 'Weekly' : 'Monthly';
  return `${n} ${unit} · ${pace}`;
}
