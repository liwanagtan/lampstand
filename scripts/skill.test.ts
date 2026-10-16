import { readFileSync } from 'node:fs';

it('the skill example and the test fixture are the same sermon', () => {
  const a = readFileSync('skill/lampstand-slides/example.lampstand.json', 'utf8');
  const b = readFileSync('tests/fixtures/sample-sermon.lampstand.json', 'utf8');
  expect(JSON.parse(a)).toEqual(JSON.parse(b));
});

it('SKILL.md states the core rules', () => {
  const md = readFileSync('skill/lampstand-slides/SKILL.md', 'utf8');
  for (const phrase of [
    'Never write scripture text',
    'extraRefs',
    'schemaVersion',
    '15–25 slides',
    'Outline first',
  ]) {
    expect(md).toContain(phrase);
  }
});

it('the plan skill example is the bundled lesson plan and is valid', async () => {
  const a = JSON.parse(readFileSync('skill/lampstand-plans/example.lampstand-plan.json', 'utf8'));
  const b = JSON.parse(
    readFileSync('src/features/bible-app/plans/parables.lampstand-plan.json', 'utf8'),
  );
  expect(a).toEqual(b);
  const { parsePlanFile } = await import('../src/schema/plan');
  expect(parsePlanFile(a).ok).toBe(true);
  const md = readFileSync('skill/lampstand-plans/SKILL.md', 'utf8');
  for (const phrase of ['Never write scripture text', 'Outline first', '"pace": "weekly"'])
    expect(md).toContain(phrase);
});
