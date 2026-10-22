// Cross-device sync (docs/ACCOUNT-SYNC-ROLLOUT.md, Phase 4). IndexedDB stays the working copy;
// the server keeps one row per record. Each sync pulls what changed since last time, merges it
// with what changed here (compared with the last agreed version in db.syncBase), then pushes.
// Rules: plan days combine; a writing conflict keeps both versions (a `device:` copy for review);
// an edit beats a deletion; nothing local is removed because a request failed.
import { db } from '@/db/db';
import type {
  JournalEntryRecord,
  MarkRecord,
  PlanProgressRecord,
  SettingKey,
  SettingRecord,
} from '@/db/types';
import { safeBackupSetting } from '@/features/settings/backupSettings';
import { accountStorageKey } from './storage';
import { copyId } from './duplicates';
import { mergeGuestPlan } from './guestImport';

export type Kind = 'profile' | 'preferences' | 'plan' | 'entry' | 'mark' | 'reading';

export interface RemoteRow {
  kind: Kind;
  record_id: string;
  data: unknown;
  deleted: boolean;
  /** Set by the server (supabase/account-sync.sql). */
  updated_at: string;
}
export type RowUpdate = Omit<RemoteRow, 'updated_at'>;

export interface SyncRemote {
  /** Rows changed after `since` (all rows when null), oldest first. */
  pull(since: string | null): Promise<RemoteRow[]>;
  push(rows: RowUpdate[]): Promise<void>;
}

export interface SyncResult {
  pulled: number;
  pushed: number;
  /** Writing kept twice for review. */
  copies: number;
  /** Settings or reading position came from another device. */
  settingsChanged: boolean;
  readingChanged: boolean;
}

/** Choices that belong to the person. Reminders, tips and caches stay with each device. */
export const SYNCED_SETTINGS: readonly SettingKey[] = [
  'features',
  'defaultTranslation',
  'reduceMotion',
  'classicDevotional',
  'studyNotes',
  'insights',
  'defaultTheme',
  'defaultOverlayMode',
];

// Reading position and recent chapters; scroll offsets are device-specific and stay local.
const READING_KEYS = {
  reader: 'lampstand.reader',
  recentPlanDay: 'lampstand.recentPlanDay.v1',
  recentChapters: 'lampstand.recentChapters',
} as const;

const CURSOR = '@cursor';
// Server times come from transaction starts, so a later pull re-reads a little to miss nothing.
const OVERLAP_MS = 10 * 60 * 1000;

interface LocalRecord {
  kind: Kind;
  id: string;
  data: unknown;
}

const keyOf = (kind: Kind, id: string) => `${kind}/${id}`;

/** JSON with sorted keys and no undefined values, so equal records compare equal. */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((v) => stableStringify(v ?? null)).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

/** A short fingerprint (cyrb53) of a record's content. */
export function fingerprint(value: unknown): string {
  const str = stableStringify(value);
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36) + `.${str.length}`;
}

const object = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

/** Rows come from the person's own devices, but still must have the shape the app reads. */
function validRow(kind: Kind, id: string, data: unknown): boolean {
  if (!object(data)) return false;
  switch (kind) {
    case 'plan':
      return (
        data.planId === id &&
        typeof data.startedAt === 'number' &&
        Array.isArray(data.done) &&
        data.done.every((d) => Number.isInteger(d)) &&
        typeof data.updatedAt === 'number'
      );
    case 'entry':
      return (
        data.id === id &&
        typeof data.date === 'string' &&
        (data.kind === 'reflection' || data.kind === 'journal') &&
        typeof data.body === 'string' &&
        typeof data.updatedAt === 'number'
      );
    case 'mark':
      return (
        data.id === id &&
        ['highlight', 'bookmark', 'note'].includes(String(data.kind)) &&
        typeof data.ref === 'string' &&
        typeof data.book === 'string' &&
        Number.isInteger(data.chapter) &&
        typeof data.updatedAt === 'number'
      );
    case 'profile':
    case 'preferences':
      return safeBackupSetting({ key: id, value: data.value }) !== null;
    case 'reading':
      return true;
  }
}

function readReading(): Record<string, unknown> | null {
  const out: Record<string, unknown> = {};
  try {
    for (const [name, key] of Object.entries(READING_KEYS)) {
      const raw = localStorage.getItem(accountStorageKey(key));
      if (raw) out[name] = JSON.parse(raw);
    }
  } catch {
    return null;
  }
  return Object.keys(out).length ? out : null;
}

function writeReading(data: Record<string, unknown>): void {
  try {
    for (const [name, key] of Object.entries(READING_KEYS)) {
      if (data[name] !== undefined)
        localStorage.setItem(accountStorageKey(key), JSON.stringify(data[name]));
    }
  } catch {
    // The position is a convenience; the next sync tries again.
  }
}

/** Everything this device would sync, keyed "kind/id". */
export async function readLocal(): Promise<Map<string, LocalRecord>> {
  const out = new Map<string, LocalRecord>();
  const add = (kind: Kind, id: string, data: unknown) =>
    out.set(keyOf(kind, id), { kind, id, data });
  const [plans, entries, marks, settings] = await Promise.all([
    db.plans.toArray(),
    db.entries.toArray(),
    db.marks.toArray(),
    db.settings.toArray(),
  ]);
  for (const p of plans) add('plan', p.planId, p);
  for (const e of entries) add('entry', e.id, e);
  for (const { chapters: _derived, ...m } of marks) add('mark', m.id, m);
  for (const s of settings) {
    if (s.key === 'profile') add('profile', s.key, { value: s.value });
    else if (SYNCED_SETTINGS.includes(s.key) && safeBackupSetting(s))
      add('preferences', s.key, { value: s.value });
  }
  const reading = readReading();
  if (reading) add('reading', 'position', reading);
  return out;
}

async function writeLocal(kind: Kind, id: string, data: unknown | null): Promise<void> {
  switch (kind) {
    case 'plan':
      if (data) await db.plans.put(data as PlanProgressRecord);
      else await db.plans.delete(id);
      return;
    case 'entry':
      if (data) await db.entries.put(data as JournalEntryRecord);
      else await db.entries.delete(id);
      return;
    case 'mark':
      if (data) await db.marks.put(data as MarkRecord);
      else await db.marks.delete(id);
      return;
    case 'profile':
    case 'preferences': {
      const safe =
        data && safeBackupSetting({ key: id, value: (data as { value: unknown }).value });
      if (safe) await db.settings.put(safe as SettingRecord);
      else if (!data) await db.settings.delete(id as SettingKey);
      return;
    }
    case 'reading':
      if (data) writeReading(data as Record<string, unknown>);
      return;
  }
}

type Resolution = { keep: 'local' } | { keep: 'remote' } | { write: unknown; copy?: LocalRecord };

/** Both sides changed since the last sync (or this is the first sync of a record on both). */
export function resolveConflict(
  kind: Kind,
  local: unknown | undefined,
  remote: RemoteRow,
  firstSync: boolean,
): Resolution {
  // An edit beats a deletion, so nothing written disappears because another device removed it.
  if (local === undefined) return { keep: 'remote' };
  if (remote.deleted) return { keep: 'local' };
  switch (kind) {
    case 'plan': {
      const l = local as PlanProgressRecord;
      const r = remote.data as PlanProgressRecord;
      // A restart replaces the older run; otherwise days read on either device are kept.
      if (l.startedAt !== r.startedAt)
        return l.startedAt > r.startedAt ? { keep: 'local' } : { keep: 'remote' };
      return { write: mergeGuestPlan(r, l) };
    }
    case 'mark': {
      const l = local as MarkRecord;
      const r = remote.data as MarkRecord;
      if (l.kind !== 'note')
        return l.updatedAt > r.updatedAt ? { keep: 'local' } : { keep: 'remote' };
      return {
        write: r,
        copy: { kind, id: copyId('device', l.id), data: { ...l, id: copyId('device', l.id) } },
      };
    }
    case 'entry': {
      const l = local as JournalEntryRecord;
      return {
        write: remote.data,
        copy: { kind, id: copyId('device', l.id), data: { ...l, id: copyId('device', l.id) } },
      };
    }
    default:
      // Settings and position: an account's existing choices win over a fresh device's defaults;
      // after that, the change made here is the latest one this person made.
      return firstSync ? { keep: 'remote' } : { keep: 'local' };
  }
}

let applying = false;
/** True while sync writes remote changes locally, so those writes do not schedule another sync. */
export const isApplyingRemote = () => applying;

export async function syncOnce(remote: SyncRemote): Promise<SyncResult> {
  const result: SyncResult = {
    pulled: 0,
    pushed: 0,
    copies: 0,
    settingsChanged: false,
    readingChanged: false,
  };
  const baseRows = await db.syncBase.toArray();
  const base = new Map(baseRows.filter((r) => r.key !== CURSOR).map((r) => [r.key, r.hash]));
  const cursor = baseRows.find((r) => r.key === CURSOR)?.at ?? null;
  const since = cursor ? new Date(Date.parse(cursor) - OVERLAP_MS).toISOString() : null;

  const rows = await remote.pull(since);
  result.pulled = rows.length;
  let newest = cursor;
  const local = await readLocal();
  const writes: { kind: Kind; id: string; data: unknown | null }[] = [];
  const baseChanges = new Map<string, string | undefined>();

  for (const row of rows) {
    if (!newest || row.updated_at > newest) newest = row.updated_at;
    if (!row.deleted && !validRow(row.kind, row.record_id, row.data)) continue;
    const key = keyOf(row.kind, row.record_id);
    const known = base.get(key);
    const remoteHash = row.deleted ? undefined : fingerprint(row.data);
    if (remoteHash === known) continue; // Nothing new: this device's own change coming back.
    const l = local.get(key)?.data;
    const localHash = l === undefined ? undefined : fingerprint(l);
    baseChanges.set(key, remoteHash);
    if (localHash === known) {
      writes.push({ kind: row.kind, id: row.record_id, data: row.deleted ? null : row.data });
    } else if (localHash !== remoteHash) {
      const r = resolveConflict(row.kind, l, row, known === undefined);
      if ('keep' in r) {
        if (r.keep === 'remote')
          writes.push({ kind: row.kind, id: row.record_id, data: row.deleted ? null : row.data });
      } else {
        writes.push({ kind: row.kind, id: row.record_id, data: r.write });
        if (r.copy && !local.has(keyOf(r.copy.kind, r.copy.id))) {
          writes.push(r.copy);
          result.copies++;
        }
      }
    }
  }

  applying = true;
  try {
    await db.transaction(
      'rw',
      [db.plans, db.entries, db.marks, db.settings, db.syncBase],
      async () => {
        for (const w of writes) {
          if (w.kind === 'reading') continue;
          await writeLocal(w.kind, w.id, w.data);
          if (w.kind === 'profile' || w.kind === 'preferences') result.settingsChanged = true;
        }
        for (const [key, hash] of baseChanges) {
          if (hash === undefined) await db.syncBase.delete(key);
          else await db.syncBase.put({ key, hash });
        }
        if (newest) await db.syncBase.put({ key: CURSOR, at: newest });
      },
    );
    for (const w of writes.filter((w) => w.kind === 'reading')) {
      await writeLocal(w.kind, w.id, w.data);
      result.readingChanged = true;
    }
  } finally {
    applying = false;
  }
  for (const [key, hash] of baseChanges) {
    if (hash === undefined) base.delete(key);
    else base.set(key, hash);
  }

  // Push everything that differs from the last agreed version, deletions included.
  const now = await readLocal();
  const pushes: RowUpdate[] = [];
  const pushedBase: [string, string | undefined][] = [];
  for (const [key, rec] of now) {
    const hash = fingerprint(rec.data);
    if (base.get(key) === hash) continue;
    pushes.push({ kind: rec.kind, record_id: rec.id, data: rec.data, deleted: false });
    pushedBase.push([key, hash]);
  }
  for (const key of base.keys()) {
    if (now.has(key)) continue;
    const [kind, ...id] = key.split('/');
    pushes.push({ kind: kind as Kind, record_id: id.join('/'), data: {}, deleted: true });
    pushedBase.push([key, undefined]);
  }
  if (pushes.length) {
    await remote.push(pushes);
    await db.transaction('rw', db.syncBase, async () => {
      for (const [key, hash] of pushedBase) {
        if (hash === undefined) await db.syncBase.delete(key);
        else await db.syncBase.put({ key, hash });
      }
    });
  }
  result.pushed = pushes.length;
  return result;
}
