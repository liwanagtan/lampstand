import { z } from 'zod';
import { PresentationSchema, SCHEMA_VERSION } from '../src/schema/presentation';

export function buildJsonSchema(): Record<string, unknown> {
  const schema = z.toJSONSchema(PresentationSchema, {
    io: 'input',
    target: 'draft-2020-12',
  }) as Record<string, unknown>;
  return {
    $schema: schema.$schema,
    $id: `https://lampstand.app/schema/presentation-v${SCHEMA_VERSION}.json`,
    title: 'Lampstand presentation',
    description:
      'A Lampstand sermon presentation (.lampstand.json). Verse slides store references only, never scripture text.',
    ...Object.fromEntries(Object.entries(schema).filter(([k]) => k !== '$schema')),
  };
}
