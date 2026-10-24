import { z } from 'zod';
import { PresentationSchema, SCHEMA_VERSION } from '../src/schema/presentation';
import { PLAN_VERSION, PlanFileSchema } from '../src/schema/plan';

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
      'A Lampstand sermon presentation (.lampstand.json). Reading slides and attached verses store references only, never scripture text.',
    ...Object.fromEntries(Object.entries(schema).filter(([k]) => k !== '$schema')),
  };
}

export function buildPlanJsonSchema(): Record<string, unknown> {
  const schema = z.toJSONSchema(PlanFileSchema, {
    io: 'input',
    target: 'draft-2020-12',
  }) as Record<string, unknown>;
  return {
    $schema: schema.$schema,
    $id: `https://lampstand.app/schema/plan-v${PLAN_VERSION}.json`,
    title: 'Lampstand reading plan',
    description:
      'A Lampstand reading plan (.lampstand-plan.json): daily Bible readings or weekly lessons. Readings are references only, never scripture text.',
    ...Object.fromEntries(Object.entries(schema).filter(([k]) => k !== '$schema')),
  };
}
