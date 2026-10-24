import { SCHEMA_VERSION } from './presentation';

/**
 * Migrations from version n to n + 1, keyed by n. Every schema change bumps SCHEMA_VERSION
 * and adds an entry here (PRD §5, §14).
 */
export const MIGRATIONS: Record<
  number,
  (data: Record<string, unknown>) => Record<string, unknown>
> = {};

export type MigrationResult =
  | { ok: true; data: Record<string, unknown>; migratedFrom?: number }
  | { ok: false; message: string };

export function migrate(data: Record<string, unknown>): MigrationResult {
  const v = data.schemaVersion;
  if (v === undefined) {
    return {
      ok: false,
      message: 'schemaVersion is missing. Lampstand files start with "schemaVersion": 2.',
    };
  }
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 1) {
    return {
      ok: false,
      message: `schemaVersion must be a whole number like 1, not ${JSON.stringify(v)}.`,
    };
  }
  if (v > SCHEMA_VERSION) {
    return {
      ok: false,
      message: `This file was made for a newer version of Lampstand (schema ${v}). Update Lampstand to open it.`,
    };
  }
  if (v < SCHEMA_VERSION) {
    return {
      ok: false,
      message:
        'This file uses the old Lampstand slide format (schema 1). Regenerate it with the current Lampstand slides skill (schema 2).',
    };
  }
  let current = data;
  for (let n = v; n < SCHEMA_VERSION; n++) {
    const step = MIGRATIONS[n];
    if (!step) return { ok: false, message: `No migration from schema version ${n}.` };
    current = { ...step(current), schemaVersion: n + 1 };
  }
  return { ok: true, data: current, migratedFrom: v === SCHEMA_VERSION ? undefined : v };
}
