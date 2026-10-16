import { readFileSync } from 'node:fs';
import { buildJsonSchema, buildPlanJsonSchema } from './jsonSchema';

it('skill/lampstand-slides/schema.json is up to date (run npm run schema)', () => {
  const onDisk = JSON.parse(readFileSync('skill/lampstand-slides/schema.json', 'utf8'));
  expect(onDisk).toEqual(JSON.parse(JSON.stringify(buildJsonSchema())));
});

it('documents limits in the JSON Schema', () => {
  const text = JSON.stringify(buildJsonSchema());
  expect(text).toContain('"maxLength":220');
  expect(text).toContain('"additionalProperties":false');
});

it('skill/lampstand-plans/schema.json is up to date (run npm run schema)', () => {
  const onDisk = JSON.parse(readFileSync('skill/lampstand-plans/schema.json', 'utf8'));
  expect(onDisk).toEqual(JSON.parse(JSON.stringify(buildPlanJsonSchema())));
});
