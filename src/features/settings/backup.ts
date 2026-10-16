// Settings → Data → Backup (PRD §7.7, §10): everything in one file, and back again.
import { db } from '@/db/db';
import type {
  AssetRecord,
  JournalRecord,
  MarkRecord,
  PlanProgressRecord,
  PresentationRecord,
} from '@/db/types';
import { validatePresentation } from '@/schema/validate';
import type { StoredPresentation } from '@/schema/presentation';

export const BACKUP_FORMAT = 'lampstand-backup';

interface BackupAsset extends Omit<AssetRecord, 'blob'> {
  data: string; // base64
}

interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: 1;
  exportedAt: string;
  presentations: PresentationRecord<StoredPresentation>[];
  assets: BackupAsset[];
  settings: { key: string; value: unknown }[];
  /** Bible app data (added later; absent in older backups). */
  marks?: MarkRecord[];
  plans?: PlanProgressRecord[];
  journal?: JournalRecord[];
}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK)
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  return btoa(binary);
}

function base64ToBlob(data: string, type: string): Blob {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}

/** Builds the backup as a Blob, streaming assets so large files never become one giant string. */
export async function createBackup(): Promise<Blob> {
  const presentations = await db.presentations.toArray();
  const settings = await db.settings.toArray();
  const assets = await db.assets.toArray();
  const head = JSON.stringify({
    format: BACKUP_FORMAT,
    version: 1,
    exportedAt: new Date().toISOString(),
    presentations,
    settings,
    marks: await db.marks.toArray(),
    plans: await db.plans.toArray(),
    journal: await db.journal.toArray(),
  }).slice(0, -1);
  const parts: BlobPart[] = [head, ',"assets":['];
  for (const [i, a] of assets.entries()) {
    const { blob, ...meta } = a;
    if (i > 0) parts.push(',');
    parts.push(JSON.stringify({ ...meta, data: await blobToBase64(blob) }));
  }
  parts.push(']}');
  return new Blob(parts, { type: 'application/json' });
}

export interface RestoreSummary {
  added: number;
  updated: number;
  skipped: number;
  assets: number;
  /** Bible marks, plan progress and journal entries added or updated. */
  study: number;
}

/** Restores a backup. Presentations merge by id, keeping whichever copy was edited last. */
export async function restoreBackup(file: File): Promise<RestoreSummary> {
  let data: BackupFile;
  try {
    data = JSON.parse(await file.text()) as BackupFile;
  } catch {
    throw new Error("This isn't a valid backup file.");
  }
  if (data?.format !== BACKUP_FORMAT || data.version !== 1) {
    throw new Error('This file is not a Lampstand backup.');
  }
  const summary: RestoreSummary = { added: 0, updated: 0, skipped: 0, assets: 0, study: 0 };
  const records: PresentationRecord<StoredPresentation>[] = [];
  for (const r of data.presentations ?? []) {
    const check = validatePresentation(r.data);
    if (!check.ok || typeof r.id !== 'string') {
      summary.skipped++;
      continue;
    }
    records.push({ ...r, data: check.presentation });
  }
  const assets: AssetRecord[] = (data.assets ?? []).map(({ data: b64, ...meta }) => ({
    ...meta,
    blob: base64ToBlob(b64, meta.mime),
  }));
  const marks = (Array.isArray(data.marks) ? data.marks : []).filter(
    (m) =>
      typeof m?.id === 'string' && typeof m.ref === 'string' && typeof m.updatedAt === 'number',
  );
  const plans = (Array.isArray(data.plans) ? data.plans : []).filter(
    (p) =>
      typeof p?.planId === 'string' && Array.isArray(p.done) && typeof p.updatedAt === 'number',
  );
  const journal = (Array.isArray(data.journal) ? data.journal : []).filter(
    (j) =>
      typeof j?.date === 'string' &&
      typeof j.answers === 'object' &&
      typeof j.updatedAt === 'number',
  );
  await db.transaction(
    'rw',
    [db.presentations, db.assets, db.marks, db.plans, db.journal],
    async () => {
      // Study data merges by key, keeping whichever copy changed last.
      for (const m of marks) {
        const cur = await db.marks.get(m.id);
        if (!cur || m.updatedAt > cur.updatedAt) {
          await db.marks.put(m);
          summary.study++;
        }
      }
      for (const p of plans) {
        const cur = await db.plans.get(p.planId);
        if (!cur || p.updatedAt > cur.updatedAt) {
          await db.plans.put(p);
          summary.study++;
        }
      }
      for (const j of journal) {
        const cur = await db.journal.get(j.date);
        if (!cur || j.updatedAt > cur.updatedAt) {
          await db.journal.put(j);
          summary.study++;
        }
      }
      for (const r of records) {
        const existing = await db.presentations.get(r.id);
        if (!existing) {
          await db.presentations.add(r);
          summary.added++;
        } else if (r.updatedAt > existing.updatedAt) {
          await db.presentations.put(r);
          summary.updated++;
        } else {
          summary.skipped++;
        }
      }
      for (const a of assets) {
        if (!(await db.assets.get(a.id))) {
          await db.assets.put(a);
          summary.assets++;
        }
      }
    },
  );
  return summary;
}

export function backupFileName(now = new Date()): string {
  return `lampstand-backup-${now.toISOString().slice(0, 10)}.json`;
}
