// The plan catalog (docs/PRD-ADDENDUM-GROW.md, M17): groups › categories › subcategories, as
// data. Plans name the categories they belong to; empty categories stay hidden in the app.
import { z } from 'zod';
import catalogJson from '../features/bible-app/plans/catalog.json';

const id = z.string().regex(/^[a-z0-9][a-z0-9-]{1,40}$/, {
  error: 'Category ids are lowercase letters, numbers and dashes.',
});

const Sub = z.strictObject({
  id,
  name: z.string().min(1).max(40),
  description: z.string().max(200).optional(),
});
const Category = z.strictObject({
  id,
  name: z.string().min(1).max(40),
  description: z.string().max(200).optional(),
  children: z.array(Sub).optional(),
});
const Group = z.strictObject({
  id,
  name: z.string().min(1).max(40),
  description: z.string().max(200),
  categories: z.array(Category).min(1),
});

export const CatalogSchema = z
  .strictObject({ version: z.literal(1), groups: z.array(Group).min(1) })
  .superRefine((c, ctx) => {
    const seen = new Set<string>();
    const check = (v: string) => {
      if (seen.has(v)) ctx.addIssue({ code: 'custom', message: `Duplicate category id “${v}”.` });
      seen.add(v);
    };
    for (const g of c.groups) {
      check(g.id);
      for (const cat of g.categories) {
        check(cat.id);
        for (const s of cat.children ?? []) check(s.id);
      }
    }
  });

export type Catalog = z.infer<typeof CatalogSchema>;

export interface CatalogNode {
  id: string;
  name: string;
  description?: string;
  depth: 0 | 1 | 2;
  /** Group, category, subcategory ids from the top down to this node. */
  path: string[];
  children: CatalogNode[];
}

export const catalog: Catalog = CatalogSchema.parse(catalogJson);

function toNodes(): CatalogNode[] {
  return catalog.groups.map((g) => ({
    id: g.id,
    name: g.name,
    description: g.description,
    depth: 0,
    path: [g.id],
    children: g.categories.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      depth: 1,
      path: [g.id, c.id],
      children: (c.children ?? []).map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        depth: 2,
        path: [g.id, c.id, s.id],
        children: [],
      })),
    })),
  }));
}

export const CATALOG_TREE: readonly CatalogNode[] = toNodes();

const index = new Map<string, CatalogNode>();
const walk = (n: CatalogNode) => {
  index.set(n.id, n);
  n.children.forEach(walk);
};
CATALOG_TREE.forEach(walk);

export const categoryById = (catId: string) => index.get(catId);

/** Every id a plan may name (categories and subcategories, not the top-level groups). */
export const PLAN_CATEGORY_IDS: readonly string[] = [...index.values()]
  .filter((n) => n.depth > 0)
  .map((n) => n.id);

/** The node and everything under it. */
export function descendantIds(catId: string): Set<string> {
  const out = new Set<string>();
  const add = (n: CatalogNode) => {
    out.add(n.id);
    n.children.forEach(add);
  };
  const node = index.get(catId);
  if (node) add(node);
  return out;
}
