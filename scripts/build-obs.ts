// Open Bible Stories as two built-in plans (docs/DECISIONS.md 2026-10-19).
// Source: unfoldingWord en_obs v9 (stories) and en_obs-tq v10 (questions), CC BY-SA 4.0, cached in
// scripts/.cache/obs and scripts/.cache/obs-tq. Run: npx tsx scripts/build-obs.ts
//
// Changes we make (the licence asks us to say so): the 50 stories are arranged as reading plans,
// one story a day (or a week); the pictures are left out; each day reads the first passage the
// story comes from (at most two chapters) and lists all its sources; up to five of unfoldingWord's
// comprehension questions are kept per story. The story text itself is unchanged. As a changed
// work, it does not carry the unfoldingWord® trademark, and it stays under CC BY-SA 4.0.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BOOK_BY_CODE } from '../src/features/bible/books';
import { parseRef } from '../src/features/bible/ref';
import { parsePlanFile } from '../src/schema/plan';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const STORIES = join(ROOT, 'scripts/.cache/obs/x/en_obs/content');
const QUESTIONS = join(ROOT, 'scripts/.cache/obs-tq/x/en_obs-tq/tq_OBS.tsv');
const PLANS = join(ROOT, 'src/features/bible-app/plans');

const CREDITS =
  'Open Bible Stories. The original work by unfoldingWord is available from https://openbiblestories.org. Arranged as a reading plan; pictures left out.';
const LICENSE = 'CC BY-SA 4.0';

/** Questions by story number, in frame order. */
const questions = new Map<number, string[]>();
for (const line of readFileSync(QUESTIONS, 'utf8').split(/\r?\n/).slice(1)) {
  const [ref, , , , , question] = line.split('\t');
  const story = Number(ref?.split(':')[0]);
  if (!story || !question?.trim()) continue;
  const list = questions.get(story) ?? [];
  list.push(question.trim());
  questions.set(story, list);
}
/** Up to five, spread across the story. */
const pick = (list: string[]) =>
  list.length <= 5 ? list : [0, 1, 2, 3, 4].map((i) => list[Math.round((i * (list.length - 1)) / 4)]!);

/** The first passage a story comes from, at most two chapters, as a reading. */
function firstReading(source: string): string {
  const first = source.split(';')[0]!.split(',')[0]!.trim();
  const r = parseRef(first);
  if (!r) throw new Error(`unreadable source "${first}"`);
  const name = BOOK_BY_CODE.get(r.start.book)!.refName;
  const sameBook = r.start.book === r.end.book;
  if (sameBook && r.end.chapter - r.start.chapter > 1) {
    return `${name} ${r.start.chapter}-${r.start.chapter + 1}`;
  }
  return first;
}

interface Story {
  n: number;
  title: string;
  text: string;
  source: string;
}

const stories: Story[] = readdirSync(STORIES)
  .filter((f) => /^\d\d\.md$/.test(f))
  .sort()
  .map((f) => {
    const md = readFileSync(join(STORIES, f), 'utf8');
    const title = /^#\s*\d+\.\s*(.+)$/m.exec(md)![1]!.trim();
    const source = /_A Bible story from:\s*([^_]+)_/.exec(md)![1]!.trim();
    const text = md
      .split('\n')
      .filter((l) => !/^#|^!\[|^_A Bible story from/.test(l.trim()))
      .join('\n')
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean)
      .join('\n\n');
    return { n: Number(f.slice(0, 2)), title, text, source };
  });
if (stories.length !== 50) throw new Error(`expected 50 stories, found ${stories.length}`);

const days = stories.map((s) => ({
  title: s.title,
  readings: [firstReading(s.source)],
  note: `Story ${s.n} of 50. The story is told from ${s.source.replace(/-/g, '–')}.`,
  devotional: s.text,
  questions: pick(questions.get(s.n) ?? []),
}));

function write(file: string, plan: Record<string, unknown>) {
  const check = parsePlanFile(plan, 'builtin');
  if (!check.ok) throw new Error(`${file}: ${check.errors.join('\n')}`);
  writeFileSync(join(PLANS, file), `${JSON.stringify(plan, null, 2)}\n`);
  console.log(`Wrote ${file}`);
}

write('bible-in-50-stories.lampstand-plan.json', {
  format: 'lampstand-plan',
  version: 2,
  id: 'bible-in-50-stories',
  name: 'The Bible in 50 stories',
  description:
    'The whole story of the Bible, from Creation to the new heaven and earth, in 50 short retellings: one a day, each with the passage it comes from and a few questions.',
  pace: 'daily',
  categories: ['through-the-bible', 'first-steps', 'children'],
  audience: 'personal',
  level: 'Families and new readers',
  cover: 'sunrise-clouds',
  credits: CREDITS,
  license: LICENSE,
  days,
});

write('gods-big-story-50-weeks.lampstand-plan.json', {
  format: 'lampstand-plan',
  version: 2,
  id: 'gods-big-story-50-weeks',
  name: 'God’s big story: a year of Sunday lessons',
  description:
    'Fifty weekly lessons for children’s groups: tell the story, read the passage together, and talk it through with the questions.',
  pace: 'weekly',
  categories: ['children', 'sunday-school'],
  audience: 'group',
  level: 'Children',
  cover: 'park-path',
  credits: CREDITS,
  license: LICENSE,
  days: days.map((d, i) =>
    i === 0
      ? {
          ...d,
          note: `${d.note} Teachers: read the story aloud (or retell it in your own words), read the passage together, then use the questions. The answers are in the story.`,
        }
      : d,
  ),
});
