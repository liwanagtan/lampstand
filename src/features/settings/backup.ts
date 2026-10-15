// Settings → Data → Backup (PRD §7.7, §10): everything in one file, and back again.
import { db } from '@/db/db';
import type { AssetRecord, PresentationRecord } from '@/db/types';
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
  const summary: RestoreSummary = { added: 0, updated: 0, skipped: 0, assets: 0 };
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
  await db.transaction('rw', db.presentations, db.assets, async () => {
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
  });
  return summary;
}

export function backupFileName(now = new Date()): string {
  return `lampstand-backup-${now.toISOString().slice(0, 10)}.json`;
}
