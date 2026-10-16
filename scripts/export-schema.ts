// Regenerates skill/lampstand-slides/schema.json and skill/lampstand-plans/schema.json from the Zod schema (PRD §11) so the skill
// and the app never drift. Run: npm run schema
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildJsonSchema, buildPlanJsonSchema } from './jsonSchema';

const out = fileURLToPath(new URL('../skill/lampstand-slides/schema.json', import.meta.url));
writeFileSync(out, JSON.stringify(buildJsonSchema(), null, 2) + '\n');
console.log(`Wrote ${out}`);

const planOut = fileURLToPath(new URL('../skill/lampstand-plans/schema.json', import.meta.url));
writeFileSync(planOut, JSON.stringify(buildPlanJsonSchema(), null, 2) + '\n');
console.log(`Wrote ${planOut}`);
