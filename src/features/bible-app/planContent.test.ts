// @vitest-environment node
import { readFileSync } from 'node:fs';
import release from '../../../docs/content/library-release.json';
import manifest from '../../../public/bibles/index.json';
import type { TranslationFile } from '@/schema/translation';
import { PlanFileSchema, parsePlanFile } from '@/schema/plan';
import { chapterChunks, builtinPlans } from './plans';
import { plansIn, searchPlans } from './discover';

const files = import.meta.glob('./plans/*.lampstand-plan.json', { eager: true, import: 'default' });

it('bundles unique plan ids and keeps the authoring catalog aligned with the app', () => {
  const ids = builtinPlans().map((p) => p.id);
  expect(new Set(ids).size).toBe(ids.length);
  const app = JSON.parse(readFileSync('src/features/bible-app/plans/catalog.json', 'utf8'));
  const authoring = JSON.parse(readFileSync('skill/lampstand-plans/catalog.json', 'utf8'));
  expect(authoring).toEqual(app);
});

it.each(release.plans)('$id is a complete, discoverable guided plan', ({ id }) => {
  const file = files[`./plans/${id}.lampstand-plan.json`];
  const parsed = PlanFileSchema.parse(file);
  expect(parsed.id).toBe(id);
  for (const day of parsed.days) {
    expect(day.title).toBeTruthy();
    expect(day.note).toBeTruthy();
    expect(day.devotional).toBeTruthy();
    expect(day.prayer).toBeTruthy();
    expect(day.questions?.length).toBeGreaterThanOrEqual(2);
  }
  const result = parsePlanFile(file, 'builtin');
  if (!result.ok) throw new Error(result.errors.join('; '));
  expect(searchPlans(builtinPlans(), parsed.name, 'all').map((p) => p.id)).toContain(id);
  for (const category of parsed.categories ?? []) {
    expect(plansIn(builtinPlans(), category).map((p) => p.id)).toContain(id);
  }
});

it.each(manifest.translations)(
  '$code provides the readings for the new library',
  ({ code, file }) => {
    const translation = JSON.parse(
      readFileSync(`public/bibles/${file}`, 'utf8'),
    ) as TranslationFile;
    const books = new Map(translation.books.map((b) => [b.osis, b.chapters]));
    const selected = new Set(release.plans.map((p) => p.id));
    for (const plan of builtinPlans().filter((p) => selected.has(p.id))) {
      for (const day of plan.days) {
        for (const reading of day.readings) {
          const texts: string[] = [];
          for (const chunk of chapterChunks(reading)) {
            const chapter = books.get(chunk.book)?.[chunk.chapter - 1];
            const context = `${code}: ${plan.id}: ${day.title}: ${chunk.book}.${chunk.chapter}`;
            expect(chapter, context).toBeDefined();
            expect(chapter!.length, context).toBeGreaterThanOrEqual(chunk.to);
            texts.push(...chapter!.slice(chunk.from - 1, chunk.to));
          }
          // Modern translations intentionally omit some individual verses. A whole reading
          // must nevertheless resolve within chapter bounds and contain actual Scripture.
          expect(
            texts.some((text) => text.trim().length > 0),
            `${code}: ${plan.id}`,
          ).toBe(true);
        }
      }
    }
  },
);
