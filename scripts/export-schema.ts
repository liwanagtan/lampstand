// Regenerates skill/lampstand-slides/schema.json from the Zod schema (PRD §11) so the skill
// and the app never drift. Run: npm run schema
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildJsonSchema } from './jsonSchema';

const out = fileURLToPath(new URL('../skill/lampstand-slides/schema.json', import.meta.url));
writeFileSync(out, JSON.stringify(buildJsonSchema(), null, 2) + '\n');
console.log(`Wrote ${out}`);
